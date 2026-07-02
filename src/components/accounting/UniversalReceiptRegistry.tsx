'use client';

/**
 * --- UNIVERSAL RECEIPT REGISTRY ---
 * VERSION: v1.0 PROFESSIONAL
 * Use: Audit hub for viewing, searching, and reprinting all system receipts.
 * Logic: Snapshot integrity with automated reprint watermarking.
 */

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { 
    Search, Printer, FileText, Loader2, 
    Filter, ArrowLeftRight, CheckCircle2,
    AlertCircle, Download, History, BadgeCheck
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

export default function UniversalReceiptRegistry() {
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState("");
    const [isPrinting, setIsPrinting] = useState<string | null>(null);

    // 1. DATA FETCH: Pull all receipts (Sales & Payments)
    const { data: records, isLoading } = useQuery({
        queryKey: ['financial_receipt_registry'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('sales')
                .select(`
                    id, 
                    created_at, 
                    total_amount, 
                    customer_name, 
                    invoice_number, 
                    currency_code,
                    reprint_count,
                    status
                `)
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data;
        }
    });

    // 2. MUTATION: Logic to handle the Reprint Audit Trail
    const logReprint = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.rpc('increment_receipt_reprint_count', { p_sale_id: id });
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['financial_receipt_registry'] });
        }
    });

    // 3. REPRINT ENGINE (PDF Generation with Security Stamp)
    const handleReprint = async (receipt: any) => {
        setIsPrinting(receipt.id);
        
        const doc = new jsPDF();
        const isDuplicate = (receipt.reprint_count || 0) > 0;

        // --- SECURITY STAMP LOGIC ---
        if (isDuplicate) {
            doc.setFontSize(40);
            doc.setTextColor(240, 240, 240); // Very light grey
            doc.text("REPRINT DUPLICATE", 35, 150, { angle: 45 });
        }

        // --- CLEAN CORPORATE HEADER ---
        doc.setFontSize(20);
        doc.setTextColor(15, 23, 42);
        doc.text("OFFICIAL RECEIPT", 105, 20, { align: 'center' });
        
        doc.setFontSize(10);
        doc.text(`Reference: ${receipt.invoice_number}`, 14, 35);
        doc.text(`Original Date: ${format(new Date(receipt.created_at), 'PPP')}`, 14, 40);
        doc.text(`Customer: ${receipt.customer_name || 'Walk-in Client'}`, 14, 45);

        if (isDuplicate) {
            doc.setTextColor(220, 38, 38); // Professional Red
            doc.text(`REPRINT NO: ${receipt.reprint_count}`, 195, 35, { align: 'right' });
        }

        autoTable(doc, {
            startY: 55,
            head: [['Description', 'Amount']],
            body: [[`Payment for Order #${receipt.invoice_number}`, `${receipt.total_amount.toLocaleString()} ${receipt.currency_code}`]],
            headStyles: { fillColor: [15, 23, 42] }
        });

        // 4. Record the reprint in the database audit trail
        await logReprint.mutateAsync(receipt.id);
        
        doc.save(`Receipt_${receipt.invoice_number}.pdf`);
        toast.success("Receipt generated successfully.");
        setIsPrinting(null);
    };

    // FILTER LOGIC
    const filteredRecords = useMemo(() => {
        return records?.filter(r => 
            r.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            r.customer_name?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [records, searchTerm]);

    if (isLoading) return <div className="p-20 text-center"><Loader2 className="animate-spin mx-auto h-8 w-8 text-blue-600" /></div>;

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            {/* SEARCH & FILTER BAR */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input 
                        placeholder="Search by Receipt No. or Customer..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 h-11 border-slate-200 rounded-xl text-sm"
                    />
                </div>
                <div className="flex items-center gap-3">
                    <div className="text-right hidden sm:block">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Registry Items</p>
                        <p className="text-sm font-bold text-slate-900">{filteredRecords?.length || 0} Records</p>
                    </div>
                </div>
            </div>

            {/* THE LEDGER TABLE */}
            <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden bg-white">
                <Table>
                    <TableHeader className="bg-slate-50">
                        <TableRow className="h-12 border-none">
                            <TableHead className="pl-6 font-bold text-[10px] uppercase text-slate-500">Date & Reference</TableHead>
                            <TableHead className="font-bold text-[10px] uppercase text-slate-500">Customer Identity</TableHead>
                            <TableHead className="text-right font-bold text-[10px] uppercase text-slate-500">Net Value</TableHead>
                            <TableHead className="text-center font-bold text-[10px] uppercase text-slate-500">Audit Status</TableHead>
                            <TableHead className="pr-6 text-right font-bold text-[10px] uppercase text-slate-500">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredRecords?.map((r) => (
                            <TableRow key={r.id} className="hover:bg-slate-50/50 border-b last:border-none transition-colors">
                                <TableCell className="pl-6 py-4">
                                    <p className="font-bold text-slate-900 text-xs">{r.invoice_number || 'N/A'}</p>
                                    <p className="text-[10px] text-slate-400 font-medium">{format(new Date(r.created_at), 'dd MMM yyyy')}</p>
                                </TableCell>
                                <TableCell>
                                    <p className="text-sm font-semibold text-slate-800">{r.customer_name || 'Walk-in Customer'}</p>
                                </TableCell>
                                <TableCell className="text-right">
                                    <p className="font-bold text-slate-900 text-sm tabular-nums">{r.total_amount.toLocaleString()}</p>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">{r.currency_code}</p>
                                </TableCell>
                                <TableCell className="text-center">
                                    {r.reprint_count > 0 ? (
                                        <Badge variant="outline" className="text-[9px] font-bold border-amber-200 bg-amber-50 text-amber-600 uppercase px-2">
                                            Reprinted x{r.reprint_count}
                                        </Badge>
                                    ) : (
                                        <Badge variant="outline" className="text-[9px] font-bold border-emerald-100 bg-emerald-50 text-emerald-600 uppercase px-2">
                                            Original Issue
                                        </Badge>
                                    )}
                                </TableCell>
                                <TableCell className="pr-6 text-right">
                                    <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        onClick={() => handleReprint(r)}
                                        disabled={isPrinting === r.id}
                                        className="h-9 px-4 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition-all gap-2"
                                    >
                                        {isPrinting === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer size={16} />}
                                        <span className="text-[10px] font-bold uppercase tracking-widest">Reprint</span>
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Card>

            <div className="flex justify-center pt-10 opacity-20">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.4em]">Corporate Financial Registry node</p>
            </div>
        </div>
    );
}