'use client';

import React, { useState } from 'react';
import { ColumnDef, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PlusCircle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface DataTableProps<TData, TValue> { 
    columns: ColumnDef<TData, TValue>[]; 
    tenantId: string; // Used as the authoritative Business ID context
}

// Logic Fix: Filter by business_id to ensure all employees see the same registry
async function fetchSuppliers(businessId: string) {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .eq('business_id', businessId) // Alignment with industrial registry logic
        .order('name', { ascending: true });
    
    if (error) throw new Error(error.message);
    return data || [];
}

// Logic Fix: Insert both business_id (for the company) and tenant_id (user reference)
async function createSupplier(input: { 
    name: string, 
    email: string, 
    phone: string, 
    address: string, 
    businessId: string 
}) {
    const supabase = createClient();
    
    // Forensic Handshake: Get current user ID for the tenant_id column
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase.from('suppliers').insert([{
        name: input.name,
        email: input.email,
        phone_number: input.phone,
        address: input.address,
        business_id: input.businessId, // Company ID
        tenant_id: user?.id,           // Forensic User ID
        status: 'active'               // Standardized case
    }]);
    if (error) throw error;
}

export default function SupplierDataTable<TData, TValue>({ columns, tenantId }: DataTableProps<TData, TValue>) {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Data Fetching: Using the businessId context
  const { data, isLoading } = useQuery({ 
      queryKey: ['suppliers_registry', tenantId], 
      queryFn: () => fetchSuppliers(tenantId) 
  });

  // Create Mutation
  const mutation = useMutation({
    mutationFn: createSupplier,
    onSuccess: () => {
        toast.success("Supplier profile authorized and added to registry");
        queryClient.invalidateQueries({ queryKey: ['suppliers_registry', tenantId] });
        // Force refresh raw material registry queries to ensure dropdowns update
        queryClient.invalidateQueries({ queryKey: ['suppliers_raw_registry'] });
        setIsDialogOpen(false);
    },
    onError: (error: any) => toast.error(error.message || "Failed to authorize supplier"),
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const name = formData.get('name') as string;
    if (!name) return toast.error("Supplier Identity is required");

    mutation.mutate({ 
        name: name, 
        email: formData.get('email') as string, 
        phone: formData.get('phone_number') as string, 
        address: formData.get('address') as string,
        businessId: tenantId
    });
  }

  const table = useReactTable({ 
      data: (data as TData[]) ?? [], 
      columns, 
      getCoreRowModel: getCoreRowModel() 
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold tracking-tight">Active Suppliers</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
                <Button className="bg-slate-900 text-white hover:bg-slate-800 rounded-xl px-6 h-11 font-bold shadow-lg transition-all active:scale-95">
                    <PlusCircle className="mr-2 h-4 w-4"/> Add Supplier
                </Button>
            </DialogTrigger>
            <DialogContent className="rounded-3xl border-none shadow-2xl p-0 overflow-hidden max-w-md bg-white">
                <div className="bg-slate-900 p-8 text-white">
                    <DialogTitle className="text-xl font-bold uppercase tracking-tight">Create New Supplier</DialogTitle>
                    <DialogDescription className="text-slate-400 text-xs mt-1 font-medium">Add a new verified vendor to your production procurement list.</DialogDescription>
                </div>
                <form id="supplier-form" onSubmit={handleSubmit} className="p-8 space-y-5">
                    <div className="space-y-2">
                        <Label htmlFor="name" className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Supplier Legal Name *</Label>
                        <Input id="name" name="name" required placeholder="e.g. Acme Chemical Corp" className="h-12 border-slate-100 bg-slate-50/50 rounded-xl font-bold focus:bg-white" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Contact Email</Label>
                            <Input id="email" name="email" type="email" placeholder="contact@vendor.com" className="h-12 border-slate-100 bg-slate-50/50 rounded-xl focus:bg-white" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="phone" className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Phone Number</Label>
                            <Input id="phone" name="phone_number" placeholder="+256..." className="h-12 border-slate-100 bg-slate-50/50 rounded-xl focus:bg-white" />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="address" className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Physical Address</Label>
                        <Input id="address" name="address" placeholder="Plot No, Street, City" className="h-12 border-slate-100 bg-slate-50/50 rounded-xl focus:bg-white" />
                    </div>
                </form>
                <DialogFooter className="p-8 bg-slate-50 border-t flex gap-3">
                    <Button variant="ghost" onClick={() => setIsDialogOpen(false)} className="font-bold text-slate-400 uppercase text-[10px] tracking-widest">Cancel</Button>
                    <Button type="submit" form="supplier-form" disabled={mutation.isPending} className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-12 rounded-xl px-8 shadow-lg shadow-blue-200 uppercase tracking-widest text-[10px] flex-1">
                        {mutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Processing...</> : "Authorize Supplier"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50/50">
              {table.getHeaderGroups().map(hg => (
                  <TableRow key={hg.id} className="h-12 border-none">
                      {hg.headers.map(h => (
                          <TableHead key={h.id} className="text-[10px] font-bold uppercase tracking-widest text-slate-400 px-6">{flexRender(h.column.columnDef.header, h.getContext())}</TableHead>
                      ))}
                  </TableRow>
              ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
                <TableRow><TableCell colSpan={columns.length} className="h-40 text-center"><Loader2 className="animate-spin h-8 w-8 text-blue-600 mx-auto"/></TableCell></TableRow>
            ) : table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map(row => (
                    <TableRow key={row.id} className="h-16 hover:bg-slate-50/30 transition-colors border-b last:border-none">
                        {row.getVisibleCells().map(cell => (
                            <TableCell key={cell.id} className="px-6 font-medium text-slate-700">{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                        ))}
                    </TableRow>
                ))
            ) : (
                <TableRow><TableCell colSpan={columns.length} className="h-32 text-center">
                    <div className="flex flex-col items-center gap-2 text-slate-300">
                        <PlusCircle size={32} strokeWidth={1} />
                        <p className="text-xs font-bold uppercase tracking-widest">No verified suppliers in registry</p>
                    </div>
                </TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}