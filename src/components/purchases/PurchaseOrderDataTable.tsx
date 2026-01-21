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
import { 
    Loader2, FileDown, ShieldCheck, Landmark, 
    AlertCircle, Search, Trash2, Printer 
} from "lucide-react";
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';

// PDF Printing Engines
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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

    // --- ENTERPRISE COMMERCIAL PO GENERATOR ---
    const handleDownloadPDF = async (po: PurchaseOrderRow) => {
        const loadingToast = toast.loading("Generating professional PO...");
        
        try {
            // Fetch line items for the PDF (Ensures absolute accuracy)
            const { data: items, error: itemError } = await supabase
                .from('purchase_order_items')
                .select('quantity, unit_cost, variant_id, product_variants(name, sku)')
                .eq('purchase_order_id', po.id);

            if (itemError) throw itemError;

            const doc = new jsPDF();
            const timestamp = format(new Date(), 'dd MMM yyyy, HH:mm');

            // 1. Header & Branding
            doc.setFontSize(22);
            doc.setTextColor(30, 41, 59); // Slate-800
            doc.text("COMMERCIAL PURCHASE ORDER", 14, 22);
            
            doc.setFontSize(10);
            doc.setTextColor(100);
            doc.text(`PO Reference: #PO-${po.id}`, 14, 30);
            doc.text(`Order Date: ${po.order_date || 'N/A'}`, 14, 35);

            // 2. Multi-Tenant Context Box
            doc.setDrawColor(226, 232, 240);
            doc.line(14, 42, 196, 42);

            doc.setFontSize(12);
            doc.setTextColor(0);
            doc.setFont("helvetica", "bold");
            doc.text("SHIP TO (BUYER):", 14, 52);
            doc.setFont("helvetica", "normal");
            doc.text("Authorized Enterprise Entity", 14, 59);
            doc.text("Ledger Account: 1200 (Inventory Asset)", 14, 65);

            doc.setFont("helvetica", "bold");
            doc.text("SUPPLIER:", 120, 52);
            doc.setFont("helvetica", "normal");
            doc.text(po.supplier_name || "Unspecified Vendor", 120, 59);
            doc.text(`Status: ${po.status.toUpperCase()}`, 120, 65);

            // 3. Line Items Table
            autoTable(doc, {
                startY: 75,
                head: [['Item SKU', 'Description', 'Qty', 'Unit Cost', 'Subtotal']],
                body: items?.map((item: any) => [
                    item.product_variants?.sku || 'N/A',
                    item.product_variants?.name || 'General Inventory Item',
                    item.quantity,
                    new Intl.NumberFormat().format(item.unit_cost ?? 0),
                    new Intl.NumberFormat().format((item.quantity ?? 0) * (item.unit_cost ?? 0))
                ]) || [['No Items Found', '-', '-', '-', '-']],
                theme: 'striped',
                headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255] },
            });

            // 4. Financial Summary
            const finalY = (doc as any).lastAutoTable.finalY + 10;
            doc.setFontSize(14);
            doc.setFont("helvetica", "bold");
            doc.text(`TOTAL ORDER VALUE:`, 110, finalY + 5);
            // FIXED: Added null fallback for total_cost
            doc.text(`${po.currency_code} ${new Intl.NumberFormat().format(po.total_cost ?? 0)}`, 196, finalY + 5, { align: 'right' });

            // 5. Enterprise Verification Footer
            doc.setFontSize(8);
            doc.setTextColor(150);
            const isLedgerSynced = po.status.toLowerCase() === 'received' || po.status.toLowerCase() === 'paid';
            doc.text(`Verification Signature: __________________________`, 14, finalY + 25);
            doc.text(`Digital Audit Trace: PO-REC-${po.id} | GL Interconnect: ${isLedgerSynced ? 'YES (Account 1200/2000)' : 'PENDING'}`, 14, finalY + 32);
            doc.text(`This document is an autonomous extract from the UG-BizSuite Cloud ERP.`, 14, finalY + 37);

            doc.save(`PurchaseOrder_${po.id}.pdf`);
            toast.dismiss(loadingToast);
            toast.success("Enterprise PO Generated Successfully");
        } catch (err: any) {
            toast.dismiss(loadingToast);
            toast.error("PDF Failed: " + err.message);
        }
    };

    const bulkDeleteMutation = useMutation({
        mutationFn: async (ids: number[]) => {
            const { error } = await supabase.rpc('bulk_delete_purchase_orders', { p_ids: ids });
            if (error) throw error;
        },
        onSuccess: () => {
            toast.success("Purchase orders removed from registry");
            queryClient.invalidateQueries({ queryKey: ['purchase_orders'] });
            setRowSelection({});
        },
        onError: (err: any) => toast.error(err.message)
    });

    const handleBulkDelete = () => {
        const selectedIds = table.getFilteredSelectedRowModel().rows.map(row => row.original.id);
        if (selectedIds.length === 0) return;
        if (confirm(`Authorize removal of ${selectedIds.length} POs from registry?`)) {
            bulkDeleteMutation.mutate(selectedIds);
        }
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
            {/* Header Actions */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-muted/20 p-4 rounded-lg border">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search registry (Supplier, ID, Status)..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="pl-10 h-10 shadow-sm"
                    />
                </div>
                <div className="flex gap-2">
                    {Object.keys(rowSelection).length > 0 && (
                        <Button 
                            variant="destructive" 
                            size="sm" 
                            onClick={handleBulkDelete} 
                            disabled={bulkDeleteMutation.isPending}
                            className="shadow-md"
                        >
                            <Trash2 className="mr-2 h-4 w-4" /> Delete selected
                        </Button>
                    )}
                    <Button variant="outline" size="sm" className="bg-background">
                        <FileDown className="mr-2 h-4 w-4" /> Export CSV
                    </Button>
                </div>
            </div>

            {/* Main Registry Table */}
            <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
                <Table>
                    <TableHeader className="bg-muted/50">
                        {table.getHeaderGroups().map(hg => (
                            <TableRow key={hg.id}>
                                {hg.headers.map(h => (
                                    <TableHead key={h.id} className="font-bold text-slate-700 uppercase text-[11px] tracking-wider">
                                        {flexRender(h.column.columnDef.header, h.getContext())}
                                    </TableHead>
                                ))}
                                <TableHead className="text-right pr-6 font-bold text-slate-700 uppercase text-[11px] tracking-wider">Actions</TableHead>
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow><TableCell colSpan={columns.length + 1} className="h-48 text-center"><Loader2 className="animate-spin h-8 w-8 mx-auto text-primary" /></TableCell></TableRow>
                        ) : table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map(row => (
                                <TableRow key={row.id} className="group hover:bg-primary/5 transition-colors border-b">
                                    {row.getVisibleCells().map(cell => (
                                        <TableCell key={cell.id} className="py-4">
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </TableCell>
                                    ))}
                                    <TableCell className="text-right pr-6">
                                        <div className="flex justify-end gap-2">
                                            {/* LEDGER SYNC INDICATOR */}
                                            {(row.original.status.toLowerCase() === 'received' || row.original.status.toLowerCase() === 'paid') && (
                                                <div className="flex items-center gap-1 text-[10px] text-green-600 font-bold uppercase mr-2">
                                                    <ShieldCheck className="h-3 w-3" /> Ledger Sync
                                                </div>
                                            )}
                                            <Button 
                                                size="sm" 
                                                variant="outline" 
                                                className="h-8 flex items-center gap-1 border-primary/20 hover:bg-primary/5 transition-all"
                                                onClick={() => handleDownloadPDF(row.original)}
                                            >
                                                <Printer className="h-3.5 w-3.5" /> PDF
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow><TableCell colSpan={columns.length + 1} className="h-48 text-center text-muted-foreground font-medium">No purchase orders found in the registry.</TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination Engine */}
            <div className="flex items-center justify-between p-2">
                <span className="text-xs text-muted-foreground font-medium uppercase tracking-tighter">
                    Records {((page - 1) * pageSize) + 1} - {Math.min(page * pageSize, data?.total_count ?? 0)} of {data?.total_count ?? 0}
                </span>
                <div className="flex gap-4 items-center">
                    <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="h-8">Previous</Button>
                        <div className="px-3 py-1 bg-primary text-white text-xs font-bold rounded-md">{page}</div>
                        <Button variant="ghost" size="sm" onClick={() => setPage(p => (p < table.getPageCount() ? p + 1 : p))} disabled={page >= table.getPageCount()} className="h-8">Next</Button>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase text-muted-foreground font-bold">Limit:</span>
                        <Input
                            type="number"
                            value={pageSize}
                            onChange={e => setPageSize(Number(e.target.value))}
                            className="w-16 h-8 text-xs font-bold"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}