'use client';

/**
 * --- BBU1 SOVEREIGN IDENTITY RECOVERY ---
 * COMPONENT: ForgotPasswordPage
 * ROLE: Initializes the secure master key restoration protocol.
 * 
 * DEEP FIX: 
 * Removed the '/auth/' segment from the redirectTo URL.
 * Because '(auth)' is a Next.js Route Group, it is invisible to the browser.
 * Including it in the URL causes a 404 error. 
 */

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, Fingerprint } from 'lucide-react';
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
         * 🛡️ THE DEEP WELD FIX:
         * We removed '/auth' from the path below. 
         * Path corrected from: /${locale}/auth/callback
         * Path corrected to: /${locale}/callback
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
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 selection:bg-blue-500/30">
            <motion.div 
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="w-full max-w-md"
            >
                <Card className="border-none shadow-2xl rounded-[2.5rem] overflow-hidden bg-white border border-slate-100/50">
                    {/* SOVEREIGN SECURITY HEADER */}
                    <CardHeader className="bg-slate-900 text-white text-center py-10 relative">
                        <div className="absolute inset-0 bg-[url('/patterns/grid-light.svg')] opacity-5 pointer-events-none" />
                        <Fingerprint className="h-12 w-12 mx-auto mb-4 opacity-50 relative z-10" />
                        <CardTitle className="text-xl font-black uppercase tracking-tighter relative z-10">
                            Identity Recovery
                        </CardTitle>
                        <CardDescription className="text-slate-400 font-bold uppercase text-[9px] tracking-widest relative z-10">
                            BBU1 Sovereign Node Access
                        </CardDescription>
                    </CardHeader>

                    {/* RECOVERY FORM */}
                    <CardContent className="p-8 space-y-6">
                        <form onSubmit={handleReset} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">
                                    Registered Email Address
                                </label>
                                <Input 
                                    type="email" 
                                    placeholder="email@bbu1.com" 
                                    required 
                                    value={email} 
                                    onChange={(e) => setEmail(e.target.value)} 
                                    className="rounded-xl h-14 bg-slate-50 border-slate-100 focus:ring-2 focus:ring-blue-600/10 focus:border-blue-600 transition-all font-medium" 
                                />
                                <p className="text-[8px] text-slate-400 px-1 italic">
                                    Link will be valid for 60 minutes for security compliance.
                                </p>
                            </div>

                            {/* DISPATCH ACTION */}
                            <Button 
                                className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-blue-100 active:scale-[0.98] transition-all duration-200" 
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
                        <div className="pt-4 text-center border-t border-slate-50">
                            <p className="text-[8px] text-slate-300 font-bold uppercase tracking-[0.2em] leading-relaxed">
                                Authorized Personnel Only. <br /> All Recovery Attempts Are Logged On The Ledger.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
}