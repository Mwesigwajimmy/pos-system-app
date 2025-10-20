// src/components/purchases/SupplierDataTable.tsx
'use client';
import React, { useState } from 'react';
import { ColumnDef, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PlusCircle } from 'lucide-react';
import { toast } from 'sonner';

interface DataTableProps<TData, TValue> { columns: ColumnDef<TData, TValue>[]; }

async function fetchSuppliers(): Promise<any[]> {
    const { data, error } = await createClient().from('suppliers').select('*');
    if (error) throw new Error(error.message);
    return data || [];
}

async function createSupplier(supplierData: { name: string, email?: string, phone?: string, address?: string }) {
    const { error } = await createClient().from('suppliers').insert(supplierData);
    if (error) throw error;
}

export default function SupplierDataTable<TData, TValue>({ columns }: DataTableProps<TData, TValue>) {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { data, isLoading } = useQuery({ queryKey: ['suppliers'], queryFn: fetchSuppliers });

  const mutation = useMutation({
    mutationFn: createSupplier,
    onSuccess: () => {
        toast.success("Supplier created!");
        queryClient.invalidateQueries({queryKey: ['suppliers']});
        setIsDialogOpen(false);
    },
    onError: (error) => toast.error(error.message),
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    mutation.mutate({ name: data.name as string, email: data.email as string, phone: data.phone_number as string, address: data.address as string });
  }

  const table = useReactTable({ data: (data as TData[]) ?? [], columns, getCoreRowModel: getCoreRowModel() });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild><Button><PlusCircle className="mr-2 h-4 w-4"/>Add New Supplier</Button></DialogTrigger>
            <DialogContent>
                <DialogHeader><DialogTitle>Create New Supplier</DialogTitle></DialogHeader>
                <form id="supplier-form" onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="space-y-2"><Label>Name</Label><Input name="name" required /></div>
                    <div className="space-y-2"><Label>Email</Label><Input name="email" type="email" /></div>
                    <div className="space-y-2"><Label>Phone</Label><Input name="phone_number" /></div>
                    <div className="space-y-2"><Label>Address</Label><Input name="address" /></div>
                </form>
                <DialogFooter>
                    <Button type="submit" form="supplier-form" disabled={mutation.isPending}>
                        {mutation.isPending ? "Saving..." : "Save Supplier"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
      </div>
      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>{table.getHeaderGroups().map(hg => <TableRow key={hg.id}>{hg.headers.map(h => <TableHead key={h.id}>{flexRender(h.column.columnDef.header, h.getContext())}</TableHead>)}</TableRow>)}</TableHeader>
          <TableBody>
            {isLoading ? <TableRow><TableCell colSpan={columns.length} className="h-24 text-center">Loading suppliers...</TableCell></TableRow>
             : table.getRowModel().rows?.length ? table.getRowModel().rows.map(row => <TableRow key={row.id}>{row.getVisibleCells().map(cell => <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>)}</TableRow>)
             : <TableRow><TableCell colSpan={columns.length} className="h-24 text-center">No suppliers found.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}