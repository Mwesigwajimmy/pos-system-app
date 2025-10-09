'use client';
import React, { useState } from 'react';
import { ColumnDef, flexRender, getCoreRowModel, useReactTable, PaginationState } from "@tanstack/react-table";
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import AddExpenseDialog from './AddExpenseDialog';

interface DataTableProps<TData, TValue> { columns: ColumnDef<TData, TValue>[]; }

async function fetchExpenses(pagination: PaginationState): Promise<{ expenses: any[], total_count: number }> {
    const supabase = createClient();
    const { data, error } = await supabase.rpc('get_paginated_expenses', {
        p_page: pagination.pageIndex + 1,
        p_page_size: pagination.pageSize,
    });
    if (error) throw new Error(error.message);
    return data;
}

export default function ExpenseDataTable<TData, TValue>({ columns }: DataTableProps<TData, TValue>) {
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
  const { data, isLoading } = useQuery({
    queryKey: ['expenses', pagination],
    queryFn: () => fetchExpenses(pagination),
  });

  const table = useReactTable({
    data: (data?.expenses as TData[]) ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: Math.ceil((data?.total_count ?? 0) / pagination.pageSize),
    state: { pagination },
    onPaginationChange: setPagination,
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end"><AddExpenseDialog /></div>
      <div className="rounded-md border bg-white">
        <Table>
          <TableHeader>{table.getHeaderGroups().map(hg => <TableRow key={hg.id}>{hg.headers.map(h => <TableHead key={h.id}>{flexRender(h.column.columnDef.header, h.getContext())}</TableHead>)}</TableRow>)}</TableHeader>
          <TableBody>
            {isLoading ? <TableRow><TableCell colSpan={columns.length} className="h-24 text-center">Loading...</TableCell></TableRow>
             : table.getRowModel().rows?.length ? table.getRowModel().rows.map(row => <TableRow key={row.id}>{row.getVisibleCells().map(cell => <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>)}</TableRow>)
             : <TableRow><TableCell colSpan={columns.length} className="h-24 text-center">No expenses recorded yet.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end space-x-2">
        <span className="flex-1 text-sm text-muted-foreground">Total Expenses: {data?.total_count ?? 0}</span>
        <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>Previous</Button>
        <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>Next</Button>
      </div>
    </div>
  );
}