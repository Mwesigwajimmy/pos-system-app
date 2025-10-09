'use client';

import React, { useState } from 'react';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  PaginationState,
} from "@tanstack/react-table";
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import AddProductDialog from './AddProductDialog';
import ImportProductsDialog from './ImportProductsDialog'; // Import the new component

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  initialData: TData[];
  totalCount: number;
}

// Fetches product data for the table based on the current page and page size.
async function fetchProducts(pagination: PaginationState): Promise<{ products: any[], total_count: number }> {
    const supabase = createClient();
    const { data, error } = await supabase.rpc('get_paginated_products', {
        p_page: pagination.pageIndex + 1,
        p_page_size: pagination.pageSize,
    });
    if (error) throw new Error(error.message);
    return data;
}

export default function InventoryDataTable<TData, TValue>({
  columns,
  initialData,
  totalCount,
}: DataTableProps<TData, TValue>) {
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['products', pagination],
    queryFn: () => fetchProducts(pagination),
    initialData: { products: initialData, total_count: totalCount },
    placeholderData: (prevData) => prevData,
  });

  const table = useReactTable({
    data: data?.products as TData[],
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: Math.ceil((data?.total_count ?? 0) / pagination.pageSize),
    state: {
      pagination,
    },
    onPaginationChange: setPagination,
  });

  return (
    <div className="space-y-4">
       <div className="flex justify-end gap-2">
          <ImportProductsDialog />
          <AddProductDialog />
        </div>
      <div className="rounded-md border bg-white">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
                <TableRow><TableCell colSpan={columns.length} className="h-24 text-center">Loading...</TableCell></TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No products found. Add your first product to get started.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
       <div className="flex items-center justify-end space-x-2">
        <span className="flex-1 text-sm text-muted-foreground">
            Total Products: {data?.total_count ?? 0}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          Next
        </Button>
      </div>
    </div>
  );
}