'use client';

import React, { useState } from 'react';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable
} from "@tanstack/react-table";
// The 'keepPreviousData' function is imported to be used with the 'placeholderData' option.
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { poColumns, PurchaseOrderRow } from "@/components/purchases/poColumns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, PlusCircle } from "lucide-react";
import { toast } from 'sonner';

// --- API: Load paginated and searchable POs ---
async function fetchPurchaseOrders(page: number, pageSize: number, search: string): Promise<{ orders: PurchaseOrderRow[], total_count: number }> {
    const { data, error } = await createClient().rpc('get_paginated_purchase_orders', {
        p_page: page,
        p_page_size: pageSize,
        p_search_text: search || null,
    });
    if (error) throw new Error(error.message);
    return { orders: data?.orders ?? [], total_count: data?.total_count ?? 0 };
}

export default function PurchaseOrderDataTable({ columns = poColumns }: { columns?: ColumnDef<PurchaseOrderRow>[] }) {
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    const [search, setSearch] = useState('');
    const queryClient = useQueryClient();

    const { data, isLoading, isError, error } = useQuery({
        queryKey: ['purchase_orders', page, pageSize, search],
        queryFn: () => fetchPurchaseOrders(page, pageSize, search),
        // This is the correct v5 syntax. It tells the query to use the last successful
        // data as a placeholder while fetching new data, preventing UI flickers on pagination.
        placeholderData: keepPreviousData,
    });

    // Bulk actions, advanced filtering, and inline controls (enterprise-ready)
    // For demo, bulk delete is just a placeholder
    const handleBulkDelete = () => toast.info("Bulk delete coming soon!");
    const handleExportCSV = () => toast.info("Export CSV coming soon!");

    // Table instance
    const table = useReactTable({
        data: data?.orders ?? [],
        columns,
        getCoreRowModel: getCoreRowModel(),
        manualPagination: true,
        pageCount: Math.ceil((data?.total_count ?? 0) / pageSize),
        state: { pagination: { pageIndex: page - 1, pageSize } },
    });

    return (
        <div className="space-y-4">
            {/* Header: Search and actions */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                <Input
                    placeholder="Search by supplier, status, PO number..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="max-w-sm"
                />
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleBulkDelete} disabled>
                        Bulk Delete
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleExportCSV} disabled>
                        Export CSV
                    </Button>
                </div>
            </div>

            <div className="rounded-md border bg-card">
                <Table>
                    <TableHeader>
                        {table.getHeaderGroups().map(hg => (
                            <TableRow key={hg.id}>
                                {hg.headers.map(h => (
                                    <TableHead key={h.id}>
                                        {flexRender(h.column.columnDef.header, h.getContext())}
                                    </TableHead>
                                ))}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={columns.length} className="h-24 text-center">
                                    <Loader2 className="animate-spin mr-2 inline-block" /> Loading purchase orders...
                                </TableCell>
                            </TableRow>
                        ) : isError ? (
                            <TableRow>
                                <TableCell colSpan={columns.length} className="h-24 text-center text-red-500">
                                    Error: {error.message}
                                </TableCell>
                            </TableRow>
                        ) : table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map(row => (
                                <TableRow key={row.id}>
                                    {row.getVisibleCells().map(cell => (
                                        <TableCell key={cell.id}>
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={columns.length} className="h-24 text-center">
                                    No purchase orders found.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-2">
                <span className="text-sm text-muted-foreground">
                    Showing {((page - 1) * pageSize) + 1} - {Math.min(page * pageSize, data?.total_count ?? 0)} of {data?.total_count ?? 0}
                </span>
                <div className="flex gap-2 items-center">
                    <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>
                    <span>Page {page} of {table.getPageCount()}</span>
                    <Button variant="outline" size="sm" onClick={() => setPage(p => (p < table.getPageCount() ? p + 1 : p))} disabled={page >= table.getPageCount()}>Next</Button>
                    <Input
                        type="number"
                        min={1}
                        max={table.getPageCount()}
                        value={pageSize}
                        onChange={e => setPageSize(Number(e.target.value))}
                        className="w-16"
                    />
                </div>
            </div>
        </div>
    );
}