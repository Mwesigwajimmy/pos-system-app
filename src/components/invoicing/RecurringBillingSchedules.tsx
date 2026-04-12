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
    ShieldCheck,
    Zap,
    Download,
    FileText,
    History,
    Activity,
    AlertCircle
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import toast from 'react-hot-toast';

// --- Interfaces ---
interface Schedule {
    schedule_id: string;
    plan_name: string;
    billing_frequency: string;
    days_until_next_run: number;
    confidence_score: number;
    is_active_status: boolean;
    // Enhanced Detail Fields
    template_invoice_id?: number;
    billing_day?: number;
    last_run_at?: string;
    next_run_at?: string;
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
    schedules = [], 
    activeCount = 0, 
    availableTemplates = [] 
}: ComponentProps) {
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const router = useRouter();
    const supabase = createClient();

    // Sovereign Terminal Form State
    const [templateId, setTemplateId] = useState('');
    const [frequency, setFrequency] = useState('MONTHLY');
    const [billingDay, setBillingDay] = useState(1);

    // --- Actions ---
    const handleCreateProtocol = async () => {
        if (!templateId) return;
        setIsSubmitting(true);
        const { data: { user } } = await supabase.auth.getUser();
        
        const { error } = await supabase.rpc('create_sovereign_billing_schedule', {
            p_user_id: user?.id,
            p_template_invoice_id: parseInt(templateId),
            p_frequency: frequency,
            p_billing_day: billingDay
        });

        if (!error) {
            toast.success("Revenue Protocol Established");
            setIsCreateModalOpen(false);
            setTemplateId('');
            router.refresh();
        } else {
            toast.error(error.message);
        }
        setIsSubmitting(false);
    };

    const openDetailTerminal = (schedule: Schedule) => {
        setSelectedSchedule(schedule);
        setIsDetailModalOpen(true);
    };

    // --- Professional PDF Protocol Generator ---
    const downloadSchedulePDF = (item: Schedule) => {
        const doc = new jsPDF();
        const template = availableTemplates.find(t => t.id === item.template_invoice_id);
        
        // 1. Header & Branding
        doc.setFontSize(22);
        doc.setTextColor(15, 23, 42);
        doc.text("REVENUE PROTOCOL MANDATE", 14, 22);
        
        doc.setFontSize(9);
        doc.setTextColor(100);
        doc.text(`Protocol ID: ${item.schedule_id.toUpperCase()}`, 14, 30);
        doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 35);

        // 2. Schedule Config
        autoTable(doc, {
            startY: 45,
            head: [['Configuration Key', 'Operational Value']],
            body: [
                ['Plan Identity', item.plan_name],
                ['Cycle Frequency', item.billing_frequency],
                ['Execution Day', `Day ${item.billing_day || 'N/A'}`],
                ['Collection Confidence', `${item.confidence_score}%`],
                ['Protocol Status', item.is_active_status ? 'ACTIVE' : 'SUSPENDED'],
                ['Next Execution', item.next_run_at ? new Date(item.next_run_at).toLocaleDateString() : 'Pending'],
            ],
            theme: 'striped',
            headStyles: { fillColor: [30, 41, 59] },
        });

        // 3. Template Invoice Data
        if (template) {
            const finalY = (doc as any).lastAutoTable.finalY;
            doc.setFontSize(12);
            doc.text("MASTER DOCUMENT REFERENCE", 14, finalY + 15);
            autoTable(doc, {
                startY: finalY + 20,
                body: [
                    ['Invoice Ref', template.invoice_number || 'N/A'],
                    ['Customer', template.customer_name || 'N/A'],
                    ['Value per Cycle', `${template.total_amount.toLocaleString()} ${template.currency}`],
                ],
            });
        }

        doc.save(`Revenue_Protocol_${item.schedule_id.substring(0,8)}.pdf`);
    };

    return (
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm flex flex-col h-full animate-in fade-in duration-500">
            {/* Header section */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 rounded-lg">
                        <CalendarDays className="text-blue-600" size={20} />
                    </div>
                    <div>
                        <h2 className="text-base font-bold text-slate-900 tracking-tight">Automated Billing</h2>
                        <p className="text-[10px] text-slate-500 font-medium uppercase tracking-tight">Active Recurring Cycles</p>
                    </div>
                </div>
                <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-100 font-bold text-[10px] px-2.5 py-0.5 uppercase">
                    {activeCount} Active
                </Badge>
            </div>

            {/* List of Schedules */}
            <div className="space-y-3 flex-1 overflow-y-auto max-h-[400px] pr-1 scrollbar-hide">
                {schedules.length === 0 ? (
                    <div className="text-center py-12 border-2 border-dashed border-slate-100 rounded-2xl bg-slate-50/30">
                        <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest">No active protocols detected.</p>
                    </div>
                ) : (
                    schedules.map((item) => (
                        <div 
                            key={item.schedule_id} 
                            onClick={() => openDetailTerminal(item)}
                            className="p-4 bg-white rounded-xl border border-slate-100 hover:border-blue-500 shadow-sm transition-all cursor-pointer group"
                        >
                            <div className="flex justify-between items-start">
                                <div className="space-y-1">
                                    <h4 className="font-bold text-slate-900 text-sm group-hover:text-blue-600 transition-colors">{item.plan_name}</h4>
                                    <div className="flex items-center gap-2">
                                        <Clock size={12} className="text-slate-400" />
                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                            {item.billing_frequency}
                                        </span>
                                    </div>
                                </div>
                                <div className="p-1.5 bg-slate-50 rounded-lg text-slate-300 group-hover:bg-blue-50 group-hover:text-blue-600 transition-all">
                                    <ArrowRight size={14} />
                                </div>
                            </div>
                            
                            <div className="mt-4 pt-3 border-t border-slate-50 flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                    <TrendingUp size={10} className="text-emerald-500" />
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">
                                        Settlement: {item.days_until_next_run <= 0 ? 'Due Today' : `in ${item.days_until_next_run} days`}
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

            <Button 
                onClick={() => setIsCreateModalOpen(true)}
                className="mt-6 h-12 w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black uppercase text-[11px] tracking-[0.2em] shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2"
            >
                <Plus size={16} className="mr-2" /> New Billing Schedule
            </Button>

            {/* --- MODAL 1: DETAIL TERMINAL (Audit View) --- */}
            {isDetailModalOpen && selectedSchedule && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-300 px-4">
                    <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-white/20 overflow-hidden animate-in zoom-in-95">
                        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <div className="flex items-center gap-4">
                                <div className="p-2.5 bg-slate-900 rounded-xl text-white">
                                    <Activity size={20} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Protocol Audit</h3>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Forensic Schedule View</p>
                                </div>
                            </div>
                            <button onClick={() => setIsDetailModalOpen(false)} className="p-2.5 bg-white border border-slate-200 rounded-full hover:bg-slate-100 transition-colors">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-6">
                                <div>
                                    <Label className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1 block">Plan Name</Label>
                                    <p className="text-lg font-bold text-slate-900">{selectedSchedule.plan_name}</p>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1 block">Cycle</Label>
                                        <p className="text-sm font-bold text-slate-700">{selectedSchedule.billing_frequency}</p>
                                    </div>
                                    <div>
                                        <Label className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1 block">Confidence</Label>
                                        <Badge className="bg-emerald-50 text-emerald-700 font-black text-[10px] border-none">{selectedSchedule.confidence_score}%</Badge>
                                    </div>
                                </div>
                                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase">Last Issued</span>
                                        <span className="text-xs font-mono font-bold text-slate-600">{selectedSchedule.last_run_at ? new Date(selectedSchedule.last_run_at).toLocaleDateString() : 'Never'}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase">Next Sync</span>
                                        <span className="text-xs font-mono font-bold text-blue-600 underline">{selectedSchedule.next_run_at ? new Date(selectedSchedule.next_run_at).toLocaleDateString() : 'Calculating...'}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="p-6 bg-blue-600 rounded-3xl text-white shadow-lg shadow-blue-500/20">
                                    <FileText className="mb-4 opacity-50" size={32} />
                                    <h4 className="text-xs font-black uppercase tracking-widest mb-1">Master Template</h4>
                                    {availableTemplates.find(t => t.id === selectedSchedule.template_invoice_id) ? (
                                        <div className="space-y-1">
                                            <p className="text-sm font-bold">{availableTemplates.find(t => t.id === selectedSchedule.template_invoice_id)?.customer_name}</p>
                                            <p className="text-2xl font-black tracking-tighter">
                                                {availableTemplates.find(t => t.id === selectedSchedule.template_invoice_id)?.total_amount.toLocaleString()} 
                                                <span className="text-xs ml-2 opacity-60">{availableTemplates.find(t => t.id === selectedSchedule.template_invoice_id)?.currency}</span>
                                            </p>
                                        </div>
                                    ) : (
                                        <p className="text-xs opacity-60 italic">Template data not loaded.</p>
                                    )}
                                </div>
                                <Button 
                                    onClick={() => downloadSchedulePDF(selectedSchedule)}
                                    className="w-full h-12 bg-white border-2 border-slate-100 text-slate-900 hover:bg-slate-50 font-bold uppercase text-[10px] tracking-widest gap-2 shadow-sm"
                                >
                                    <Download size={16} /> Download Mandate PDF
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- MODAL 2: INITIALIZATION TERMINAL (New) --- */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 backdrop-blur-md animate-in fade-in duration-300 px-4">
                    <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-white/20 overflow-hidden animate-in zoom-in-95">
                        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <div>
                                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Initialization</h3>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Revenue Flow Setup</p>
                            </div>
                            <button onClick={() => setIsCreateModalOpen(false)} className="p-2.5 bg-white border border-slate-200 rounded-full hover:bg-slate-100 transition-colors shadow-sm">
                                <X size={18} />
                            </button>
                        </div>
                        
                        <div className="p-8 space-y-6">
                            <div className="space-y-5">
                                <div>
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.15em] mb-2 block ml-1">Master Document (Invoice)</label>
                                    <select 
                                        value={templateId} 
                                        onChange={(e) => setTemplateId(e.target.value)}
                                        className="w-full h-12 bg-slate-50 border-2 border-slate-100 rounded-xl px-4 text-sm font-bold text-slate-900 focus:border-blue-600 focus:outline-none transition-all appearance-none cursor-pointer"
                                    >
                                        <option value="">Select Invoice...</option>
                                        {availableTemplates.map(t => (
                                            <option key={t.id} value={t.id}>
                                                {t.invoice_number || `#${t.id}`} — {t.customer_name || 'Client'} ({t.total_amount.toLocaleString()} {t.currency})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.15em] mb-2 block ml-1">Cycle Frequency</label>
                                        <select 
                                            value={frequency}
                                            onChange={(e) => setFrequency(e.target.value)}
                                            className="w-full h-12 bg-slate-50 border-2 border-slate-100 rounded-xl px-4 text-sm font-bold text-slate-900 uppercase"
                                        >
                                            <option value="WEEKLY">Weekly</option>
                                            <option value="MONTHLY">Monthly</option>
                                            <option value="QUARTERLY">Quarterly</option>
                                            <option value="ANNUALLY">Annually</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.15em] mb-2 block ml-1">Execution Day</label>
                                        <input 
                                            type="number" 
                                            min="1" max="31"
                                            value={billingDay}
                                            onChange={(e) => setBillingDay(parseInt(e.target.value))}
                                            className="w-full h-12 bg-slate-50 border-2 border-slate-100 rounded-xl px-4 text-sm font-bold text-slate-900" 
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="p-5 bg-blue-50/50 rounded-2xl border border-blue-100 flex items-start gap-4">
                                <TrendingUp className="text-blue-600 mt-1 shrink-0" size={18} />
                                <p className="text-[11px] text-blue-900 font-bold leading-relaxed uppercase">
                                    The system will clone the master document on the chosen cycle. Multi-currency drift monitoring and statutory compliance will be applied automatically.
                                </p>
                            </div>
                        </div>

                        <div className="p-8 bg-slate-50/50 border-t border-slate-100 flex gap-4">
                            <Button variant="ghost" onClick={() => setIsCreateModalOpen(false)} className="flex-1 h-12 font-black uppercase text-[10px] tracking-widest text-slate-400">Abort</Button>
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

            {/* Verified status footer */}
            <div className="mt-4 pt-4 border-t border-slate-100 text-center">
                <div className="flex items-center justify-center gap-2 text-[9px] font-bold text-slate-300 uppercase tracking-widest">
                    <CheckCircle2 size={10} className="text-emerald-500" /> Sovereign Ledger Active
                </div>
            </div>
        </div>
    );
}