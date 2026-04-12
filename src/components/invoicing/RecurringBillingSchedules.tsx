'use client';

import React, { useState } from 'react';
import { 
    CalendarDays, 
    Clock, 
    CheckCircle2, 
    ArrowRight, 
    TrendingUp, 
    Plus, 
    X, 
    Loader2, 
    ShieldCheck 
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

interface Schedule {
    schedule_id: string;
    plan_name: string;
    billing_frequency: string;
    days_until_next_run: number;
    confidence_score: number;
    is_active_status: boolean;
}

interface InvoiceTemplate {
    id: number;
    invoice_number: string | null;
    total_amount: number;
    currency: string;
    customer_name: string | null;
}

interface ComponentProps {
    schedules: Schedule[];
    activeCount: number;
    availableTemplates: InvoiceTemplate[];
}

export default function RecurringBillingSchedules({ 
    schedules, 
    activeCount, 
    availableTemplates = [] 
}: ComponentProps) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const router = useRouter();
    const supabase = createClient();

    // Sovereign Terminal Form State
    const [templateId, setTemplateId] = useState('');
    const [frequency, setFrequency] = useState('MONTHLY');
    const [billingDay, setBillingDay] = useState(1);

    const handleCreateProtocol = async () => {
        if (!templateId) return;
        setIsSubmitting(true);
        
        const { data: { user } } = await supabase.auth.getUser();
        
        // EXECUTE ENTERPRISE RPC
        const { error } = await supabase.rpc('create_sovereign_billing_schedule', {
            p_user_id: user?.id,
            p_template_invoice_id: parseInt(templateId),
            p_frequency: frequency,
            p_billing_day: billingDay
        });

        if (!error) {
            setIsModalOpen(false);
            setTemplateId('');
            router.refresh(); // Automatically updates the 'activeCount' and the list
        } else {
            console.error("Protocol Error:", error.message);
        }
        setIsSubmitting(false);
    };

    return (
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm flex flex-col h-full animate-in fade-in duration-500">
            {/* Header section - Original Design Preserved */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 rounded-lg">
                        <CalendarDays className="text-blue-600" size={20} />
                    </div>
                    <div>
                        <h2 className="text-base font-bold text-slate-900">Automated Billing</h2>
                        <p className="text-[10px] text-slate-500 font-medium uppercase tracking-tight">Recurring Schedules</p>
                    </div>
                </div>
                <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-100 font-bold text-[10px] px-2.5 py-0.5 uppercase">
                    {activeCount} Active
                </Badge>
            </div>

            {/* List of Schedules - Dynamic Mapping Preserved */}
            <div className="space-y-3 flex-1 overflow-y-auto max-h-[400px] pr-1">
                {schedules.length === 0 ? (
                    <div className="text-center py-12 border-2 border-dashed border-slate-100 rounded-2xl bg-slate-50/30">
                        <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest">No active protocols detected.</p>
                    </div>
                ) : (
                    schedules.map((item) => (
                        <div key={item.schedule_id} className="p-4 bg-white rounded-xl border border-slate-100 hover:border-blue-500 shadow-sm transition-all cursor-pointer group">
                            <div className="flex justify-between items-start">
                                <div className="space-y-1">
                                    <h4 className="font-bold text-slate-900 text-sm">{item.plan_name}</h4>
                                    <div className="flex items-center gap-2">
                                        <Clock size={12} className="text-slate-400" />
                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                            Frequency: {item.billing_frequency}
                                        </span>
                                    </div>
                                </div>
                                <ArrowRight size={14} className="text-slate-300 opacity-0 group-hover:opacity-100 group-hover:text-blue-600 transition-all -translate-x-2 group-hover:translate-x-0" />
                            </div>
                            
                            <div className="mt-4 pt-3 border-t border-slate-50 flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                    <TrendingUp size={10} className="text-emerald-500" />
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">
                                        Est. Collection: {item.days_until_next_run <= 0 ? 'Today' : `in ${item.days_until_next_run} days`}
                                    </span>
                                </div>
                                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${Number(item.confidence_score) > 90 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                                    {Number(item.confidence_score)}% Confidence
                                </span>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* ACTION: Now opens the Creation Terminal */}
            <Button 
                onClick={() => setIsModalOpen(true)}
                className="mt-6 h-11 w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold uppercase text-[11px] tracking-widest shadow-sm transition-all active:scale-95 flex items-center justify-center gap-2"
            >
                <Plus size={16} /> New Billing Schedule
            </Button>

            {/* MODAL: SOVEREIGN BILLING TERMINAL */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 backdrop-blur-md animate-in fade-in duration-300 px-4">
                    <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-white/20 overflow-hidden animate-in zoom-in-95">
                        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <div>
                                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Initialization</h3>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Revenue Flow Setup</p>
                            </div>
                            <button 
                                onClick={() => setIsModalOpen(false)} 
                                className="p-2.5 bg-white border border-slate-200 rounded-full hover:bg-slate-100 transition-colors shadow-sm"
                            >
                                <X size={18} />
                            </button>
                        </div>
                        
                        <div className="p-8 space-y-6">
                            <div className="space-y-5">
                                <div>
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.15em] mb-2 block">Master Document (Template)</label>
                                    <select 
                                        value={templateId} 
                                        onChange={(e) => setTemplateId(e.target.value)}
                                        className="w-full h-12 bg-slate-50 border-2 border-slate-100 rounded-xl px-4 text-sm font-bold text-slate-900 focus:border-blue-600 focus:outline-none transition-all appearance-none cursor-pointer"
                                    >
                                        <option value="">Select Existing Invoice...</option>
                                        {availableTemplates.map(t => (
                                            <option key={t.id} value={t.id}>
                                                {t.invoice_number || `#${t.id}`} — {t.customer_name || 'Client'} ({t.total_amount.toLocaleString()} {t.currency})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.15em] mb-2 block">Cycle Frequency</label>
                                        <select 
                                            value={frequency}
                                            onChange={(e) => setFrequency(e.target.value)}
                                            className="w-full h-12 bg-slate-50 border-2 border-slate-100 rounded-xl px-4 text-sm font-bold text-slate-900 uppercase focus:border-blue-600 focus:outline-none"
                                        >
                                            <option value="WEEKLY">Weekly</option>
                                            <option value="MONTHLY">Monthly</option>
                                            <option value="QUARTERLY">Quarterly</option>
                                            <option value="ANNUALLY">Annually</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.15em] mb-2 block">Execution Day</label>
                                        <input 
                                            type="number" 
                                            min="1" 
                                            max="31"
                                            value={billingDay}
                                            onChange={(e) => setBillingDay(parseInt(e.target.value))}
                                            className="w-full h-12 bg-slate-50 border-2 border-slate-100 rounded-xl px-4 text-sm font-bold text-slate-900 focus:border-blue-600 focus:outline-none" 
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="p-5 bg-blue-50/50 rounded-2xl border border-blue-100 flex items-start gap-4">
                                <ShieldCheck className="text-blue-600 mt-1 shrink-0" size={18} />
                                <p className="text-[11px] text-blue-900 font-bold leading-relaxed uppercase">
                                    System logic will clone this master document on the chosen cycle. Multi-currency drift monitoring and statutory compliance will be applied automatically to all generated items.
                                </p>
                            </div>
                        </div>

                        <div className="p-8 bg-slate-50/50 border-t border-slate-100 flex gap-4">
                            <Button 
                                variant="ghost" 
                                onClick={() => setIsModalOpen(false)} 
                                className="flex-1 h-12 font-black uppercase text-[10px] tracking-widest text-slate-400"
                            >
                                Abort
                            </Button>
                            <Button 
                                onClick={handleCreateProtocol}
                                disabled={!templateId || isSubmitting}
                                className="flex-1 h-12 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase text-[10px] tracking-widest shadow-xl disabled:opacity-50"
                            >
                                {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : 'Commit Protocol'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Verified status footer - Design Preserved */}
            <div className="mt-4 pt-4 border-t border-slate-100 text-center">
                <div className="flex items-center justify-center gap-2 text-[9px] font-bold text-slate-300 uppercase tracking-widest">
                    <CheckCircle2 size={10} className="text-emerald-500" /> Predictive Ledger Active
                </div>
            </div>
        </div>
    );
}