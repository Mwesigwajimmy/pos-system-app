'use client';

import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { toast } from 'sonner';
import { Loader2, Send, CheckCircle2, ShieldCheck } from 'lucide-react';

interface LeadFormProps {
    intent: 'ACADEMY_ENROLL' | 'DONATION_INQUIRY' | 'ENTERPRISE_DEMO';
    ctaText: string;
}

export default function LeadForm({ intent, ctaText }: LeadFormProps) {
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);

        const formData = new FormData(e.currentTarget);
        const data = Object.fromEntries(formData.entries());

        try {
            const res = await fetch('/api/marketing', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...data, intent }),
            });

            if (res.ok) {
                setSubmitted(true);
                toast.success("Identity Verified. Our Architects will contact you.");
            } else {
                toast.error("Transmission Interrupted. Please retry.");
            }
        } catch (err) {
            toast.error("Network Failure.");
        } finally {
            setLoading(false);
        }
    };

    if (submitted) {
        return (
            <div className="p-12 bg-blue-600/10 border border-blue-600/30 rounded-[3rem] text-center">
                <CheckCircle2 className="h-16 w-16 text-blue-500 mx-auto mb-6" />
                <h3 className="text-2xl font-black text-white uppercase italic tracking-tight mb-2">Transmission Successful</h3>
                <p className="text-slate-400 text-sm font-light">Your information is secured in the BBU1 Vault.</p>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">Full Name</label>
                    <Input name="full_name" placeholder="LEAD ARCHITECT NAME" className="h-14 bg-black/40 border-white/10 text-white rounded-xl" required />
                </div>
                <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">Corporate Email</label>
                    <Input name="email" type="email" placeholder="YOU@ENTITY.COM" className="h-14 bg-black/40 border-white/10 text-white rounded-xl" required />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">Organization / Entity</label>
                    <Input name="organization" placeholder="BUSINESS NAME" className="h-14 bg-black/40 border-white/10 text-white rounded-xl" />
                </div>
                <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">Industry Sector</label>
                    <select name="industry" className="w-full h-14 px-4 bg-black/40 border border-white/10 rounded-xl text-slate-300 font-bold text-sm focus:outline-none focus:border-blue-600 appearance-none">
                        <option>RETAIL & WHOLESALE</option>
                        <option>FINANCE & SACCO</option>
                        <option>TELECOM & AGENTS</option>
                        <option>HEALTHCARE</option>
                        <option>LOGISTICS</option>
                    </select>
                </div>
            </div>

            {intent === 'DONATION_INQUIRY' && (
                <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">Pledge Amount (USD)</label>
                    <Input name="amount" type="number" placeholder="500" className="h-14 bg-black/40 border-white/10 text-white rounded-xl" />
                </div>
            )}

            <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">Additional Brief</label>
                <textarea name="message" placeholder="DESCRIBE YOUR OBJECTIVES..." className="w-full min-h-[120px] p-6 bg-black/40 border border-white/10 rounded-2xl text-white font-light text-sm focus:outline-none focus:border-blue-600 resize-none" />
            </div>

            <Button disabled={loading} type="submit" className="w-full h-20 bg-blue-600 text-white font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-blue-700 shadow-2xl transition-all group">
                {loading ? <Loader2 className="animate-spin" /> : <span className="flex items-center gap-4">{ctaText} <Send size={20} /></span>}
            </Button>

            <div className="flex items-center justify-center gap-2 opacity-30">
                <ShieldCheck size={12} />
                <span className="text-[8px] font-black uppercase tracking-widest text-white">Sovereign Data Protection Protocol Active</span>
            </div>
        </form>
    );
}