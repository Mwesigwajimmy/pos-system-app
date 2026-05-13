'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
    ShieldCheck, Zap, Clock, CreditCard, Loader2, 
    CheckCircle2, Building2, Crown, Star, Globe, 
    ChevronRight, ExternalLink, ShieldQuestion
} from "lucide-react";
import { useBranding } from '@/components/core/BrandingProvider';
import { useUserProfile } from '@/hooks/useUserProfile';
import toast from 'react-hot-toast';
import { useRouter, usePathname } from 'next/navigation';

export default function BillingSettings() {
    const { branding } = useBranding();
    const { data: profile, isLoading: isProfileLoading } = useUserProfile();
    const [loading, setLoading] = useState<string | null>(null);
    const router = useRouter();
    const pathname = usePathname();

    // --- DEEP SUBSCRIPTION GUARD ---
    // Check if the user is already "Cleared"
    const rawStatus = (profile as any)?.subscription_status || '';
    const subStatus = rawStatus.toLowerCase().trim();
    const isAuthorized = ['trial', 'active', 'free', 'completed'].includes(subStatus);

    // FULL ENTERPRISE SUITE: All 4 packages calibrated for global business
    const PLANS = [
        {
            name: "Small Business",
            price: 4, 
            description: "Essential tools for retail shops and micro-businesses.",
            features: ["Cloud POS System", "Inventory Tracking", "Sales Reports", "Digital Invoicing"],
            icon: Building2,
            color: "text-blue-600",
            bg: "bg-blue-50"
        },
        {
            name: "Professional",
            price: 15,
            description: "Advanced tools for growing teams and startups.",
            features: ["Everything in Small Business", "Accounting Core", "Multi-Branch Support", "AI Assistant"],
            icon: Star,
            color: "text-amber-600",
            bg: "bg-amber-50",
            popular: true
        },
        {
            name: "Industrial",
            price: 49,
            description: "Full suite for manufacturers and large distributors.",
            features: ["Everything in Professional", "Manufacturing & BOM", "HR & Payroll System", "Landed Costing"],
            icon: Crown,
            color: "text-emerald-600",
            bg: "bg-emerald-50"
        },
        {
            name: "Enterprise",
            price: 119,
            description: "Tailored power for global corporations and groups.",
            features: ["Full System Access", "Custom API Integration", "Forensic Audit Logs", "Dedicated Support"],
            icon: Globe,
            color: "text-purple-600",
            bg: "bg-purple-50"
        }
    ];

    const initiateTrial = async (plan: string, amount: number) => {
        const bizId = branding?.business_id || profile?.business_id;
        const userEmail = profile?.email;

        if (!bizId || !userEmail) {
            toast.error("Identity synchronization in progress. Please try again in 2 seconds.");
            return;
        }

        setLoading(plan);
        try {
            const res = await fetch('/api/payments/pesapal/initiate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount: 1.00, // Fixed $1 verification deposit (Refundable)
                    planName: plan,
                    businessId: bizId,
                    email: userEmail
                })
            });
            
            const data = await res.json();
            
            if (data.redirect_url) {
                window.location.href = data.redirect_url;
            } else {
                throw new Error(data.error || "Gateway Handshake Failed");
            }
        } catch (error: any) {
            console.error("Billing Error:", error);
            toast.error(error.message || "Connection to Payment Gateway failed.");
        } finally {
            setLoading(null);
        }
    };

    // --- 1. LOADING STATE ---
    if (isProfileLoading) {
        return (
            <div className="flex h-[80vh] w-full items-center justify-center">
                <Loader2 className="h-10 w-10 animate-spin text-blue-600 opacity-20" />
            </div>
        );
    }

    // --- 2. THE "CLEARED" VIEW: Users who have already paid see this instead of the prices ---
    if (isAuthorized) {
        return (
            <div className="max-w-5xl mx-auto py-20 px-6 space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-1000">
                <div className="space-y-4 text-center">
                    <div className="h-16 w-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto border border-emerald-100 shadow-sm">
                        <ShieldCheck className="text-emerald-600 h-8 w-8" />
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Subscription Active</h1>
                    <p className="text-slate-500 font-medium">Your business node is currently authorized and fully synchronized.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <Card className="border-none shadow-2xl rounded-[3rem] p-10 bg-slate-950 text-white space-y-8">
                        <div className="space-y-2">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em]">Current Intelligence Plan</p>
                            <h2 className="text-4xl font-bold uppercase">{(profile as any)?.subscription_plan || 'Sovereign Node'}</h2>
                        </div>
                        <div className="flex items-center gap-4">
                            <Badge className="bg-emerald-500/20 text-emerald-400 border-none px-4 py-1.5 rounded-full font-bold uppercase text-[10px] tracking-widest">
                                Status: {subStatus}
                            </Badge>
                            <span className="text-slate-500 text-xs font-medium">Verified via PesaPal V3</span>
                        </div>
                        <Button 
                            onClick={() => router.push(`/${pathname.split('/')[1] || 'en'}/dashboard`)}
                            className="w-full h-14 bg-white text-slate-950 hover:bg-slate-200 font-bold rounded-2xl transition-all"
                        >
                            Open Command Center <ChevronRight className="ml-2 h-4 w-4" />
                        </Button>
                    </Card>

                    <Card className="border border-slate-100 shadow-xl rounded-[3rem] p-10 bg-white space-y-8">
                        <div className="space-y-4">
                            <h3 className="text-xl font-bold text-slate-900 uppercase">Billing Controls</h3>
                            <p className="text-slate-500 text-sm leading-relaxed">
                                To update your payment method, view invoices, or modify your industrial tier, please access our secure financial reconciliation hub.
                            </p>
                        </div>
                        <div className="space-y-4 pt-4">
                            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                <div className="flex items-center gap-3">
                                    <CreditCard className="text-slate-400 h-5 w-5" />
                                    <span className="text-sm font-bold text-slate-700">Payment Reconciliation</span>
                                </div>
                                <Button variant="ghost" size="sm" className="text-blue-600 font-bold uppercase text-[10px] tracking-widest">
                                    History
                                </Button>
                            </div>
                        </div>
                    </Card>
                </div>
                <div className="flex justify-center pt-10">
                    <p className="text-[10px] font-bold text-slate-300 uppercase tracking-[0.5em]">Global Transaction ID: {(profile as any)?.business_id?.slice(0, 8)}</p>
                </div>
            </div>
        );
    }

    // --- 3. THE "PURCHASE" VIEW: Only shown to unpaid/unverified users ---
    return (
        <div className="max-w-[1600px] mx-auto py-10 px-4 md:px-10 space-y-12 animate-in fade-in duration-500">
            
            <header className="space-y-2 border-b pb-10">
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 uppercase">Subscription Management</h1>
                <p className="text-slate-500 font-medium text-sm">
                    Active Node: <span className="text-slate-900 font-bold">{branding?.legal_name || profile?.business_name || 'Synchronizing...'}</span>
                </p>
            </header>

            <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
                <div className="xl:col-span-3 grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-4 gap-6">
                    {PLANS.map((plan) => (
                        <Card key={plan.name} className="border border-slate-100 shadow-xl rounded-[2.5rem] bg-white overflow-hidden flex flex-col transition-all hover:border-blue-200">
                            <div className="p-8 flex-1 space-y-6">
                                <div className="flex justify-between items-center">
                                    <div className={`h-12 w-12 ${plan.bg} rounded-xl flex items-center justify-center ${plan.color}`}>
                                        <plan.icon size={24} />
                                    </div>
                                    {plan.popular && (
                                        <Badge className="bg-blue-600 text-white uppercase text-[9px] px-3 py-1 rounded-full font-bold tracking-widest border-none">Recommended</Badge>
                                    )}
                                </div>
                                
                                <div>
                                    <h2 className="text-xl font-bold text-slate-900 uppercase">{plan.name}</h2>
                                    <p className="text-slate-400 text-xs mt-1.5 leading-relaxed h-8">{plan.description}</p>
                                </div>

                                <div className="space-y-3 pt-2">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Platform Access:</p>
                                    {plan.features.map((feature) => (
                                        <div key={feature} className="flex items-start gap-2.5 text-xs font-semibold text-slate-600">
                                            <CheckCircle2 size={14} className="text-blue-500 mt-0.5 shrink-0"/> {feature}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="p-8 bg-slate-50 border-t border-slate-100 flex flex-col gap-5">
                                <div className="flex items-baseline gap-1">
                                    <span className="text-4xl font-bold text-slate-950">${plan.price}</span>
                                    <span className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">/ Month</span>
                                </div>
                                <Button 
                                    disabled={!!loading || !profile?.email}
                                    onClick={() => initiateTrial(plan.name, plan.price)}
                                    className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-md transition-all active:scale-95 text-xs uppercase tracking-widest"
                                >
                                    {loading === plan.name ? <Loader2 className="animate-spin mr-2 h-4 w-4"/> : <Zap className="mr-2 h-4 w-4 fill-white"/>}
                                    {loading === plan.name ? "Processing" : "Start 14-Day Trial"}
                                </Button>
                                <p className="text-[9px] text-center text-slate-400 font-bold uppercase leading-tight">
                                    $1 refundable verification deposit required
                                </p>
                            </div>
                        </Card>
                    ))}
                </div>

                <div className="xl:col-span-1">
                    <Card className="border-none shadow-2xl rounded-[2.5rem] bg-slate-950 text-white p-8 md:p-10 flex flex-col justify-between h-full min-h-[450px]">
                        <div className="space-y-8">
                            <div className="h-14 w-14 bg-white/10 rounded-2xl flex items-center justify-center">
                                <ShieldCheck size={32} className="text-emerald-400" />
                            </div>
                            <div className="space-y-4">
                                <h3 className="text-2xl font-bold uppercase tracking-tight">Security Standards</h3>
                                <p className="text-slate-400 leading-relaxed font-medium text-sm">
                                    To maintain the high-integrity architecture of Sovereign OS, we process a $1 verification deposit.
                                </p>
                                <p className="text-slate-400 leading-relaxed font-medium text-sm">
                                    This confirms your professional business identity. The deposit is automatically credited to your first invoice or fully refunded if you cancel during the trial.
                                </p>
                            </div>
                        </div>
                        <div className="pt-10 border-t border-white/10 flex flex-col gap-4">
                            <div className="flex items-center gap-3">
                                <CreditCard size={18} className="text-blue-500" />
                                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Global Payment Hub</span>
                            </div>
                            <div className="text-[9px] font-medium text-slate-600 uppercase tracking-[0.2em]">
                                Verified by PesaPal V3 Infrastructure
                            </div>
                        </div>
                    </Card>
                </div>
            </div>

            <div className="flex justify-center pt-10 opacity-30">
                 <div className="h-px w-24 bg-slate-300 self-center" />
                 <span className="mx-6 text-[10px] font-bold uppercase tracking-[0.4em] text-slate-400 whitespace-nowrap">Authorized Billing Entry v1.4.2</span>
                 <div className="h-px w-24 bg-slate-300 self-center" />
            </div>
        </div>
    );
}