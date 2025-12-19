'use client';

import React, { useState } from 'react';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable
} from "@tanstack/react-table";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { poColumns, PurchaseOrderRow } from "@/components/purchases/poColumns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { toast } from 'react-hot-toast';

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
    const [rowSelection, setRowSelection] = useState({});
    const queryClient = useQueryClient();
    const supabase = createClient();

    const { data, isLoading, isError, error } = useQuery({
        queryKey: ['purchase_orders', page, pageSize, search],
        queryFn: () => fetchPurchaseOrders(page, pageSize, search),
        placeholderData: keepPreviousData,
    });

    const bulkDeleteMutation = useMutation({
        mutationFn: async (ids: number[]) => {
            const { error } = await supabase.rpc('bulk_delete_purchase_orders', { p_ids: ids });
            if (error) throw error;
        },
        onSuccess: () => {
            toast.success("Purchase orders deleted successfully");
            queryClient.invalidateQueries({ queryKey: ['purchase_orders'] });
            setRowSelection({});
        },
        onError: (err: any) => toast.error(err.message)
    });

    const handleBulkDelete = () => {
        const selectedIds = table.getFilteredSelectedRowModel().rows.map(row => row.original.id);
        if (selectedIds.length === 0) return;
        
        if (confirm(`Delete ${selectedIds.length} purchase orders? This action cannot be undone.`)) {
            bulkDeleteMutation.mutate(selectedIds);
        }
    };

    const handleExportCSV = () => {
        const selectedRows = table.getFilteredSelectedRowModel().rows;
        const rowsToExport = selectedRows.length > 0 
            ? selectedRows.map(r => r.original) 
            : data?.orders ?? [];

        if (rowsToExport.length === 0) return toast.error("No data available to export");

        const headers = ["PO #", "Status", "Supplier", "Date", "Total", "Currency"];
        const csvRows = [
            headers.join(","),
            ...rowsToExport.map(r => [
                r.id,
                r.status,
                `"${r.supplier_name || ''}"`,
                r.order_date || '',
                r.total_cost || 0,
                r.currency_code
            ].join(","))
        ];

        const blob = new Blob([csvRows.join("\n")], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `PO_Export_${new Date().getTime()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const table = useReactTable({
        data: data?.orders ?? [],
        columns,
        getCoreRowModel: getCoreRowModel(),
        onRowSelectionChange: setRowSelection,
        manualPagination: true,
        pageCount: Math.ceil((data?.total_count ?? 0) / pageSize),
        state: { 
            pagination: { pageIndex: page - 1, pageSize },
            rowSelection,
        },
    });

    return (
        <div className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                <Input
                    placeholder="Search by supplier, status, PO number..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="max-w-sm"
                />
                <div className="flex gap-2">
                    <Button 
                        variant="destructive" 
                        size="sm" 
                        onClick={handleBulkDelete} 
                        disabled={Object.keys(rowSelection).length === 0 || bulkDeleteMutation.isPending}
                    >
                        {bulkDeleteMutation.isPending ? "Processing..." : `Bulk Delete (${Object.keys(rowSelection).length})`}
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleExportCSV}>
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
                                <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
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

            <div className="flex items-center justify-between mt-2">
                <span className="text-sm text-muted-foreground">
                    Showing {((page - 1) * pageSize) + 1} - {Math.min(page * pageSize, data?.total_count ?? 0)} of {data?.total_count ?? 0}
                </span>
                <div className="flex gap-2 items-center">
                    <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>
                    <span className="text-sm">Page {page} of {table.getPageCount() || 1}</span>
                    <Button variant="outline" size="sm" onClick={() => setPage(p => (p < table.getPageCount() ? p + 1 : p))} disabled={page >= table.getPageCount()}>Next</Button>
                    <Input
                        type="number"
                        min={1}
                        value={pageSize}
                        onChange={e => setPageSize(Number(e.target.value))}
                        className="w-16 h-8"
                    />
                </div>
            </div>
        </div>
    );
}