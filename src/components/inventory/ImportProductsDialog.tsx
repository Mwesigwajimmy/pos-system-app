'use client';

import { useState } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import Papa from 'papaparse';
import { Upload, Loader2 } from 'lucide-react';

import { createClient } from '@/lib/supabase/client';

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Define the required headers for the CSV file in a constant for easy maintenance.
const REQUIRED_HEADERS = ['sku', 'product_name', 'variant_name', 'price', 'cost_price', 'stock'];

/**
 * Calls a Supabase RPC to bulk insert or update products.
 * @param productsData - An array of product objects parsed from the CSV.
 * @returns A promise that resolves with the result of the bulk operation.
 */
async function importProducts(productsData: any[]) {
  const supabase = createClient();
  // It's good practice to handle potential null data from the parser.
  const sanitizedData = productsData.filter(p => p.sku);
  const { data, error } = await supabase.rpc('bulk_upsert_products', { products_data: sanitizedData });
  if (error) throw error;
  return data;
}

/**
 * A dialog component that allows users to upload a CSV file to bulk import
 * or update products in the inventory.
 */
export default function ImportProductsDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const queryClient = useQueryClient();

  // Mutation for handling the product import API call.
  const { mutate: runImport, isPending: isImporting } = useMutation({
    mutationFn: importProducts,
    onSuccess: (data) => {
      toast.success('Import complete!', {
        description: `Inserted: ${data.inserted}, Updated: ${data.updated}, Failed: ${data.failed}`,
      });
      queryClient.invalidateQueries({ queryKey: ['inventoryProducts'] });
      // Reset state and close the dialog on success.
      setIsOpen(false);
      setFile(null);
    },
    onError: (error) => {
      toast.error('Import failed', { description: error.message });
    },
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const handleImport = () => {
    if (!file) {
      toast.error("Please select a file to import.");
      return;
    }

    setIsParsing(true);

    // Use PapaParse to process the CSV file in the browser.
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setIsParsing(false);
        const headers = results.meta.fields || [];
        const missingHeaders = REQUIRED_HEADERS.filter(h => !headers.includes(h));

        // More robust validation: check for all required headers.
        if (missingHeaders.length > 0) {
          toast.error("Invalid CSV format.", {
            description: `The following required columns are missing: ${missingHeaders.join(', ')}`,
          });
          return;
        }

        if (!results.data.length) {
            toast.error("The selected CSV file is empty or contains no valid data rows.");
            return;
        }
        
        runImport(results.data);
      },
      error: (error) => {
        toast.error('CSV parsing failed', { description: error.message });
        setIsParsing(false);
      }
    });
  };
  
  // Consolidate the loading state for the button.
  const isLoading = isParsing || isImporting;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="mr-2 h-4 w-4" />
          Import Products
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Bulk Import Products</DialogTitle>
          <DialogDescription>
            Upload a CSV file to add or update multiple products. The file must contain the following columns: <strong>{REQUIRED_HEADERS.join(', ')}</strong>. The 'sku' column is used to match and update existing products.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className='grid w-full max-w-sm items-center gap-1.5'>
            <Label htmlFor="csv-file">CSV File</Label>
            <Input id="csv-file" type="file" accept=".csv, text/csv" onChange={handleFileChange} />
          </div>
          <a href="/templates/products_template.csv" download className="text-sm font-medium text-primary hover:underline">
            Download Template CSV
          </a>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={isLoading}>Cancel</Button>
          <Button onClick={handleImport} disabled={!file || isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isParsing ? "Parsing File..." : isImporting ? "Importing Data..." : "Start Import"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}