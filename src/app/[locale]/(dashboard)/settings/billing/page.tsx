'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Zap, Clock, CreditCard, Loader2, CheckCircle2, Building2, Crown } from "lucide-react";
import { useBranding } from '@/components/core/BrandingProvider';
import { useUserProfile } from '@/hooks/useUserProfile';
import toast from 'react-hot-toast';

export default function BillingSettings() {
    const { branding } = useBranding();
    const { data: profile } = useUserProfile();
    const [loading, setLoading] = useState<string | null>(null);

    const PLANS = [
        {
            name: "Small Business",
            price: 4, // Approx 15,000 UGX
            description: "Perfect for retail shops, kiosks, and solo owners.",
            features: ["Cloud POS System", "Inventory Tracking", "Sales Reports", "Digital Invoicing"],
            icon: Building2,
            color: "text-blue-600",
            bg: "bg-blue-50"
        },
        {
            name: "Industrial",
            price: 49,
            description: "Full suite for manufacturers and multi-branch groups.",
            features: ["Everything in Small Business", "Manufacturing & Recipes", "HR & Payroll System", "Advanced Analytics"],
            icon: Crown,
            color: "text-emerald-600",
            bg: "bg-emerald-50",
            popular: true
        }
    ];

    const initiateTrial = async (plan: string, amount: number) => {
        setLoading(plan);
        try {
            // FIXED: Pointing to the new pesapal folder structure
            const res = await fetch('/api/payments/pesapal/initiate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount: 1.00, // Fixed $1 verification deposit
                    planName: plan,
                    businessId: branding?.business_id,
                    email: profile?.email
                })
            });
            const data = await res.json();
            if (data.redirect_url) {
                window.location.href = data.redirect_url;
            } else {
                throw new Error("Invalid response from gateway");
            }
        } catch (error) {
            toast.error("Handshake Failed: Check internet or payment keys.");
        } finally {
            setLoading(null);
        }
    };

    return (
        <div className="max-w-[1400px] mx-auto py-12 px-6 space-y-12 animate-in fade-in duration-700">
            <header className="space-y-2 border-b pb-10">
                <h1 className="text-4xl font-bold tracking-tight text-slate-900 uppercase italic">Subscription Management</h1>
                <p className="text-slate-500 font-medium">Activate your Sovereign Node and choose a plan that fits your operation.</p>
            </header>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
                {/* PRICING CARDS */}
                <div className="xl:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-8">
                    {PLANS.map((plan) => (
                        <Card key={plan.name} className="border-none shadow-2xl rounded-[2.5rem] bg-white overflow-hidden flex flex-col group transition-all hover:scale-[1.02]">
                            <div className="p-10 flex-1 space-y-8">
                                <div className="flex justify-between items-start">
                                    <div className={`h-16 w-16 ${plan.bg} rounded-2xl flex items-center justify-center ${plan.color}`}>
                                        <plan.icon size={32} />
                                    </div>
                                    {plan.popular && (
                                        <Badge className="bg-slate-900 text-white uppercase text-[10px] px-4 py-1.5 rounded-full font-bold tracking-widest">Most Advanced</Badge>
                                    )}
                                </div>
                                
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-900 uppercase tracking-tight">{plan.name}</h2>
                                    <p className="text-slate-400 text-sm mt-2 leading-relaxed">{plan.description}</p>
                                </div>

                                <div className="space-y-4 pt-4">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">System Capabilities:</p>
                                    {plan.features.map((feature) => (
                                        <div key={feature} className="flex items-center gap-3 text-sm font-semibold text-slate-600">
                                            <CheckCircle2 size={18} className="text-blue-500 shrink-0"/> {feature}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="p-10 bg-slate-50 border-t border-slate-100 flex flex-col gap-6">
                                <div className="flex items-baseline gap-2">
                                    <span className="text-5xl font-black text-slate-950 tabular-nums">${plan.price}</span>
                                    <span className="text-slate-400 font-bold uppercase text-xs tracking-widest">/ Month</span>
                                </div>
                                <Button 
                                    disabled={!!loading}
                                    onClick={() => initiateTrial(plan.name, plan.price)}
                                    className="w-full h-16 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-xl transition-all active:scale-95 text-base"
                                >
                                    {loading === plan.name ? <Loader2 className="animate-spin mr-2"/> : <Zap className="mr-2 h-5 w-5 fill-white"/>}
                                    {loading === plan.name ? "Executing..." : "Start 14-Day Free Trial"}
                                </Button>
                                <p className="text-[9px] text-center text-slate-400 uppercase font-black tracking-[0.2em]">
                                    $1 refundable security verification required
                                </p>
                            </div>
                        </Card>
                    ))}
                </div>

                {/* SIDEBAR INFO */}
                <div className="space-y-8">
                    <Card className="border-none shadow-xl rounded-[2.5rem] bg-slate-950 text-white p-10 flex flex-col justify-between h-full min-h-[400px]">
                        <div className="space-y-8">
                            <div className="h-14 w-14 bg-white/10 rounded-2xl flex items-center justify-center">
                                <ShieldCheck size={32} className="text-emerald-400" />
                            </div>
                            <h3 className="text-2xl font-bold uppercase italic tracking-tighter">Security Protocol</h3>
                            <p className="text-slate-400 leading-relaxed font-medium">
                                To protect the integrity of Sovereign OS, we process a $1 verification deposit. 
                                This ensures that every business unit in our ecosystem is verified.
                            </p>
                            <p className="text-slate-400 leading-relaxed font-medium">
                                This deposit is credited back to your first month's bill or fully refunded if you cancel within 14 days.
                            </p>
                        </div>
                        <div className="pt-10 border-t border-white/10 flex items-center gap-4 mt-auto">
                            <CreditCard size={20} className="text-blue-500" />
                            <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-500">PesaPal Verified Network</span>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}