'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, ShieldAlert, ShieldCheck } from "lucide-react";
import toast from 'react-hot-toast';
// ADDED: Import Query Client to handle the cache refresh
import { useQueryClient } from '@tanstack/react-query';

function CallbackContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();
    const queryClient = useQueryClient(); // Initialize the cache manager
    const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
    
    const trackingId = searchParams.get('OrderTrackingId');

    useEffect(() => {
        const verifyPayment = async () => {
            if (!trackingId) {
                setStatus('error');
                return;
            }

            try {
                // Perform secure handshake with our internal verification API
                const res = await fetch(`/api/payments/pesapal/verify?trackingId=${trackingId}`);
                const result = await res.json();

                if (result.success) {
                    // --- THE SOVEREIGN IDENTITY WELD ---
                    // We manually set the active business ID cookie. 
                    // This is critical because it tells the Middleware exactly which business 
                    // node to validate, even if the user just switched or cleared their cache.
                    if (result.businessId) {
                        document.cookie = `bbu1_active_business_id=${result.businessId}; path=/; max-age=31536000; SameSite=Lax`;
                    }

                    // --- THE NEURAL REFRESH ---
                    // This forces the 'useBusinessContext' hook to refetch immediately.
                    // It clears the 'Identity Blindness' so the UI sees the 'trial' status.
                    await queryClient.invalidateQueries({ queryKey: ['businessContext'] });
                    
                    setStatus('success');
                    toast.success("Deposit Verified. Business Access Granted.");
                    
                    const locale = pathname.split('/')[1] || 'en';
                    
                    // Redirect to the dashboard. Because the cache is refreshed AND 
                    // the cookie is set, the Gatekeeper (Middleware) will let them in instantly.
                    setTimeout(() => {
                        router.push(`/${locale}/dashboard`);
                    }, 3000);
                } else {
                    setStatus('error');
                    console.error("Verification Refused:", result.message);
                }
            } catch (e) {
                console.error("Verification Fault:", e);
                setStatus('error');
            }
        };

        verifyPayment();
    }, [trackingId, router, pathname, queryClient]);

    return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50/50">
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
                                    Finalizing the secure handshake with the payment gateway to activate your business suite.
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
                                    Your deposit has been confirmed. You now have full access to the BBU1 ecosystem.
                                </p>
                            </div>
                            <div className="pt-6">
                                <div className="flex items-center justify-center gap-2">
                                    <div className="h-1.5 w-1.5 rounded-full bg-blue-600 animate-bounce" />
                                    <div className="h-1.5 w-1.5 rounded-full bg-blue-600 animate-bounce [animation-delay:-0.15s]" />
                                    <div className="h-1.5 w-1.5 rounded-full bg-blue-600 animate-bounce [animation-delay:-0.3s]" />
                                </div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-4">
                                    Opening Business Management Suite...
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
                                <h2 className="text-2xl font-bold text-slate-900 uppercase tracking-tight">Connection Error</h2>
                                <p className="text-slate-500 text-sm font-medium leading-relaxed">
                                    The system could not verify your transaction. If your funds were deducted, please contact support for manual activation.
                                </p>
                            </div>
                            <div className="pt-4 flex flex-col gap-3">
                                <Button onClick={() => router.push('/settings/billing')} className="w-full h-14 bg-slate-900 hover:bg-black text-white font-bold rounded-2xl shadow-xl transition-all active:scale-95">
                                    Return to Billing
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>

                <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-center gap-3 opacity-40">
                    <ShieldCheck size={16} className="text-blue-600" />
                    <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
                        Verified Financial Reconciliation Node
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