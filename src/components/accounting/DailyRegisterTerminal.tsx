'use client';

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { 
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
    ShieldCheck, Unlock, Loader2, Landmark, Calculator, 
    Printer, Fingerprint, Receipt, Banknote, Coins
} from "lucide-react";
import { toast } from 'sonner';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Deep Context Hooks
import { useTenant } from '@/hooks/useTenant';
import { useUserProfile } from '@/hooks/useUserProfile';
import { cn, formatCurrency } from '@/lib/utils';

const supabase = createClient();

export default function DailyRegisterTerminal({ isOpen, onOpenChange }: { isOpen: boolean, onOpenChange: (open: boolean) => void }) {
    const queryClient = useQueryClient();
    const { data: tenant } = useTenant();
    const { data: profile } = useUserProfile();
    
    // Form State
    const [counts, setCounts] = useState<Record<string, number>>({});
    const [pettyCashAmount, setPettyCashAmount] = useState(0);
    const [notes, setNotes] = useState('');

    // 1. DATA: Fetch standard currency denominations for this branch
    const { data: denominations, isLoading: isDenomsLoading } = useQuery({
        queryKey: ['system_denominations', tenant?.reporting_currency],
        queryFn: async () => {
            const { data } = await supabase.rpc('get_currency_denominations', { 
                p_currency_code: tenant?.reporting_currency || 'UGX' 
            });
            return data || [];
        },
        enabled: !!tenant?.reporting_currency
    });

    // 2. Calculation: Real-time total of counted cash
    const openingTotal = useMemo(() => {
        if (!denominations) return 0;
        return denominations.reduce((sum: number, d: any) => {
            const qty = counts[d.id] || 0;
            return sum + (qty * d.face_value);
        }, 0);
    }, [denominations, counts]);

    // 3. MUTATION: Official Register Opening
    const openRegister = useMutation({
        mutationFn: async () => {
            const denomPayload = denominations.map((d: any) => ({
                id: d.id,
                qty: counts[d.id] || 0,
                subtotal: (counts[d.id] || 0) * d.face_value
            })).filter((i: any) => i.qty > 0);

            const { data, error } = await supabase.rpc('proc_initialize_daily_node', {
                p_opening_total: openingTotal,
                p_float_allocation: pettyCashAmount,
                p_notes: notes,
                p_denominations: denomPayload
            });
            if (error) throw error;
            return data;
        },
        onSuccess: (sessionId) => {
            toast.success("Daily Register Opened Successfully");
            generateVerificationPDF(sessionId);
            queryClient.invalidateQueries({ queryKey: ['active_ledger_session'] });
            onOpenChange(false);
            // Reset states
            setCounts({});
            setPettyCashAmount(0);
            setNotes('');
        },
        onError: (e: any) => toast.error(`Authorization Failed: ${e.message}`)
    });

    // --- OFFICIAL PDF RECEIPT GENERATION ---
    const generateVerificationPDF = (sessionId: string) => {
        const doc = new jsPDF();
        const dateStr = format(new Date(), 'dd MMMM yyyy HH:mm');
        
        doc.setFontSize(20); doc.setTextColor(15, 23, 42);
        doc.text("DAILY CASH OPENING REPORT", 14, 25);
        
        doc.setFontSize(9); doc.setTextColor(100);
        doc.text(`Business Unit: ${tenant?.business_display_name}`, 14, 33);
        doc.text(`Recorded By: ${profile?.full_name}`, 14, 38);
        doc.text(`Session ID: #REF-${sessionId.substring(0,8).toUpperCase()}`, 14, 43);
        doc.text(`Date & Time: ${dateStr}`, 14, 48);

        autoTable(doc, {
            startY: 55,
            head: [['Denomination', 'Quantity', 'Subtotal']],
            body: denominations.filter((d:any) => (counts[d.id] || 0) > 0).map((d:any) => [
                d.label, counts[d.id], formatCurrency(counts[d.id] * d.face_value, tenant?.reporting_currency!)
            ]),
            theme: 'striped',
            headStyles: { fillColor: [15, 23, 42] }
        });

        const finalY = (doc as any).lastAutoTable.finalY + 15;
        doc.setFont("helvetica", "bold");
        doc.text(`TOTAL STARTING CASH: ${formatCurrency(openingTotal, tenant?.reporting_currency!)}`, 110, finalY);
        doc.text(`PETTY CASH FUND: ${formatCurrency(pettyCashAmount, tenant?.reporting_currency!)}`, 110, finalY + 7);

        doc.setFontSize(8); doc.setTextColor(150);
        doc.text("LITONU Business Systems • Official Audit Record", 14, finalY + 30);
        doc.save(`Cash_Opening_${tenant?.business_display_name}_${format(new Date(), 'yyyyMMdd')}.pdf`);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden bg-white">
                <div className="bg-slate-900 p-10 text-white flex justify-between items-center">
                    <div className="space-y-1">
                        <div className="flex items-center gap-3">
                            <div className="h-12 w-12 bg-white/10 rounded-2xl flex items-center justify-center">
                                <Unlock className="text-emerald-400 h-6 w-6" />
                            </div>
                            <h2 className="text-2xl font-bold uppercase tracking-tight">Open Daily Register</h2>
                        </div>
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest ml-1">Cash Verification: {tenant?.reporting_currency}</p>
                    </div>
                    <div className="text-right">
                         <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Business Day Sync</span>
                         <div className="mt-1.5 h-2 w-2 rounded-full bg-emerald-500 ml-auto animate-pulse" />
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
                    {/* LEFT: PHYSICAL CASH COUNT */}
                    <div className="p-8 bg-slate-50/50 border-r border-slate-100">
                        <div className="flex items-center gap-2 mb-6">
                            <Banknote size={16} className="text-blue-600" />
                            <Label className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Note & Coin Count</Label>
                        </div>
                        <ScrollArea className="h-[400px] pr-4">
                            <div className="space-y-3">
                                {isDenomsLoading ? (
                                    <div className="py-20 text-center"><Loader2 className="animate-spin h-6 w-6 mx-auto text-blue-200" /></div>
                                ) : (
                                    denominations?.map((d: any) => (
                                        <div key={d.id} className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-100 hover:border-blue-200 transition-colors">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-bold text-slate-700">{d.label}</span>
                                                <span className="text-[9px] font-semibold text-slate-400">Value: {d.face_value.toLocaleString()}</span>
                                            </div>
                                            <Input 
                                                type="number" 
                                                placeholder="0"
                                                className="w-20 h-9 rounded-lg border-slate-200 text-center font-bold text-sm focus:ring-2 focus:ring-blue-500 bg-slate-50/30"
                                                value={counts[d.id] || ''}
                                                onChange={(e) => setCounts({...counts, [d.id]: parseInt(e.target.value) || 0})}
                                            />
                                        </div>
                                    ))
                                )}
                            </div>
                        </ScrollArea>
                    </div>

                    {/* RIGHT: SUMMARY & PETTY CASH */}
                    <div className="p-8 space-y-8 bg-white">
                        <div className="p-8 bg-slate-900 rounded-[2rem] text-center shadow-lg">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Calculated Total</p>
                            <p className="text-3xl font-bold text-emerald-400 tabular-nums">
                                {openingTotal.toLocaleString()} <span className="text-xs text-slate-500 ml-1">{tenant?.reporting_currency}</span>
                            </p>
                        </div>

                        <div className="space-y-6">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                    <Coins size={14} className="text-blue-500" /> Daily Petty Cash Fund
                                </Label>
                                <Input 
                                    type="number" 
                                    value={pettyCashAmount} 
                                    onChange={e => setPettyCashAmount(Number(e.target.value))} 
                                    className="h-14 rounded-2xl bg-slate-50 border-none font-bold text-2xl px-6 focus:ring-2 focus:ring-blue-500 shadow-inner" 
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Opening Remarks / Notes</Label>
                                <Input 
                                    value={notes} 
                                    onChange={e => setNotes(e.target.value)} 
                                    placeholder="Optional shift notes..." 
                                    className="h-12 rounded-xl bg-slate-50 border-none font-semibold text-sm px-4 shadow-inner" 
                                />
                            </div>
                        </div>

                        <div className="pt-4">
                            <Button 
                                onClick={() => openRegister.mutate()} 
                                disabled={openRegister.isPending || (openingTotal === 0 && pettyCashAmount === 0)} 
                                className="w-full h-16 bg-blue-600 hover:bg-blue-700 text-white font-bold uppercase tracking-widest rounded-2xl shadow-xl transition-all active:scale-[0.98]"
                            >
                                {openRegister.isPending ? <Loader2 className="animate-spin h-5 w-5 mr-3"/> : <ShieldCheck size={20} className="mr-3"/>}
                                Confirm & Open Register
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="p-6 bg-slate-50/50 border-t flex items-center justify-between opacity-60">
                    <div className="flex items-center gap-2 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                        <Fingerprint size={14} className="text-slate-300" /> Secure Register Protocol: Active
                    </div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase">© {new Date().getFullYear()} LITONU BUSINESS SYSTEMS</p>
                </div>
            </DialogContent>
        </Dialog>
    );
}