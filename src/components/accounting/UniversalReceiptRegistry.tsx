'use client';

/**
 * --- UNIVERSAL RECEIPT REGISTRY ---
 * VERSION: v2.0 ENTERPRISE (DEEP SNAPSHOT)
 * Use: Corporate audit hub for viewing and reprinting legal payment records.
 * Logic: Snapshot integrity + Forensic reprint tracking + Watermark security.
 */

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { 
    Search, Printer, FileText, Loader2, 
    History, BadgeCheck, ShieldCheck, Download,
    AlertTriangle, Filter, Database, Receipt
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const supabase = createClient();

// Helper: Hex to RGB for PDF branding
const hexToRgb = (hex: string = "#0F172A") => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return [r, g, b];
};

export default function UniversalReceiptRegistry() {
    const queryClient = useQueryClient();
    const [search, setSearch] = useState("");
    const [printingId, setPrintingId] = useState<number | null>(null);

    // 1. DATA FETCH: Fetch all sales with nested items and audit metadata
    const { data: records, isLoading } = useQuery({
        queryKey: ['system_receipt_ledger'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('sales')
                .select(`*, items:sale_items(*)`)
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data;
        }
    });

    // 2. REPRINT COUNTER MUTATION
    const logReprint = useMutation({
        mutationFn: async (id: number) => {
            const { error } = await supabase.rpc('increment_receipt_reprint_count', { p_sale_id: id });
            if (error) throw error;
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['system_receipt_ledger'] })
    });

    // 3. ENTERPRISE PDF ENGINE (REPRINT SECURE)
    const generateReceiptPDF = async (receipt: any) => {
        setPrintingId(receipt.id);
        const meta = receipt.metadata || {};
        const reprintCount = (receipt.reprint_count || 0) + 1;
        const isDuplicate = reprintCount > 1;
        
        const primaryRGB = hexToRgb(meta.branding?.primary_color || '#1E293B');
        
        const doc = new jsPDF('p', 'mm', 'a4');
        
        // --- 🛡️ SECURITY WATERMARK ---
        if (isDuplicate) {
            doc.setFontSize(45); doc.setTextColor(245, 245, 245);
            doc.text("DUPLICATE REPRINT", 35, 150, { angle: 45 });
        }

        // --- CORPORATE HEADER ---
        if (meta.branding?.logo_url) {
            try {
                doc.addImage(meta.branding.logo_url, 'PNG', 15, 15, 25, 25);
            } catch (e) {}
        }

        doc.setTextColor(primaryRGB[0], primaryRGB[1], primaryRGB[2]);
        doc.setFontSize(22); doc.setFont("helvetica", "bold");
        const bizName = (meta.branding?.company_name_display || "BUSINESS UNIT").toUpperCase();
        doc.text(bizName, 105, 25, { align: 'center' });

        doc.setTextColor(100, 116, 139);
        doc.setFontSize(8); doc.setFont("helvetica", "normal");
        const rightX = 195;
        doc.text(`TIN: ${meta.tinNumber || 'N/A'}`, rightX, 20, { align: 'right' });
        doc.text(`Email: ${meta.officialEmail || 'N/A'}`, rightX, 24, { align: 'right' });
        doc.text(`Ref: ${receipt.invoice_number}`, rightX, 28, { align: 'right' });

        doc.setDrawColor(primaryRGB[0], primaryRGB[1], primaryRGB[2]);
        doc.setLineWidth(0.5); doc.line(15, 45, 195, 45);

        // --- TRANSACTION DETAILS ---
        doc.setTextColor(15, 23, 42);
        doc.setFontSize(16); doc.setFont("helvetica", "bold");
        doc.text("OFFICIAL RECEIPT", 15, 60);

        doc.setFontSize(9); doc.setFont("helvetica", "normal");
        doc.text(`ISSUE DATE: ${format(new Date(receipt.created_at), 'dd MMMM yyyy p')}`, 15, 68);
        doc.text(`CLIENT: ${receipt.customer_name || 'Individual'}`, 15, 73);

        if (isDuplicate) {
            doc.setTextColor(185, 28, 28);
            doc.text(`REPRINT SESSION: ${reprintCount}`, 195, 68, { align: 'right' });
        }

        // --- LINE ITEMS ---
        autoTable(doc, {
            startY: 80,
            head: [['Description', 'Quantity', 'Rate', 'Sub-Total']],
            body: receipt.items.map((i: any) => [
                `Product Reference: ${i.variant_id}`, 
                i.quantity, 
                i.unit_price.toLocaleString(), 
                i.total.toLocaleString()
            ]),
            headStyles: { fillColor: primaryRGB, textColor: [255, 255, 255] },
            styles: { fontSize: 8, cellPadding: 4 },
            theme: 'grid'
        });

        // --- VALUATION SUMMARY ---
        const finalY = (doc as any).lastAutoTable.finalY + 10;
        doc.setFontSize(12); doc.setTextColor(15, 23, 42); doc.setFont("helvetica", "bold");
        doc.text(`NET SETTLEMENT: ${receipt.total_amount.toLocaleString()} ${receipt.currency_code || 'UGX'}`, 195, finalY, { align: 'right' });

        // DATABASE AUDIT: Increment count
        await logReprint.mutateAsync(receipt.id);

        doc.save(`Receipt_${receipt.invoice_number}.pdf`);
        setPrintingId(null);
    };

    const filtered = useMemo(() => {
        return records?.filter(r => 
            r.invoice_number?.toLowerCase().includes(search.toLowerCase()) ||
            r.customer_name?.toLowerCase().includes(search.toLowerCase())
        );
    }, [records, search]);

    if (isLoading) return (
        <div className="p-32 text-center bg-white rounded-3xl border border-slate-100 flex flex-col items-center gap-4">
            <Loader2 className="animate-spin text-blue-600 h-10 w-10" />
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Synchronizing Registry...</p>
        </div>
    );

    return (
        <div className="space-y-10 animate-in fade-in duration-700 pb-24">
            
            {/* SEARCH & AUDIT MONITOR */}
            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="relative w-full md:w-[500px]">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <Input 
                        placeholder="Filter registry by No. or Customer Name..." 
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="h-12 pl-12 border-slate-200 rounded-xl font-medium text-sm focus:ring-blue-600 shadow-inner" 
                    />
                </div>
                <div className="flex items-center gap-6 text-right border-l pl-6 border-slate-100">
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Database Sync</p>
                        <p className="text-xs font-bold text-slate-900 uppercase flex items-center gap-2 justify-end">
                            <Database size={12} className="text-blue-500" /> Registry Active
                        </p>
                    </div>
                    <Badge variant="outline" className="h-10 px-6 border-slate-200 bg-slate-50 text-slate-600 font-bold uppercase tracking-widest text-[11px]">{filtered?.length || 0} Records</Badge>
                </div>
            </div>

            {/* LEDGER TABLE */}
            <Card className="border border-slate-200 shadow-sm rounded-3xl overflow-hidden bg-white">
                <Table>
                    <TableHeader className="bg-slate-50/80">
                        <TableRow className="h-14 border-none">
                            <TableHead className="pl-8 font-bold text-[10px] uppercase text-slate-500">Registry Reference</TableHead>
                            <TableHead className="font-bold text-[10px] uppercase text-slate-500">Target Client</TableHead>
                            <TableHead className="text-right font-bold text-[10px] uppercase text-slate-500">Net Valuation</TableHead>
                            <TableHead className="text-center font-bold text-[10px] uppercase text-slate-500">Audit Status</TableHead>
                            <TableHead className="pr-8 text-right font-bold text-[10px] uppercase text-slate-500">Operations</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filtered?.map((r) => (
                            <TableRow key={r.id} className="h-20 hover:bg-slate-50/50 transition-colors border-b last:border-none">
                                <TableCell className="pl-8">
                                    <p className="font-bold text-slate-900 text-xs">{r.invoice_number || 'TRX-PENDING'}</p>
                                    <p className="text-[10px] text-slate-400 font-medium uppercase mt-0.5">{format(new Date(r.created_at), 'dd MMM yyyy')}</p>
                                </TableCell>
                                <TableCell>
                                    <p className="text-sm font-semibold text-slate-800">{r.customer_name || 'Individual Client'}</p>
                                </TableCell>
                                <TableCell className="text-right">
                                    <p className="font-black text-slate-950 text-sm tabular-nums">{r.total_amount.toLocaleString()}</p>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">{r.currency_code}</p>
                                </TableCell>
                                <TableCell className="text-center">
                                    {r.reprint_count > 0 ? (
                                        <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700 font-bold text-[9px] uppercase px-3 py-1 rounded-full">
                                            <AlertTriangle size={12} className="mr-1.5" /> Reprinted x{r.reprint_count}
                                        </Badge>
                                    ) : (
                                        <Badge variant="outline" className="border-emerald-100 bg-emerald-50 text-emerald-700 font-bold text-[9px] uppercase px-3 py-1 rounded-full">
                                            <BadgeCheck size={12} className="mr-1.5" /> Original Proof
                                        </Badge>
                                    )}
                                </TableCell>
                                <TableCell className="pr-8 text-right">
                                    <Button 
                                        variant="ghost" 
                                        onClick={() => generateReceiptPDF(r)}
                                        disabled={printingId === r.id}
                                        className="h-10 px-6 bg-slate-50 hover:bg-slate-900 hover:text-white rounded-xl font-bold text-[10px] uppercase tracking-widest gap-3 transition-all active:scale-95"
                                    >
                                        {printingId === r.id ? <Loader2 className="animate-spin h-4 w-4" /> : <Printer size={16} />}
                                        Issue Reprint
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Card>

            <footer className="flex justify-center pt-10 opacity-30">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.5em] flex items-center gap-3">
                    <ShieldCheck size={14} /> Comprehensive Financial Trace Enabled
                </p>
            </footer>
        </div>
    );
}