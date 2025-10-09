'use client';
import { useState } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import Papa from 'papaparse';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload } from 'lucide-react';

async function importProducts(productsData: any[]) {
    const supabase = createClient();
    const { data, error } = await supabase.rpc('bulk_upsert_products', { products_data: productsData });
    if (error) throw error;
    return data;
}

export default function ImportProductsDialog() {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: importProducts,
    onSuccess: (data) => {
      toast.success(`Import complete! Inserted: ${data.inserted}, Updated: ${data.updated}, Failed: ${data.failed}`);
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setOpen(false);
      setFile(null);
    },
    onError: (error) => toast.error(`Import failed: ${error.message}`),
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setFile(event.target.files[0]);
    }
  };

  const handleImport = () => {
    if (!file) {
      toast.error("Please select a file to import.");
      return;
    }
    setIsParsing(true);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        // Here you can add validation for the parsed data
        // For now, we'll send it directly to the backend function
        mutation.mutate(results.data);
        setIsParsing(false);
      },
      error: (error) => {
        toast.error(`CSV parsing failed: ${error.message}`);
        setIsParsing(false);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
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
            Upload a CSV file to add or update multiple products at once. The file must contain columns: <strong>sku, product_name, variant_name, price, cost_price, stock</strong>.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <Label htmlFor="csv-file">CSV File</Label>
          <Input id="csv-file" type="file" accept=".csv" onChange={handleFileChange} />
          <a href="/templates/products_template.csv" download className="text-sm text-blue-600 hover:underline">
            Download Template CSV
          </a>
        </div>
        <DialogFooter>
          <Button 
            onClick={handleImport} 
            disabled={!file || isParsing || mutation.isPending}
          >
            {isParsing ? "Parsing..." : mutation.isPending ? "Importing..." : "Import Data"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}