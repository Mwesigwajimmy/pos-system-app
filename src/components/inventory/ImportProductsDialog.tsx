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
    Info,
    Fingerprint,
    Landmark
} from 'lucide-react';

import { createClient } from '@/lib/supabase/client';
import { useUserProfile } from '@/hooks/useUserProfile'; // UPGRADE: Required for Multi-Tenant Identity

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

// --- GLOBAL ENTERPRISE SCHEMA ---
const REQUIRED_HEADERS = [
  'sku', 
  'product_name', 
  'variant_name', 
  'price', 
  'cost_price', 
  'stock',
  'tax_category_code', // UPGRADE: Added for Jurisdictional DNA
  'units_per_pack'     // UPGRADE: Added for Fractional Math DNA
];

/**
 * DATA ACCESS LAYER
 * Performs the Final Handshake with the PostgreSQL RPC
 */
async function importProducts(payload: { products: any[], bizId: string, tenantId: string }) {
  const supabase = createClient();
  
  // SANITIZATION: Filter valid SKUs and WELD Identity DNA to every row
  const sanitizedData = payload.products
    .filter(p => p.sku && String(p.sku).trim() !== "")
    .map(p => ({
        ...p,
        business_id: payload.bizId,
        tenant_id: payload.tenantId,
        // Default to STANDARD tax if the manifest field is empty
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
        if (!userProfile?.business_id) throw new Error("Identity Handshake Failed: Business ID not resolved.");
        return importProducts({ 
            products, 
            bizId: userProfile.business_id, 
            tenantId: userProfile.tenant_id || userProfile.business_id 
        });
    },
    onSuccess: (data) => {
      toast.success('Ledger Synchronized', {
        description: `Birthed: ${data.inserted || 0} | Updated: ${data.updated || 0}`,
        icon: <CheckCircle2 className="h-4 w-4 text-green-500" />
      });
      
      queryClient.invalidateQueries({ queryKey: ['inventoryProducts'] });
      setIsOpen(false);
      setFile(null);
    },
    onError: (error: any) => {
      toast.error('Sync Terminated', { 
        description: error.message || "The Sovereign Kernel rejected the data format.",
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
      toast.error("Resource Required", { description: "Attach a valid CSV manifest." });
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
          toast.error("Schema Mismatch", {
            description: `Missing: ${missingHeaders.join(', ')}`,
          });
          return;
        }

        if (!results.data.length) {
            toast.error("Empty Pipeline", { description: "Manifest contains no records." });
            return;
        }
        
        runImport(results.data);
      },
      error: (error) => {
        toast.error('Parser Failure', { description: error.message });
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
        <Button variant="outline" className="h-11 border-slate-200 hover:bg-slate-50 shadow-sm font-bold rounded-xl px-6">
          <Upload className="mr-2 h-4 w-4 text-blue-600" />
          Bulk Import Manifest
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[550px] border-none shadow-2xl rounded-[2.5rem] p-0 overflow-hidden">
        <DialogHeader className="p-8 pb-4 space-y-4">
          <div className="flex items-center gap-3">
             <div className="p-3 bg-blue-50 rounded-2xl shadow-sm border border-blue-100">
                <FileSpreadsheet className="h-6 w-6 text-blue-600" />
             </div>
             <div className="flex flex-col">
                <DialogTitle className="text-2xl font-black tracking-tight uppercase italic">Bulk Data Ingestion</DialogTitle>
                <DialogDescription className="font-medium text-slate-500">
                    Sovereign Inventory Handshake: Sync local manifests to Ledger.
                </DialogDescription>
             </div>
          </div>
        </DialogHeader>

        <div className="px-8 space-y-6">
          <Alert className="bg-slate-900 border-none rounded-2xl text-white shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <Fingerprint className="w-16 h-16 rotate-12" />
            </div>
            <ShieldCheck className="h-5 w-5 text-emerald-400" />
            <AlertTitle className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Forensic Compliance Header Requirements</AlertTitle>
            <AlertDescription className="text-[11px] leading-relaxed font-mono opacity-80">
                {REQUIRED_HEADERS.map(h => (
                    <span key={h} className="inline-block bg-white/10 px-1.5 py-0.5 rounded mr-1.5 mb-1.5">
                        {h}
                    </span>
                ))}
            </AlertDescription>
          </Alert>

          <div className='space-y-2'>
            <Label htmlFor="csv-file" className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Source CSV Manifest</Label>
            <div className="relative group">
                <Input 
                    id="csv-file" 
                    type="file" 
                    accept=".csv, text/csv" 
                    onChange={handleFileChange} 
                    className="h-14 pt-4 pb-2 cursor-pointer bg-slate-50 border-slate-100 rounded-2xl group-hover:border-blue-300 transition-all shadow-inner font-bold"
                />
                <div className="absolute right-4 top-4 pointer-events-none opacity-20 group-hover:opacity-40 transition-opacity">
                    <Upload className="h-6 w-6" />
                </div>
            </div>
          </div>

          <div className="flex items-center gap-2 px-2 pb-2">
             <Landmark className="h-4 w-4 text-slate-300" />
             <a href="/templates/products_template.csv" download className="text-[10px] font-black uppercase tracking-widest text-blue-600 hover:text-blue-700 transition-colors">
                Download Global Template Protocol
             </a>
          </div>
        </div>

        <DialogFooter className="bg-slate-50 p-8 flex gap-3 border-t border-slate-100 mt-4">
          <Button type="button" variant="ghost" onClick={() => setIsOpen(false)} disabled={isLoading} className="font-bold text-slate-400 hover:text-slate-900">
            ABORT
          </Button>
          <Button 
            onClick={handleImport} 
            disabled={!file || isLoading}
            className="flex-1 h-12 bg-slate-900 text-white font-black uppercase tracking-widest rounded-xl shadow-2xl hover:scale-[1.02] active:scale-95 transition-all"
          >
            {isLoading ? (
                <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    {isParsing ? "Analyzing DNA..." : "Authorizing..."}
                </>
            ) : (
                <>
                    <ShieldCheck className="mr-2 h-5 w-5 text-emerald-400" />
                    Execute Interconnect Sync
                </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}