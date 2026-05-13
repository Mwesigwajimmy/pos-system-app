'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, ShieldAlert, ShieldCheck } from "lucide-react";
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';

function CallbackContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();
    const queryClient = useQueryClient();
    const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    
    const trackingId = searchParams.get('OrderTrackingId');

    useEffect(() => {
        // Prevent double-firing in Strict Mode
        let isSubscribed = true;

        const verifyPayment = async () => {
            if (!trackingId) {
                setStatus('error');
                setErrorMessage("No transaction reference found.");
                return;
            }

            try {
                const res = await fetch(`/api/payments/pesapal/verify?trackingId=${trackingId}`);
                const result = await res.json();

                if (!isSubscribed) return;

                if (result.success) {
                    // --- THE SOVEREIGN IDENTITY WELD ---
                    // Hard-bind the active business ID to the session.
                    if (result.businessId) {
                        document.cookie = `bbu1_active_business_id=${result.businessId}; path=/; max-age=31536000; SameSite=Lax`;
                    }

                    // --- THE NEURAL REFRESH (FORCED) ---
                    // We invalidate AND refetch to ensure the Middleware 'sees' the active status.
                    await queryClient.invalidateQueries({ queryKey: ['businessContext'] });
                    await queryClient.refetchQueries({ queryKey: ['businessContext'] });
                    
                    setStatus('success');
                    toast.success("Identity Verified. Sovereign Node Activated.");
                    
                    const locale = pathname.split('/')[1] || 'en';
                    
                    // 2-second delay is optimal for the user to see the "Activated" UI
                    setTimeout(() => {
                        router.push(`/${locale}/dashboard`);
                    }, 2500);
                } else {
                    setStatus('error');
                    const msg = result.message || result.error || "Verification refused by gateway.";
                    setErrorMessage(msg);
                    toast.error(msg);
                }
            } catch (e) {
                console.error("FINANCIAL_HANDSHAKE_FAULT:", e);
                setStatus('error');
                setErrorMessage("Critical connection failure with the payment node.");
            }
        };

        verifyPayment();

        return () => { isSubscribed = false; };
    }, [trackingId, router, pathname, queryClient]);

    return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50/50 font-sans antialiased">
            <Card className="max-w-md w-full border-none shadow-2xl rounded-[2.5rem] bg-white overflow-hidden animate-in fade-in zoom-in duration-700">
                <div className="p-1.5 h-2 bg-blue-600 w-full" />
                
                <CardContent className="p-12 text-center space-y-8">
                    {status === 'verifying' && (
                        <div className="space-y-6">
                            <div className="relative mx-auto w-24 h-24 flex items-center justify-center">
                                <div className="absolute inset-0 rounded-full bg-blue-50 animate-ping opacity-40" />
                                <Loader2 className="h-12 w-12 animate-spin text-blue-600 relative z-10" />
                            </div>
                            <div className="space-y-2">
                                <h2 className="text-2xl font-bold text-slate-900 uppercase tracking-tight">Verifying Deposit</h2>
                                <p className="text-slate-500 text-sm font-medium leading-relaxed">
                                    Finalizing secure handshake with PesaPal to synchronize your business credentials.
                                </p>
                            </div>
                        </div>
                    )}

                    {status === 'success' && (
                        <div className="space-y-6">
                            <div className="h-24 w-24 bg-emerald-50 rounded-[2.5rem] flex items-center justify-center mx-auto shadow-inner border border-emerald-100">
                                <CheckCircle2 className="h-12 w-12 text-emerald-600" />
                            </div>
                            <div className="space-y-2">
                                <h2 className="text-3xl font-bold text-slate-900 uppercase tracking-tight">Access Activated</h2>
                                <p className="text-slate-500 text-sm font-medium">
                                    Reconciliation complete. Your financial management suite is now authorized for use.
                                </p>
                            </div>
                            <div className="pt-6">
                                <div className="flex items-center justify-center gap-2">
                                    <div className="h-1.5 w-1.5 rounded-full bg-blue-600 animate-bounce" />
                                    <div className="h-1.5 w-1.5 rounded-full bg-blue-600 animate-bounce [animation-delay:-0.15s]" />
                                    <div className="h-1.5 w-1.5 rounded-full bg-blue-600 animate-bounce [animation-delay:-0.3s]" />
                                </div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-4">
                                    Syncing Dashboard Context...
                                </p>
                            </div>
                        </div>
                    )}

                    {status === 'error' && (
                        <div className="space-y-6">
                            <div className="h-20 w-20 bg-red-50 rounded-[2rem] flex items-center justify-center mx-auto shadow-inner border border-red-100">
                                <ShieldAlert className="h-10 w-10 text-red-500" />
                            </div>
                            <div className="space-y-2">
                                <h2 className="text-2xl font-bold text-slate-900 uppercase tracking-tight">Handshake Failed</h2>
                                <p className="text-slate-500 text-sm font-medium leading-relaxed">
                                    {errorMessage || "We encountered an error verifying your transaction. Please check your banking app for a deduction."}
                                </p>
                            </div>
                            <div className="pt-4 flex flex-col gap-3">
                                <Button 
                                    onClick={() => window.location.reload()} 
                                    variant="outline" 
                                    className="w-full h-14 rounded-2xl font-bold text-slate-600 border-slate-200"
                                >
                                    Retry Verification
                                </Button>
                                <Button 
                                    onClick={() => {
                                        const locale = pathname.split('/')[1] || 'en';
                                        router.push(`/${locale}/settings/billing`);
                                    }} 
                                    className="w-full h-14 bg-slate-900 hover:bg-black text-white font-bold rounded-2xl shadow-xl transition-all active:scale-95"
                                >
                                    Return to Billing
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>

                <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-center gap-3 opacity-40">
                    <ShieldCheck size={16} className="text-blue-600" />
                    <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
                        Sovereign Financial Security Verified
                    </span>
                </div>
            </Card>
        </div>
    );
}

export default function PesaPalCallback() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-slate-50/50">
                <Loader2 className="h-10 w-10 animate-spin text-blue-600 opacity-20" />
            </div>
        }>
            <CallbackContent />
        </Suspense>
    );
}