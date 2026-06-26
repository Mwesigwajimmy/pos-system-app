'use client';

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
    FileDigit, CheckCircle2, Search, Loader2, Printer, 
    FileText, Plus, Settings2, ArrowRightLeft, 
    ArrowLeft, ShieldCheck, Filter, ChevronRight,
    LayoutDashboard, Activity
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useRouter } from 'next/navigation';

const supabase = createClient();

export default function QuotationHistoryManager() {
    const queryClient = useQueryClient();
    const router = useRouter();
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');

    const { data: quotes, isLoading } = useQuery({
        queryKey: ['commercial_quotes_history'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('estimates')
                .select(`*, items:estimate_line_items(*)`)
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data;
        }
    });

    const updateStatus = useMutation({
        mutationFn: async ({ id, status }: { id: string, status: string }) => {
            const { error } = await supabase.from('estimates').update({ status }).eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            toast.success("Transaction status synchronized");
            queryClient.invalidateQueries({ queryKey: ['commercial_quotes_history'] });
        }
    });

    const convertToInvoice = useMutation({
        mutationFn: async (id: string) => {
            const { data: { user } } = await supabase.auth.getUser();
            const { data, error } = await supabase.rpc('proc_convert_estimate_to_tax_document', {
                p_estimate_id: id,
                p_user_id: user?.id
            });
            if (error) throw error;
            return data;
        },
        onSuccess: (invId) => {
            toast.success(`Ledger Entry Finalized: #${invId}`);
            queryClient.invalidateQueries({ queryKey: ['commercial_quotes_history'] });
        }
    });

    const filteredQuotes = useMemo(() => {
        return quotes?.filter(q => {
            const matchesSearch = q.client_name?.toLowerCase().includes(search.toLowerCase()) || 
                                q.estimate_uid?.toLowerCase().includes(search.toLowerCase());
            const matchesStatus = statusFilter === 'ALL' || q.status === statusFilter;
            return matchesSearch && matchesStatus;
        });
    }, [quotes, search, statusFilter]);

    /**
     * --- PROFESSIONAL DEEP DOWNLOAD ENGINE ---
     * RESTORED: Pulls all Client details, Business Address, and Branding logic
     */
    const printQuotation = (q: any) => {
        const doc = new jsPDF('p', 'mm', 'a4');
        const meta = q.metadata || {}; // Extracts saved Branding and Client Info
        
        const hexToRgb = (hex: string = "#0F172A") => {
            const r = parseInt(hex.slice(1, 3), 16);
            const g = parseInt(hex.slice(3, 5), 16);
            const b = parseInt(hex.slice(5, 7), 16);
            return [r, g, b];
        };

        const primaryRGB = hexToRgb(meta.branding?.primary_color || '#1E293B');
        const textRGB = hexToRgb(meta.branding?.document_text_color || '#334155');

        // 1. WATERMARK
        if (meta.branding?.logo_url) {
            try {
                doc.saveGraphicsState();
                doc.setGState(new (doc as any).GState({ opacity: meta.branding.watermark_opacity || 0.05 }));
                doc.addImage(meta.branding.logo_url, 'PNG', 45, 90, 120, 120, undefined, 'FAST');
                doc.restoreGraphicsState();
            } catch (e) {}
        }

        // 2. CLEAN CORPORATE HEADER
        if (meta.branding?.logo_url) doc.addImage(meta.branding.logo_url, 'PNG', 15, 15, 30, 30);
        doc.setTextColor(primaryRGB[0], primaryRGB[1], primaryRGB[2]);
        doc.setFontSize(22); doc.setFont("helvetica", "bold");
        const bizName = meta.branding?.company_name_display || q.client_name; 
        doc.text((bizName).toUpperCase(), 50, 25);

        doc.setTextColor(textRGB[0], textRGB[1], textRGB[2]);
        doc.setFontSize(8); doc.setFont("helvetica", "normal");
        doc.text(`TIN: ${meta.tinNumber || 'N/A'}`, 50, 32);
        doc.text(`Email: ${meta.officialEmail || 'N/A'}`, 50, 36);
        doc.text(`Contact: ${meta.inquiryContact || 'N/A'}`, 50, 40);
        doc.text(`Address: ${meta.plotNumber || ''}, ${meta.pobox || ''}`, 50, 44);

        doc.setDrawColor(primaryRGB[0], primaryRGB[1], primaryRGB[2]);
        doc.setLineWidth(0.5); doc.line(15, 52, 195, 52);

        // 3. DOCUMENT SUBJECT
        doc.setFontSize(22); doc.setFont("helvetica", "bold");
        doc.text((q.title || "QUOTATION").toUpperCase(), 15, 70);
        doc.setFontSize(9); doc.setFont("helvetica", "normal");
        doc.text(`REF: ${q.estimate_uid}`, 15, 78);
        doc.text(`DATE: ${format(new Date(q.created_at), 'PPP')}`, 15, 83);
        doc.text(`VALID UNTIL: ${format(new Date(q.valid_until), 'PPP')}`, 15, 88);

        // 4. CLIENT IDENTITY (Deep Pull)
        doc.setFillColor(248, 250, 252); doc.rect(15, 95, 180, 35, 'F');
        doc.setFont("helvetica", "bold"); doc.text("BILL TO / CLIENT:", 20, 103);
        doc.setFont("helvetica", "normal");
        doc.text(q.client_name, 20, 108);
        doc.text(`${meta.clientEmail || ''} | ${meta.clientPhone || ''}`, 20, 114);
        doc.text(`Location: ${meta.clientLocation || 'N/A'}`, 20, 120);

        // 5. LINE ITEMS TABLE
        autoTable(doc, {
            startY: 135,
            head: [['#', 'Description & Specifications', 'Qty', 'Rate', 'Total']],
            body: q.items.map((it: any, i: number) => [
                i + 1,
                { content: `${it.description}`, styles: { fontSize: 8, cellPadding: 3 } },
                it.quantity,
                `${q.currency_code} ${it.unit_price.toLocaleString()}`,
                `${q.currency_code} ${it.total.toLocaleString()}`
            ]),
            headStyles: { fillColor: primaryRGB, textColor: [255, 255, 255] },
            theme: 'grid', margin: { left: 15, right: 15 }
        });

        // 6. VALUATION SUMMARY
        let finalY = (doc as any).lastAutoTable.finalY + 10;
        const snap = meta.totals_snapshot || {};
        doc.setFontSize(10);
        doc.text("Sub-total:", 140, finalY);
        doc.text(`${q.currency_code} ${snap.subTotal?.toLocaleString() || q.total_amount.toLocaleString()}`, 195, finalY, { align: 'right' });
        
        doc.text(`Tax (${meta.taxRate || 0}%):`, 140, finalY + 7);
        doc.text(`+${q.currency_code} ${snap.taxAmount?.toLocaleString() || 0}`, 195, finalY + 7, { align: 'right' });

        doc.setFillColor(primaryRGB[0], primaryRGB[1], primaryRGB[2]);
        doc.rect(130, finalY + 12, 70, 12, 'F');
        doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold");
        doc.text("TOTAL DUE:", 135, finalY + 20);
        doc.text(`${q.currency_code} ${q.total_amount.toLocaleString()}`, 195, finalY + 20, { align: 'right' });

        // 7. SETTLEMENT & TERMS
        doc.setTextColor(textRGB[0], textRGB[1], textRGB[2]);
        doc.setFontSize(9); doc.text("SETTLEMENT PROTOCOLS:", 15, finalY + 45);
        doc.setFontSize(8); doc.setFont("helvetica", "normal");
        doc.text(`Bank: ${meta.bankDetails || 'N/A'}`, 15, finalY + 51);
        doc.text(`MOMO/Digital: ${meta.momoDetails || 'N/A'}`, 15, finalY + 56);
        doc.text(`Beneficiary: ${meta.chequesPayableTo || 'N/A'}`, 15, finalY + 61);

        doc.setFont("helvetica", "bold"); doc.text("TERMS & CONDITIONS:", 15, finalY + 75);
        doc.setFont("helvetica", "normal");
        const terms = doc.splitTextToSize(meta.termsAndConditions || 'Standard terms apply.', 175);
        doc.text(terms, 15, finalY + 80);

        // 8. AUTHORIZATION SEAL
        const footerY = 275;
        doc.line(15, footerY, 70, footerY);
        doc.setFontSize(9); doc.setFont("helvetica", "bold");
        doc.text(meta.ceoName || 'Authorized Official', 15, footerY + 5);
        doc.setFontSize(8); doc.setFont("helvetica", "normal");
        doc.text(meta.ceoDesignation || 'Management', 15, footerY + 10);

        if (meta.branding?.receipt_footer) {
            doc.setFontSize(7); doc.setTextColor(150, 150, 150);
            doc.text(meta.branding.receipt_footer, 105, 290, { align: 'center' });
        }

        doc.save(`Record_${q.estimate_uid}.pdf`);
    };

    if (isLoading) return (
        <div className="flex flex-col items-center justify-center min-h-[400px] bg-white gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Synchronizing Records</p>
        </div>
    );

    return (
        <div className="min-h-screen bg-white">
            <div className="max-w-[1400px] mx-auto py-8 px-4 md:px-8 space-y-8 animate-in fade-in duration-500">
                
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-slate-50 pb-6">
                    <div className="space-y-3">
                        <button 
                            onClick={() => router.back()}
                            className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-blue-600 transition-colors"
                        >
                            <ArrowLeft size={12} /> Return
                        </button>
                        
                        <div className="flex items-center gap-4">
                            <div className="p-2.5 bg-slate-900 rounded-lg text-white shadow-md">
                                <FileText size={20} />
                            </div>
                            <div className="space-y-0.5">
                                <div className="flex items-center gap-3">
                                    <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">Quotation Registry</h1>
                                    <Badge variant="outline" className="rounded-full px-3 py-0.5 bg-blue-50 text-blue-600 font-bold text-[8px] uppercase tracking-wider border-none">
                                        History Ledger
                                    </Badge>
                                </div>
                                <p className="text-xs font-medium text-slate-500">
                                    Manage historical estimates and approval workflows.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="hidden lg:flex items-center gap-3 bg-slate-50 border border-slate-100 px-5 py-3 rounded-xl">
                            <div className="p-1.5 bg-white text-emerald-500 rounded-lg shadow-sm">
                                <ShieldCheck size={16} />
                            </div>
                            <div className="space-y-0.5">
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Status</p>
                                <p className="text-xs font-bold text-slate-800">Operational</p>
                            </div>
                        </div>

                        <Button 
                            onClick={() => router.push('/invoicing/estimates/new')}
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700 h-10 px-6 rounded-lg shadow-md font-bold text-[10px] uppercase tracking-widest gap-2 transition-all active:scale-95"
                        >
                            <Plus size={16} /> New Entry
                        </Button>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="flex flex-col md:flex-row gap-4 bg-slate-50/50 p-4 rounded-xl border border-slate-100 items-center justify-between">
                        <div className="flex flex-1 gap-3 w-full">
                            <div className="relative flex-1 max-w-sm">
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                                <Input 
                                    placeholder="Filter by client or ID..." 
                                    value={search} 
                                    onChange={e => setSearch(e.target.value)} 
                                    className="pl-10 h-10 bg-white border-slate-200 rounded-lg text-xs font-medium focus:ring-1 focus:ring-blue-500"
                                />
                            </div>
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="w-48 h-10 bg-white border-slate-200 rounded-lg font-bold text-[10px] uppercase tracking-wider px-4">
                                    <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent className="rounded-lg border-slate-200 shadow-xl">
                                    <SelectItem value="ALL" className="text-xs font-bold py-2">ALL RECORDS</SelectItem>
                                    <SelectItem value="PENDING" className="text-xs font-bold py-2">PENDING</SelectItem>
                                    <SelectItem value="APPROVED" className="text-xs font-bold py-2 text-emerald-600">VERIFIED</SelectItem>
                                    <SelectItem value="ACCEPTED" className="text-xs font-bold py-2 text-blue-600">FISCALIZED</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        
                        <div className="hidden md:flex items-center gap-6 px-6 border-l border-slate-200">
                            <div className="text-right">
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Registry Nodes</p>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                    <span className="text-sm font-bold text-slate-900">{filteredQuotes?.length || 0}</span>
                                    <Activity size={12} className="text-blue-500" />
                                </div>
                            </div>
                        </div>
                    </div>

                    <Card className="rounded-xl border border-slate-100 shadow-sm overflow-hidden bg-white">
                        <ScrollArea className="w-full">
                            <Table>
                                <TableHeader className="bg-slate-50">
                                    <TableRow className="h-12 border-none">
                                        <TableHead className="w-[180px] pl-6 font-bold text-[9px] uppercase text-slate-500 tracking-wider">Reference</TableHead>
                                        <TableHead className="font-bold text-[9px] uppercase text-slate-500 tracking-wider">Client Identity</TableHead>
                                        <TableHead className="text-right font-bold text-[9px] uppercase text-slate-500 tracking-wider">Net Valuation</TableHead>
                                        <TableHead className="text-center font-bold text-[9px] uppercase text-slate-500 tracking-wider">Status</TableHead>
                                        <TableHead className="text-right pr-6 font-bold text-[9px] uppercase text-slate-500 tracking-wider">Operations</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredQuotes?.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="h-48 text-center">
                                                <div className="flex flex-col items-center gap-2 opacity-30">
                                                    <FileText size={32} className="text-slate-400" />
                                                    <p className="font-bold text-[10px] uppercase tracking-widest text-slate-500">No records found</p>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredQuotes?.map((q: any) => (
                                            <TableRow key={q.id} className="group hover:bg-slate-50/50 transition-all border-b last:border-none">
                                                <TableCell className="pl-6 py-4">
                                                    <div className="font-bold text-blue-600 text-xs uppercase tracking-wide">{q.estimate_uid}</div>
                                                    <div className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">
                                                        {format(new Date(q.created_at), 'dd MMM yyyy')}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="font-bold text-slate-800 text-xs">{q.client_name}</div>
                                                    <div className="text-[10px] text-slate-400 font-medium mt-0.5 truncate max-w-xs">{q.title}</div>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="font-bold text-slate-900 text-xs tabular-nums">${q.total_amount.toLocaleString()}</div>
                                                    <div className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">{q.currency_code}</div>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <Badge variant="outline" className={`rounded-full px-3 py-0.5 font-bold text-[8px] uppercase tracking-wider border-none shadow-none ${
                                                        q.status === 'PENDING' ? 'bg-amber-50 text-amber-600' :
                                                        q.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-600' :
                                                        q.status === 'ACCEPTED' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'
                                                    }`}>
                                                        {q.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right pr-6">
                                                    <div className="flex justify-end gap-2">
                                                        {q.status === 'PENDING' && (
                                                            <Button 
                                                                size="sm" 
                                                                onClick={() => updateStatus.mutate({ id: q.id, status: 'APPROVED' })} 
                                                                className="h-8 bg-emerald-600 hover:bg-emerald-700 rounded-lg font-bold text-[9px] uppercase tracking-widest px-4"
                                                            >
                                                                Verify
                                                            </Button>
                                                        )}
                                                        {q.status === 'APPROVED' && (
                                                            <Button 
                                                                size="sm" 
                                                                onClick={() => convertToInvoice.mutate(q.id)} 
                                                                className="h-8 bg-blue-600 hover:bg-blue-700 rounded-lg font-bold text-[9px] uppercase tracking-widest px-4 gap-1.5"
                                                            >
                                                                <ArrowRightLeft size={12}/> Fiscalize
                                                            </Button>
                                                        )}
                                                        <Button 
                                                            variant="ghost" 
                                                            size="icon" 
                                                            onClick={() => printQuotation(q)} 
                                                            className="h-8 w-8 text-slate-300 hover:text-blue-600 rounded-lg transition-all"
                                                        >
                                                            <Printer size={16} />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                            <ScrollBar orientation="horizontal" />
                        </ScrollArea>
                    </Card>
                </div>
            </div>

            <footer className="pt-12 pb-10 flex flex-col items-center gap-2 opacity-30 border-t border-slate-50">
                <div className="flex items-center gap-3 text-[9px] font-bold text-slate-500 uppercase tracking-[0.4em]">
                    <Activity size={12} /> Node: QT-HIST-LE-09
                </div>
                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Data Synchronization active</p>
            </footer>
        </div>
    );
}