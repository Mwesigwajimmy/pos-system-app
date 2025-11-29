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
    tenantId: string; // Needed for RLS insert
}

async function fetchSuppliers(tenantId: string) {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });
    
    if (error) throw new Error(error.message);
    return data || [];
}

async function createSupplier(input: { name: string, email: string, phone: string, address: string, tenantId: string }) {
    const supabase = createClient();
    const { error } = await supabase.from('suppliers').insert([{
        name: input.name,
        email: input.email,
        phone_number: input.phone,
        address: input.address,
        tenant_id: input.tenantId,
        status: 'ACTIVE'
    }]);
    if (error) throw error;
}

export default function SupplierDataTable<TData, TValue>({ columns, tenantId }: DataTableProps<TData, TValue>) {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Data Fetching
  const { data, isLoading } = useQuery({ 
      queryKey: ['suppliers', tenantId], 
      queryFn: () => fetchSuppliers(tenantId) 
  });

  // Create Mutation
  const mutation = useMutation({
    mutationFn: createSupplier,
    onSuccess: () => {
        toast.success("Supplier profile created successfully");
        queryClient.invalidateQueries({ queryKey: ['suppliers', tenantId] });
        setIsDialogOpen(false);
    },
    onError: (error: any) => toast.error(error.message || "Failed to create supplier"),
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const name = formData.get('name') as string;
    if (!name) return toast.error("Supplier Name is required");

    mutation.mutate({ 
        name: name, 
        email: formData.get('email') as string, 
        phone: formData.get('phone_number') as string, 
        address: formData.get('address') as string,
        tenantId
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
                <Button className="bg-slate-900 text-white hover:bg-slate-800">
                    <PlusCircle className="mr-2 h-4 w-4"/> Add Supplier
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Create New Supplier</DialogTitle>
                    <DialogDescription>Add a new vendor to your procurement list.</DialogDescription>
                </DialogHeader>
                <form id="supplier-form" onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Supplier Name *</Label>
                        <Input id="name" name="name" required placeholder="Acme Corp" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input id="email" name="email" type="email" placeholder="contact@acme.com" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="phone">Phone</Label>
                            <Input id="phone" name="phone_number" placeholder="+1..." />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="address">Address</Label>
                        <Input id="address" name="address" placeholder="123 Business Rd" />
                    </div>
                </form>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                    <Button type="submit" form="supplier-form" disabled={mutation.isPending}>
                        {mutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Saving...</> : "Save Supplier"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-md border bg-white shadow-sm">
        <Table>
          <TableHeader className="bg-slate-50">
              {table.getHeaderGroups().map(hg => (
                  <TableRow key={hg.id}>
                      {hg.headers.map(h => (
                          <TableHead key={h.id}>{flexRender(h.column.columnDef.header, h.getContext())}</TableHead>
                      ))}
                  </TableRow>
              ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
                <TableRow><TableCell colSpan={columns.length} className="h-32 text-center"><Loader2 className="animate-spin mx-auto"/></TableCell></TableRow>
            ) : table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map(row => (
                    <TableRow key={row.id} className="hover:bg-slate-50/50">
                        {row.getVisibleCells().map(cell => (
                            <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                        ))}
                    </TableRow>
                ))
            ) : (
                <TableRow><TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">No suppliers found.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}