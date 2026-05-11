'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, ShieldAlert, ShieldCheck } from "lucide-react";
import toast from 'react-hot-toast';

/**
 * INTERNAL COMPONENT: Handling the actual verification logic
 */
function CallbackContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();
    const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
    
    // Extract the OrderTrackingId sent back by PesaPal
    const trackingId = searchParams.get('OrderTrackingId');

    useEffect(() => {
        const verifyPayment = async () => {
            // If the ID is missing from the URL, it is an unauthorized access attempt
            if (!trackingId) {
                setStatus('error');
                return;
            }

            try {
                // SECURE HANDSHAKE: Call our internal verification API
                // This talks to PesaPal V3 and updates your business status in Supabase
                const res = await fetch(`/api/payments/pesapal/verify?trackingId=${trackingId}`);
                const result = await res.json();

                if (result.success) {
                    setStatus('success');
                    toast.success("Security Deposit Verified Successfully.");
                    
                    // Maintain language routing integrity (en, lg, sw, etc.)
                    const locale = pathname.split('/')[1] || 'en';
                    
                    // Allow the user to see the success message before auto-redirecting to dashboard
                    setTimeout(() => {
                        router.push(`/${locale}/dashboard`);
                    }, 3500);
                } else {
                    setStatus('error');
                    console.error("Verification Refused:", result.message);
                }
            } catch (e) {
                console.error("Critical Verification Fault:", e);
                setStatus('error');
            }
        };

        verifyPayment();
    }, [trackingId, router, pathname]);

    return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50/50">
            <Card className="max-w-md w-full border-none shadow-2xl rounded-[2.5rem] bg-white overflow-hidden animate-in fade-in zoom-in duration-700">
                {/* Brand Visual Indicator */}
                <div className="p-1.5 h-2 bg-blue-600 w-full" />
                
                <CardContent className="p-12 text-center space-y-8">
                    
                    {/* STATE: LOADING / VERIFYING */}
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

                    {/* STATE: SUCCESS / ACTIVATED */}
                    {status === 'success' && (
                        <div className="space-y-6">
                            <div className="h-24 w-24 bg-emerald-50 rounded-[2.5rem] flex items-center justify-center mx-auto shadow-inner border border-emerald-100">
                                <CheckCircle2 className="h-12 w-12 text-emerald-600" />
                            </div>
                            <div className="space-y-2">
                                <h2 className="text-3xl font-bold text-slate-900 uppercase tracking-tight">Access Activated</h2>
                                <p className="text-slate-500 text-sm font-medium">
                                    Your $1 security deposit has been confirmed. You now have full access to the BBU1 ecosystem.
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

                    {/* STATE: ERROR / FAILURE */}
                    {status === 'error' && (
                        <div className="space-y-6">
                            <div className="h-20 w-20 bg-red-50 rounded-[2rem] flex items-center justify-center mx-auto shadow-inner border border-red-100">
                                <ShieldAlert className="h-10 w-10 text-red-500" />
                            </div>
                            <div className="space-y-2">
                                <h2 className="text-2xl font-bold text-slate-900 uppercase tracking-tight">Connection Error</h2>
                                <p className="text-slate-500 text-sm font-medium leading-relaxed">
                                    The system could not verify your transaction. If your funds were deducted, please contact support for immediate manual activation.
                                </p>
                            </div>
                            <div className="pt-4 flex flex-col gap-3">
                                <Button 
                                    onClick={() => router.push('/settings/billing')} 
                                    className="w-full h-14 bg-slate-900 hover:bg-black text-white font-bold rounded-2xl shadow-xl transition-all active:scale-95"
                                >
                                    Return to Billing
                                </Button>
                                <Button 
                                    variant="ghost" 
                                    onClick={() => window.location.reload()} 
                                    className="text-slate-400 font-bold uppercase text-[10px] tracking-widest hover:text-slate-900"
                                >
                                    Retry Verification
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>

                {/* FOOTER BRANDING */}
                <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-center gap-3">
                    <ShieldCheck size={16} className="text-blue-600 opacity-50" />
                    <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
                        Verified Financial Reconciliation Node
                    </span>
                </div>
            </Card>
        </div>
    );
}

/**
 * EXPORTED PAGE: Wrapped in Suspense to prevent build errors
 */
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