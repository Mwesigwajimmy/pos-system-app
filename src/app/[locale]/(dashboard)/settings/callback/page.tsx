'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, ShieldAlert, ShieldCheck } from "lucide-react";
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';

export default function PesaPalCallback() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
    
    const trackingId = searchParams.get('OrderTrackingId');

    useEffect(() => {
        const verifyPayment = async () => {
            if (!trackingId) {
                setStatus('error');
                return;
            }

            try {
                // FIXED: URL matches our organized folder structure
                const res = await fetch(`/api/payments/pesapal/verify?trackingId=${trackingId}`);
                const result = await res.json();

                if (result.success) {
                    setStatus('success');
                    toast.success("Security Deposit Verified. Welcome.");
                    // Allow the user to see the success message for 3 seconds
                    setTimeout(() => router.push('/dashboard'), 3500);
                } else {
                    setStatus('error');
                }
            } catch (e) {
                console.error("Payment Verification Error:", e);
                setStatus('error');
            }
        };

        verifyPayment();
    }, [trackingId, router]);

    return (
        <div className="min-h-[80vh] flex items-center justify-center p-6 bg-slate-50/30">
            <Card className="max-w-md w-full border-none shadow-2xl rounded-[3rem] bg-white overflow-hidden animate-in fade-in zoom-in duration-500">
                <div className="p-1.5 h-2 bg-blue-600 w-full" />
                
                <CardContent className="p-12 text-center space-y-8">
                    {status === 'verifying' && (
                        <div className="space-y-6">
                            <div className="relative mx-auto w-20 h-20 flex items-center justify-center">
                                <div className="absolute inset-0 rounded-full bg-blue-100 animate-ping opacity-20" />
                                <Loader2 className="h-12 w-12 animate-spin text-blue-600 relative z-10" />
                            </div>
                            <div className="space-y-2">
                                <h2 className="text-2xl font-bold text-slate-900 uppercase tracking-tight">Verifying Payment</h2>
                                <p className="text-slate-500 text-sm font-medium">Securing your Sovereign Node connection...</p>
                            </div>
                        </div>
                    )}

                    {status === 'success' && (
                        <div className="space-y-6">
                            <div className="h-24 w-24 bg-emerald-50 rounded-[2rem] flex items-center justify-center mx-auto shadow-inner">
                                <CheckCircle2 className="h-12 w-12 text-emerald-600" />
                            </div>
                            <div className="space-y-2">
                                <h2 className="text-3xl font-bold text-slate-900 uppercase tracking-tight">Trial Activated</h2>
                                <p className="text-slate-500 font-medium">Your business unit is now live in the BBU1 Ecosystem.</p>
                            </div>
                            <div className="pt-4">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] animate-pulse">Redirecting to Command Center...</p>
                            </div>
                        </div>
                    )}

                    {status === 'error' && (
                        <div className="space-y-6">
                            <div className="h-20 w-20 bg-red-50 rounded-[2rem] flex items-center justify-center mx-auto shadow-inner">
                                <ShieldAlert className="h-10 w-10 text-red-500" />
                            </div>
                            <div className="space-y-2">
                                <h2 className="text-2xl font-bold text-slate-900 uppercase tracking-tight">Handshake Failed</h2>
                                <p className="text-slate-500 text-sm font-medium leading-relaxed">
                                    We encountered a protocol error while verifying your deposit. If your money was deducted, please contact support.
                                </p>
                            </div>
                            <div className="pt-4 flex flex-col gap-3">
                                <Button onClick={() => router.push('/settings/billing')} className="w-full h-12 bg-slate-900 hover:bg-black text-white font-bold rounded-xl shadow-lg">
                                    Back to Billing
                                </Button>
                                <Button variant="ghost" onClick={() => window.location.reload()} className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">
                                    Retry Verification
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>

                <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-center gap-2 opacity-40">
                    <ShieldCheck size={14} className="text-blue-600" />
                    <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500">
                        Encrypted Payment Verification
                    </span>
                </div>
            </Card>
        </div>
    );
}