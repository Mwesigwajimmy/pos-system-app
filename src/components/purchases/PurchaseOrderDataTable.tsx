'use client';

/**
 * --- BBU1 PURCHASE ORDER DATA TABLE ---
 * VERSION: v6.4 OMEGA (IDENTITY HANDSHAKE WELDED)
 * Use: Sovereign registry for procurement document oversight.
 * Logic: Multi-tenant pagination engine with commercial PDF generation.
 */

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

// --- DATA FETCHING (HANDSHAKE ENFORCED) ---
async function fetchPurchaseOrders(page: number, pageSize: number, search: string): Promise<{ orders: PurchaseOrderRow[], total_count: number }> {
    const supabase = createClient();
    
    // Fetching through RPC to maintain strict multi-tenant isolation
    const { data, error } = await supabase.rpc('get_paginated_purchase_orders', {
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
        const loadingToast = toast.loading("Generating forensic document...");
        
        try {
            // Fetch line items specifically for this PO to ensure data integrity
            const { data: items, error: itemError } = await supabase
                .from('purchase_order_items')
                .select('quantity, unit_cost, variant_id, product_variants(name, sku)')
                .eq('purchase_order_id', po.id);

            if (itemError) throw itemError;

            const doc = new jsPDF();

            // 1. Header & Branding Handshake
            doc.setFontSize(22);
            doc.setTextColor(30, 41, 59); // Slate-800
            doc.text("COMMERCIAL PURCHASE ORDER", 14, 22);
            
            doc.setFontSize(10);
            doc.setTextColor(100);
            doc.text(`PO Reference: #PO-${po.id}`, 14, 30);
            doc.text(`Order Date: ${po.order_date || 'N/A'}`, 14, 35);

            // 2. Multi-Tenant Context Divider
            doc.setDrawColor(226, 232, 240);
            doc.line(14, 42, 196, 42);

            doc.setFontSize(12);
            doc.setTextColor(0);
            doc.setFont("helvetica", "bold");
            doc.text("SHIP TO (BUYER):", 14, 52);
            doc.setFont("helvetica", "normal");
            doc.text("Authorized Enterprise Entity", 14, 59);
            doc.text("GADS Certified Ledger ID: 1200 (Inventory Asset)", 14, 65);

            doc.setFont("helvetica", "bold");
            doc.text("SUPPLIER:", 120, 52);
            doc.setFont("helvetica", "normal");
            doc.text(po.supplier_name || "Unspecified Vendor", 120, 59);
            doc.text(`Status: ${po.status.toUpperCase()}`, 120, 65);

            // 3. Line Items Table (Forensic Mapping)
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

            // 4. Financial Summary Calculation
            const finalY = (doc as any).lastAutoTable.finalY + 10;
            doc.setFontSize(14);
            doc.setFont("helvetica", "bold");
            doc.text(`TOTAL ORDER VALUE:`, 110, finalY + 5);
            
            // WELDED: Null-safe total cost handling
            const displayTotal = po.total_cost ?? 0;
            doc.text(`${po.currency_code || 'UGX'} ${new Intl.NumberFormat().format(displayTotal)}`, 196, finalY + 5, { align: 'right' });

            // 5. Enterprise Verification Footer
            doc.setFontSize(8);
            doc.setTextColor(150);
            const isLedgerSynced = po.status.toLowerCase() === 'received' || po.status.toLowerCase() === 'paid' || po.status.toLowerCase() === 'billed';
            doc.text(`Verification Signature: __________________________`, 14, finalY + 25);
            doc.text(`Digital Audit Trace: PO-REC-${po.id} | GL Interconnect: ${isLedgerSynced ? 'YES (Account 1200/2000)' : 'PENDING'}`, 14, finalY + 32);
            doc.text(`This document is an autonomous extract from the BBU1 Universe Sovereign Cloud ERP.`, 14, finalY + 37);

            doc.save(`PurchaseOrder_${po.id}.pdf`);
            toast.dismiss(loadingToast);
            toast.success("Document Signed and Dispatched");
        } catch (err: any) {
            toast.dismiss(loadingToast);
            toast.error("Forensic Extraction Failed: " + err.message);
        }
    };

    // --- BULK ACTION: REMOVAL ---
    const bulkDeleteMutation = useMutation({
        mutationFn: async (ids: number[]) => {
            const { error } = await supabase.rpc('bulk_delete_purchase_orders', { p_ids: ids });
            if (error) throw error;
        },
        onSuccess: () => {
            toast.success("Registry updated: Orders removed.");
            queryClient.invalidateQueries({ queryKey: ['purchase_orders'] });
            setRowSelection({});
        },
        onError: (err: any) => toast.error(err.message)
    });

    const handleBulkDelete = () => {
        const selectedIds = table.getFilteredSelectedRowModel().rows.map(row => row.original.id);
        if (selectedIds.length === 0) return;
        if (confirm(`Authorize permanent removal of ${selectedIds.length} POs?`)) {
            bulkDeleteMutation.mutate(selectedIds);
        }
    };

    // --- TABLE ENGINE ASSEMBLY ---
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
            {/* Header Toolbelt */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-muted/20 p-5 rounded-2xl border shadow-sm">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Search registry (Supplier, ID, Status)..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="pl-10 h-11 shadow-inner bg-white rounded-xl border-slate-200"
                    />
                </div>
                <div className="flex gap-2">
                    {Object.keys(rowSelection).length > 0 && (
                        <Button 
                            variant="destructive" 
                            size="sm" 
                            onClick={handleBulkDelete} 
                            disabled={bulkDeleteMutation.isPending}
                            className="shadow-lg h-11 px-6 rounded-xl font-bold uppercase text-xs"
                        >
                            <Trash2 className="mr-2 h-4 w-4" /> Purge Selection
                        </Button>
                    )}
                    <Button variant="outline" size="sm" className="bg-background h-11 px-6 rounded-xl font-bold border-slate-200">
                        <FileDown className="mr-2 h-4 w-4 text-slate-500" /> Export Ledger
                    </Button>
                </div>
            </div>

            {/* MAIN REGISTRY TABLE */}
            <div className="rounded-[1.5rem] border border-slate-200 bg-white shadow-xl overflow-hidden">
                <Table>
                    <TableHeader className="bg-slate-50/80">
                        {table.getHeaderGroups().map(hg => (
                            <TableRow key={hg.id} className="h-14 border-b border-slate-100">
                                {hg.headers.map(h => (
                                    <TableHead key={h.id} className="font-black text-slate-500 uppercase text-[10px] tracking-[0.2em] px-6">
                                        {flexRender(h.column.columnDef.header, h.getContext())}
                                    </TableHead>
                                ))}
                                <TableHead className="text-right pr-8 font-black text-slate-500 uppercase text-[10px] tracking-[0.2em]">Audit Actions</TableHead>
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow><TableCell colSpan={columns.length + 1} className="h-64 text-center"><Loader2 className="animate-spin h-10 w-10 mx-auto text-blue-600 opacity-20" /></TableCell></TableRow>
                        ) : table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map(row => (
                                <TableRow key={row.id} className="group hover:bg-slate-50/50 transition-all border-b border-slate-50 h-20">
                                    {row.getVisibleCells().map(cell => (
                                        <TableCell key={cell.id} className="px-6 py-4">
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </TableCell>
                                    ))}
                                    <TableCell className="text-right pr-8">
                                        <div className="flex justify-end items-center gap-3">
                                            {/* LEDGER SYNC INDICATOR */}
                                            {['received', 'paid', 'billed'].includes(row.original.status.toLowerCase()) && (
                                                <div className="flex items-center gap-1.5 text-[9px] text-emerald-600 font-black uppercase tracking-widest mr-2 bg-emerald-50 px-2.5 py-1 rounded-lg">
                                                    <ShieldCheck className="h-3 w-3" /> Sync Active
                                                </div>
                                            )}
                                            <Button 
                                                size="sm" 
                                                variant="outline" 
                                                className="h-9 px-4 rounded-xl flex items-center gap-2 border-slate-200 hover:bg-white shadow-sm font-bold text-[10px] uppercase tracking-widest"
                                                onClick={() => handleDownloadPDF(row.original)}
                                            >
                                                <Printer className="h-3.5 w-3.5 text-slate-400" /> Export PDF
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow><TableCell colSpan={columns.length + 1} className="h-64 text-center text-slate-400 font-black uppercase text-[10px] tracking-[0.2em]">Zero documents discovered in registry</TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination Controls */}
            <div className="flex flex-col sm:flex-row items-center justify-between p-4 gap-4">
                <span className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">
                    Registry Records {((page - 1) * pageSize) + 1} - {Math.min(page * pageSize, data?.total_count ?? 0)} / {data?.total_count ?? 0}
                </span>
                <div className="flex gap-6 items-center">
                    <div className="flex items-center gap-1.5">
                        <Button variant="ghost" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="h-9 font-bold text-xs uppercase text-slate-500">Prev</Button>
                        <div className="h-9 w-9 bg-blue-600 text-white text-xs font-black rounded-xl flex items-center justify-center shadow-lg shadow-blue-100">{page}</div>
                        <Button variant="ghost" size="sm" onClick={() => setPage(p => (p < table.getPageCount() ? p + 1 : p))} disabled={page >= table.getPageCount()} className="h-9 font-bold text-xs uppercase text-slate-500">Next</Button>
                    </div>
                    <div className="flex items-center gap-3 border-l border-slate-200 pl-6">
                        <span className="text-[10px] uppercase text-slate-400 font-black tracking-widest">Aura Limit:</span>
                        <Input
                            type="number"
                            value={pageSize}
                            onChange={e => setPageSize(Number(e.target.value))}
                            className="w-20 h-9 text-xs font-black rounded-xl border-slate-200 bg-slate-50 shadow-inner text-center"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}