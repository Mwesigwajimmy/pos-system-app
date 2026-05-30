'use client';

/**
 * --- BBU1 SOVEREIGN IDENTITY RECOVERY ---
 * COMPONENT: ForgotPasswordPage
 * ROLE: Initializes the secure master key restoration protocol.
 * 
 * DEEP THEME UPDATE:
 * 1. Visual Language: Professional White (Slate-50) Sovereign Theme.
 * 2. Identity Branding: B-Logo Integration.
 * 3. Security UX: High-contrast inputs and refined dispatch states.
 * 
 * LOGIC FIX (PRESERVED): 
 * Corrected Route Group Resolution: (auth) is invisible in URL.
 * Redirect path uses /callback instead of /auth/callback to prevent 404.
 */

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, Fingerprint, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ForgotPasswordPage() {
    // INITIALIZING SOVEREIGN CLIENTS
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const params = useParams(); // CAPTURING ACTIVE LOCALE [en, fr, lg, etc.]
    const supabase = createClient();

    /**
     * HANDLE IDENTITY RECOVERY REQUEST
     * Dispatches a secure recovery link to the user's registered email.
     */
    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        // SECURING LOCALE CONTEXT
        const locale = params?.locale || 'en';
        
        /**
         * 🛡️ THE DEEP WELD FIX (PRESERVED):
         * We point to /callback (the actual Next.js route) instead of /auth/callback.
         */
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/${locale}/callback?next=/update-password`,
        });

        if (error) {
            // PROTOCOL REJECTED
            toast.error("Handshake Refused", { 
                description: error.message 
            });
        } else {
            // PROTOCOL INITIALIZED
            toast.success("Recovery Link Dispatched", { 
                description: "Check your inbox for the Sovereign access key." 
            });
        }
        setIsLoading(false);
    };

    return (
        <div className="min-h-screen bg-slate-50 relative flex items-center justify-center p-6 font-sans antialiased overflow-hidden">
            
            {/* CLEAN PROFESSIONAL BACKGROUND GRID */}
            <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.04] bg-[url('/patterns/grid-dark.svg')] bg-[length:40px_40px]" />

            <motion.div 
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="relative z-10 w-full max-w-md"
            >
                <Card className="border-none shadow-xl rounded-[2.5rem] overflow-hidden bg-white border border-slate-100/50">
                    
                    {/* VISUAL SECURITY HEADER - SOVEREIGN WHITE THEME */}
                    <CardHeader className="pt-12 text-center pb-8 relative">
                        <div className="flex justify-center mb-6">
                            {/* THE B-LOGO INTEGRATION */}
                            <img 
                                src="/logo.png" 
                                alt="BBU1 Logo" 
                                className="h-20 w-20 object-contain drop-shadow-sm" 
                            />
                        </div>
                        <CardTitle className="text-3xl font-black uppercase tracking-tighter text-slate-900">
                            Identity Recovery
                        </CardTitle>
                        <CardDescription className="text-slate-400 font-bold uppercase text-[9px] tracking-[0.25em] mt-2">
                            BBU1 Sovereign Node Access
                        </CardDescription>
                    </CardHeader>

                    {/* RECOVERY FORM */}
                    <CardContent className="px-10 pb-12 space-y-6">
                        <form onSubmit={handleReset} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-500 ml-1 tracking-widest">
                                    Registered Email Address
                                </label>
                                <Input 
                                    type="email" 
                                    placeholder="admin@bbu1.com" 
                                    required 
                                    value={email} 
                                    onChange={(e) => setEmail(e.target.value)} 
                                    className="rounded-xl h-14 bg-slate-50/50 border-slate-100 focus:ring-2 focus:ring-blue-600/10 focus:border-blue-600 transition-all font-bold shadow-inner" 
                                />
                                <div className="flex items-center gap-2 px-1 mt-2">
                                    <Fingerprint className="w-3 h-3 text-slate-300" />
                                    <p className="text-[8px] text-slate-400 font-bold uppercase tracking-tight">
                                        Link valid for 60 mins for security compliance.
                                    </p>
                                </div>
                            </div>

                            {/* DISPATCH ACTION */}
                            <Button 
                                className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-blue-100 active:scale-[0.98] transition-all duration-300" 
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <div className="flex items-center gap-2">
                                        <Loader2 className="animate-spin h-5 w-5" />
                                        <span>Dispatching...</span>
                                    </div>
                                ) : (
                                    "DISPATCH RECOVERY LINK"
                                )}
                            </Button>
                        </form>

                        {/* SECURITY FOOTER */}
                        <div className="pt-6 border-t border-slate-50 text-center">
                            <div className="flex items-center justify-center gap-2 mb-4">
                                <ShieldCheck className="h-3 w-3 text-slate-200" />
                                <p className="text-[8px] text-slate-300 font-black uppercase tracking-[0.3em] leading-relaxed">
                                    Authorized Personnel Only. <br /> Attempts Are Logged On The Sovereign Ledger.
                                </p>
                            </div>
                            
                            <Button 
                                variant="ghost" 
                                onClick={() => window.history.back()}
                                className="text-[10px] font-black uppercase text-slate-400 hover:text-blue-600 tracking-widest"
                            >
                                Return To Portal
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
}