'use client';

import { useState } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import Papa from 'papaparse';
import { 
    Upload, 
    Loader2, 
    FileSpreadsheet, 
    AlertCircle, 
    CheckCircle2, 
    ShieldCheck,
    Info
} from 'lucide-react';

import { createClient } from '@/lib/supabase/client';

import { Button } from "@/components/ui/button";
import { 
    Dialog, 
    DialogContent, 
    DialogDescription, 
    DialogFooter, 
    DialogHeader, 
    DialogTitle, 
    DialogTrigger 
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Enterprise Standard: Required headers for the global inventory engine
const REQUIRED_HEADERS = ['sku', 'product_name', 'variant_name', 'price', 'cost_price', 'stock'];

/**
 * DATA ACCESS LAYER
 * Corrected to use the exact backend parameter name 'p_products_data'
 */
async function importProducts(productsData: any[]) {
  const supabase = createClient();
  
  // Sanitize: Ensure only rows with a valid SKU are processed to prevent ledger gaps
  const sanitizedData = productsData.filter(p => p.sku && String(p.sku).trim() !== "");

  // CRITICAL FIX: The key below matches the database parameter 'p_products_data'
  const { data, error } = await supabase.rpc('bulk_upsert_products', { 
    p_products_data: sanitizedData 
  });

  if (error) throw error;
  return data;
}

export default function ImportProductsDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const queryClient = useQueryClient();

  const { mutate: runImport, isPending: isImporting } = useMutation({
    mutationFn: importProducts,
    onSuccess: (data) => {
      // Professional Summary Feedback
      toast.success('Inventory Synchronized', {
        description: `Successfully processed: ${data.inserted || 0} inserted, ${data.updated || 0} updated.`,
        icon: <CheckCircle2 className="h-4 w-4 text-green-500" />
      });
      
      queryClient.invalidateQueries({ queryKey: ['inventoryProducts'] });
      setIsOpen(false);
      setFile(null);
    },
    onError: (error: any) => {
      toast.error('Import Failed', { 
        description: error.message || "Database rejected the data format.",
        icon: <AlertCircle className="h-4 w-4 text-destructive" />
      });
    },
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) setFile(selectedFile);
  };

  const handleImport = () => {
    if (!file) {
      toast.error("Resource Required", { description: "Please attach a CSV manifest." });
      return;
    }

    setIsParsing(true);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      // Global standard: Convert numeric strings to actual numbers before sending to PG
      dynamicTyping: true, 
      complete: (results) => {
        setIsParsing(false);
        const headers = results.meta.fields || [];
        const missingHeaders = REQUIRED_HEADERS.filter(h => !headers.includes(h));

        if (missingHeaders.length > 0) {
          toast.error("Schema Mismatch", {
            description: `Required columns missing: ${missingHeaders.join(', ')}`,
          });
          return;
        }

        if (!results.data.length) {
            toast.error("Manifest Empty", { description: "The uploaded file contains no data records." });
            return;
        }
        
        runImport(results.data);
      },
      error: (error) => {
        toast.error('Parser Error', { description: error.message });
        setIsParsing(false);
      }
    });
  };
  
  const isLoading = isParsing || isImporting;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="h-10 border-primary/20 hover:bg-primary/5 shadow-sm">
          <Upload className="mr-2 h-4 w-4 text-primary" />
          Bulk Import manifest
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] border-none shadow-2xl">
        <DialogHeader className="space-y-3">
          <div className="flex items-center gap-2">
             <div className="p-2 bg-primary/10 rounded-lg">
                <FileSpreadsheet className="h-5 w-5 text-primary" />
             </div>
             <DialogTitle className="text-xl font-bold tracking-tight uppercase">Bulk Inventory Import</DialogTitle>
          </div>
          <DialogDescription className="text-sm leading-relaxed">
            Synchronize your local inventory manifest with the Global Ledger. Existing SKUs will be updated with new pricing and stock levels.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Compliance Notice */}
          <Alert className="bg-slate-50 border-slate-200">
            <ShieldCheck className="h-4 w-4 text-blue-600" />
            <AlertTitle className="text-xs font-bold uppercase tracking-wider">GADS Alignment</AlertTitle>
            <AlertDescription className="text-[11px] text-muted-foreground">
                Manifest must include: {REQUIRED_HEADERS.map(h => <code key={h} className="bg-white px-1 mx-0.5 border rounded text-primary">{h}</code>)}
            </AlertDescription>
          </Alert>

          <div className='grid w-full items-center gap-2'>
            <Label htmlFor="csv-file" className="text-xs font-bold uppercase text-slate-500">Source CSV File</Label>
            <div className="relative group">
                <Input 
                    id="csv-file" 
                    type="file" 
                    accept=".csv, text/csv" 
                    onChange={handleFileChange} 
                    className="h-12 pt-3 pb-2 cursor-pointer group-hover:border-primary/50 transition-all shadow-sm"
                />
                <div className="absolute right-3 top-3 pointer-events-none opacity-20">
                    <Upload className="h-5 w-5" />
                </div>
            </div>
          </div>

          <div className="flex items-center gap-4 px-1">
             <a href="/templates/products_template.csv" download className="text-xs font-bold text-primary hover:underline flex items-center gap-1">
                <Info className="h-3.5 w-3.5" />
                Download Official Template
             </a>
          </div>
        </div>

        <DialogFooter className="bg-muted/30 p-6 -mx-6 -mb-6 rounded-b-lg flex gap-3">
          <Button type="button" variant="ghost" onClick={() => setIsOpen(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button 
            onClick={handleImport} 
            disabled={!file || isLoading}
            className="px-8 font-bold shadow-lg"
          >
            {isLoading ? (
                <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isParsing ? "Analyzing Schema..." : "Authorizing Sync..."}
                </>
            ) : (
                <>
                    <ShieldCheck className="mr-2 h-4 w-4" />
                    Start Interconnect Sync
                </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}