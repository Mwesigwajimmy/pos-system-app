'use client';

import { useState } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import Papa from 'papaparse';
import { 
    Upload, 
    Loader2, 
    FileSpreadsheet, 
    AlertCircle, 
    CheckCircle2, 
    Info,
    FileText,
    Download
} from 'lucide-react';

import { createClient } from '@/lib/supabase/client';
import { useUserProfile } from '@/hooks/useUserProfile';

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

// --- Required CSV Headers ---
const REQUIRED_HEADERS = [
  'sku', 
  'product_name', 
  'variant_name', 
  'price', 
  'cost_price', 
  'stock',
  'tax_category_code',
  'units_per_pack'
];

async function importProducts(payload: { products: any[], bizId: string, tenantId: string }) {
  const supabase = createClient();
  
  const sanitizedData = payload.products
    .filter(p => p.sku && String(p.sku).trim() !== "")
    .map(p => ({
        ...p,
        business_id: payload.bizId,
        tenant_id: payload.tenantId,
        tax_category_code: (p.tax_category_code || 'STANDARD').toUpperCase(),
        units_per_pack: Number(p.units_per_pack) || 1
    }));

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
  const { data: userProfile } = useUserProfile();

  const { mutate: runImport, isPending: isImporting } = useMutation({
    mutationFn: (products: any[]) => {
        if (!userProfile?.business_id) throw new Error("User profile not found.");
        return importProducts({ 
            products, 
            bizId: userProfile.business_id, 
            tenantId: userProfile.tenant_id || userProfile.business_id 
        });
    },
    onSuccess: (data) => {
      toast.success(`Import Successful: ${data.inserted || 0} created, ${data.updated || 0} updated`);
      queryClient.invalidateQueries({ queryKey: ['inventoryProducts'] });
      setIsOpen(false);
      setFile(null);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to process the import file.");
    },
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) setFile(selectedFile);
  };

  const handleImport = () => {
    if (!file) {
      toast.error("Please select a CSV file first.");
      return;
    }
    setIsParsing(true);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true, 
      complete: (results) => {
        setIsParsing(false);
        const headers = results.meta.fields || [];
        const missingHeaders = REQUIRED_HEADERS.filter(h => !headers.includes(h));

        if (missingHeaders.length > 0) {
          toast.error(`Missing columns: ${missingHeaders.join(', ')}`);
          return;
        }

        if (!results.data.length) {
            toast.error("The selected file contains no data.");
            return;
        }
        runImport(results.data);
      },
      error: (error) => {
        toast.error(`File Error: ${error.message}`);
        setIsParsing(false);
      }
    });
  };
  
  const isLoading = isParsing || isImporting;

  return (
    <Dialog open={isOpen} onOpenChange={(val) => {
        setIsOpen(val);
        if (!val) setFile(null);
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="h-10 border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 transition-all font-semibold rounded-lg">
          <Upload className="mr-2 h-4 w-4 text-blue-600" />
          Import CSV
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[500px] p-0 border-none rounded-xl shadow-2xl overflow-hidden">
        <DialogHeader className="p-8 bg-white">
          <div className="flex items-center gap-4">
             <div className="p-3 bg-blue-50 rounded-lg">
                <FileSpreadsheet className="h-6 w-6 text-blue-600" />
             </div>
             <div>
                <DialogTitle className="text-xl font-bold text-slate-900">Bulk Product Import</DialogTitle>
                <DialogDescription className="text-sm text-slate-500 mt-1">
                    Upload a CSV file to update or create multiple products at once.
                </DialogDescription>
             </div>
          </div>
        </DialogHeader>

        <div className="px-8 pb-6 space-y-6">
          {/* Instructions Block */}
          <div className="bg-slate-50 border border-slate-200 p-5 rounded-lg space-y-3">
            <div className="flex items-center gap-2 text-slate-700 font-semibold text-xs uppercase tracking-wider">
                <Info size={14} className="text-blue-500" />
                Required CSV Columns
            </div>
            <div className="flex flex-wrap gap-2">
                {REQUIRED_HEADERS.map(h => (
                    <code key={h} className="text-[10px] bg-white border border-slate-200 px-2 py-1 rounded text-slate-600 font-mono">
                        {h}
                    </code>
                ))}
            </div>
          </div>

          <div className='space-y-3'>
            <Label htmlFor="csv-file" className="text-xs font-bold text-slate-700">Select File</Label>
            <div className="relative">
                <Input 
                    id="csv-file" 
                    type="file" 
                    accept=".csv" 
                    onChange={handleFileChange} 
                    className="h-10 border-slate-200 rounded-lg cursor-pointer bg-white file:mr-4 file:py-1 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
            </div>
          </div>

          <div className="flex items-center gap-2">
             <Download className="h-4 w-4 text-slate-400" />
             <a href="/templates/products_template.csv" download className="text-xs font-semibold text-blue-600 hover:underline">
                Download Template CSV
             </a>
          </div>
        </div>

        <DialogFooter className="bg-slate-50 p-6 flex justify-end gap-3 border-t border-slate-200">
          <Button variant="ghost" onClick={() => setIsOpen(false)} disabled={isLoading} className="font-semibold text-slate-500">
            Cancel
          </Button>
          <Button 
            onClick={handleImport} 
            disabled={!file || isLoading}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-10 px-8 rounded-lg shadow-sm"
          >
            {isLoading ? (
                <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isParsing ? "Reading file..." : "Importing..."}
                </>
            ) : (
                <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Start Import
                </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}