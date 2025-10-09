'use client';
import { useState, useEffect } from 'react';
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Category { id: number; name: string; }

async function fetchCategories(): Promise<Category[]> {
    const supabase = createClient();
    const { data, error } = await supabase.from('categories').select('id, name').order('name');
    if (error) throw new Error("Could not fetch categories.");
    return data || [];
}

async function addProduct(productData: any) {
    const supabase = createClient();
    const { data, error } = await supabase.rpc('create_product_with_variant', productData);
    if (error) throw error;
    return data;
}

export default function AddProductDialog() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const { data: categories, isLoading: isLoadingCategories } = useQuery({ queryKey: ['categories'], queryFn: fetchCategories });

  const mutation = useMutation({
    mutationFn: addProduct,
    onSuccess: () => {
      toast.success("Product created successfully!");
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setOpen(false);
    },
    onError: (error) => toast.error(`Failed to create product: ${error.message}`),
  });

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const data = {
        p_product_name: formData.get('product_name') as string,
        p_category_id: formData.get('category_id') ? Number(formData.get('category_id')) : null,
        p_variant_name: formData.get('variant_name') as string,
        p_price: Number(formData.get('price')),
        p_cost_price: Number(formData.get('cost_price')),
        p_initial_stock: Number(formData.get('initial_stock')),
        p_sku: formData.get('sku') as string,
    };
    mutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button>Add New Product</Button></DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader><DialogTitle>Add New Product</DialogTitle><DialogDescription>Add a new product and its first variant.</DialogDescription></DialogHeader>
        <form onSubmit={handleSubmit} id="add-product-form" className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="product_name" className="text-right">Product Name</Label><Input id="product_name" name="product_name" className="col-span-3" required /></div>
          <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="category_id" className="text-right">Category</Label><Select name="category_id"><SelectTrigger className="col-span-3"><SelectValue placeholder={isLoadingCategories ? "Loading..." : "Select a category"} /></SelectTrigger><SelectContent>{categories?.map(cat => <SelectItem key={cat.id} value={String(cat.id)}>{cat.name}</SelectItem>)}</SelectContent></Select></div>
          <hr/>
          <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="variant_name" className="text-right">Variant Name</Label><Input id="variant_name" name="variant_name" defaultValue="Standard" className="col-span-3" required /></div>
          <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="price" className="text-right">Selling Price</Label><Input id="price" name="price" type="number" step="any" className="col-span-3" required /></div>
          <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="cost_price" className="text-right">Cost Price</Label><Input id="cost_price" name="cost_price" type="number" step="any" className="col-span-3" /></div>
          <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="initial_stock" className="text-right">Initial Stock</Label><Input id="initial_stock" name="initial_stock" type="number" className="col-span-3" required /></div>
          <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="sku" className="text-right">SKU / Barcode</Label><Input id="sku" name="sku" className="col-span-3" /></div>
        </form>
        <DialogFooter><Button type="submit" form="add-product-form" disabled={mutation.isPending}>{mutation.isPending ? "Saving..." : "Save Product"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}