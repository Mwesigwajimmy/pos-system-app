'use client';

/**
 * --- INSTALLMENT PLAN TERMINAL ---
 * Use: Processing 'Buy Now Pay Later' sales with automated schedule generation.
 * Logic: Calculates deposit, splits balance, and populates the payment_installments registry.
 */

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { 
    Calculator, CalendarClock, UserPlus, 
    ArrowRight, Loader2, Receipt, 
    CheckCircle2, DollarSign, ListChecks
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { addMonths, format } from 'date-fns';

const supabase = createClient();

export default function InstallmentPlanManager() {
    const queryClient = useQueryClient();
    
    // FORM STATE
    const [customerId, setCustomerId] = useState("");
    const [totalAmount, setTotalAmount] = useState(0);
    const [deposit, setDeposit] = useState(0);
    const [months, setMonths] = useState(3);

    // 1. DATA: Fetch Registered Customers
    const { data: customers } = useQuery({
        queryKey: ['customers_for_installments'],
        queryFn: async () => {
            const { data, error } = await supabase.from('customers').select('id, name').eq('is_active', true);
            if (error) throw error;
            return data;
        }
    });

    // 2. MATH: Live Schedule Preview
    const schedulePreview = useMemo(() => {
        const balance = totalAmount - deposit;
        if (balance <= 0) return [];
        
        const perMonth = balance / months;
        return Array.from({ length: months }).map((_, i) => ({
            date: format(addMonths(new Date(), i + 1), 'yyyy-MM-dd'),
            amount: perMonth
        }));
    }, [totalAmount, deposit, months]);

    // 3. MUTATION: Save Sale & Generate Schedule in DB
    const planMutation = useMutation({
        mutationFn: async () => {
            const { error } = await supabase.rpc('proc_create_installment_sale', {
                p_customer_id: customerId,
                p_total_sale: totalAmount,
                p_deposit: deposit,
                p_months: months,
                p_schedule: schedulePreview
            });
            if (error) throw error;
        },
        onSuccess: () => {
            toast.success("Installment Plan Activated Successfully.");
            setTotalAmount(0); setDeposit(0); setCustomerId("");
        },
        onError: (err: any) => toast.error("Math Violation: " + err.message)
    });

    return (
        <div className="max-w-[1200px] mx-auto space-y-10 animate-in fade-in duration-1000">
            <header className="border-b border-slate-100 pb-8">
                <h1 className="text-4xl font-bold text-slate-900 tracking-tight flex items-center gap-4">
                    <CalendarClock className="text-blue-600" size={36} /> Installment Plan Manager
                </h1>
                <p className="text-sm font-medium text-slate-500 mt-2 uppercase tracking-widest">Revenue Schedule & Debt Control Hub</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                
                {/* CONFIGURATION COLUMN */}
                <div className="lg:col-span-4 space-y-6">
                    <Card className="border-slate-200 shadow-xl rounded-[2.5rem] bg-white p-8 space-y-6">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-bold text-slate-400 uppercase">Debtor Selection</Label>
                            <Select value={customerId} onValueChange={setCustomerId}>
                                <SelectTrigger className="h-12 border-slate-200 rounded-xl font-bold">
                                    <SelectValue placeholder="Identify Customer" />
                                </SelectTrigger>
                                <SelectContent>
                                    {customers?.map(c => <SelectItem key={c.id} value={c.id} className="font-bold">{c.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-[10px] font-bold text-slate-400 uppercase">Total Sale Value</Label>
                            <Input type="number" value={totalAmount} onChange={(e) => setTotalAmount(Number(e.target.value))} className="h-12 border-slate-200 rounded-xl font-black text-lg" />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-[10px] font-bold text-slate-400 uppercase">Initial Deposit Collected</Label>
                            <Input type="number" value={deposit} onChange={(e) => setDeposit(Number(e.target.value))} className="h-12 border-slate-200 rounded-xl font-black text-lg text-emerald-600" />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-[10px] font-bold text-slate-400 uppercase">Repayment Window (Months)</Label>
                            <Input type="number" value={months} onChange={(e) => setMonths(Number(e.target.value))} className="h-12 border-slate-200 rounded-xl font-black" />
                        </div>

                        <Button 
                            onClick={() => planMutation.mutate()} 
                            disabled={planMutation.isPending || !customerId || totalAmount <= 0}
                            className="w-full h-16 bg-slate-900 hover:bg-black text-white font-bold rounded-2xl shadow-2xl transition-all uppercase tracking-widest text-xs"
                        >
                            {planMutation.isPending ? <Loader2 className="animate-spin" /> : "Authorize & Generate Plan"}
                        </Button>
                    </Card>
                </div>

                {/* SCHEDULE PREVIEW COLUMN */}
                <div className="lg:col-span-8">
                    <Card className="border-slate-100 shadow-sm rounded-[2.5rem] bg-slate-50/50 overflow-hidden h-full">
                        <CardHeader className="p-8 border-b border-slate-100 bg-white">
                            <div className="flex justify-between items-baseline">
                                <CardTitle className="text-xl font-bold text-slate-900">Payment Projection</CardTitle>
                                <div className="text-right">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase">Residual Balance</p>
                                    <p className="text-2xl font-black text-blue-600 tracking-tighter">{(totalAmount - deposit).toLocaleString()}</p>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-8">
                            <div className="space-y-4">
                                {schedulePreview.length === 0 ? (
                                    <div className="py-20 text-center text-slate-300 font-bold uppercase text-xs">Enter sale details to project schedule</div>
                                ) : (
                                    schedulePreview.map((item, idx) => (
                                        <div key={idx} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex justify-between items-center animate-in slide-in-from-right-4">
                                            <div className="flex items-center gap-4">
                                                <Badge className="bg-slate-100 text-slate-500 font-bold border-none h-8 w-8 flex items-center justify-center rounded-lg">{idx + 1}</Badge>
                                                <div>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Due Date</p>
                                                    <p className="text-sm font-bold text-slate-900 mt-1">{item.date}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Installment Amount</p>
                                                <p className="text-lg font-black text-slate-900 tabular-nums mt-1">{item.amount.toLocaleString()}</p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

            </div>
        </div>
    );
}