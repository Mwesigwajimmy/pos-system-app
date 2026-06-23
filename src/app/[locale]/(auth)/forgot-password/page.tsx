'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, Mail, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';

/**
 * COMPONENT: ForgotPasswordPage
 * ROLE: Facilitates secure password reset requests for business accounts.
 */
export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const params = useParams(); 
    const supabase = createClient();

    /**
     * HANDLE PASSWORD RESET REQUEST
     * Sends a secure recovery link to the provided email address.
     */
    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        const locale = params?.locale || 'en';
        
        /**
         * REDIRECT LOGIC:
         * Points to the base callback route to handle the authentication exchange.
         */
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/${locale}/callback?next=/update-password`,
        });

        if (error) {
            toast.error("Request Failed", { 
                description: error.message 
            });
        } else {
            toast.success("Reset Link Sent", { 
                description: "Please check your email inbox for the reset instructions." 
            });
        }
        setIsLoading(false);
    };

    return (
        <div className="min-h-screen bg-slate-50 relative flex items-center justify-center p-6 font-sans antialiased overflow-hidden">
            
            {/* CLEAN PROFESSIONAL BACKGROUND GRID */}
            <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.03] bg-[url('/patterns/grid-dark.svg')] bg-[length:40px_40px]" />

            <motion.div 
                initial={{ opacity: 0, y: 10 }} 
                animate={{ opacity: 1, y: 0 }} 
                className="relative z-10 w-full max-w-md"
            >
                <Card className="border border-slate-200 shadow-2xl rounded-2xl overflow-hidden bg-white">
                    
                    <CardHeader className="pt-12 text-center pb-8">
                        <div className="flex justify-center mb-6">
                            <img 
                                src="/logo.png" 
                                alt="Company Logo" 
                                className="h-16 w-auto object-contain" 
                            />
                        </div>
                        <div className="space-y-1">
                            <CardTitle className="text-2xl font-bold text-slate-900 tracking-tight">
                                Reset Password
                            </CardTitle>
                            <CardDescription className="text-slate-500 font-medium text-sm">
                                Enter your email to receive a secure reset link.
                            </CardDescription>
                        </div>
                    </CardHeader>

                    <CardContent className="px-8 pb-10 space-y-6">
                        <form onSubmit={handleReset} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-slate-700 ml-0.5">
                                    Email Address
                                </label>
                                <Input 
                                    type="email" 
                                    placeholder="name@company.com" 
                                    required 
                                    value={email} 
                                    onChange={(e) => setEmail(e.target.value)} 
                                    className="rounded-lg h-11 bg-white border-slate-200 focus:ring-1 focus:ring-blue-500 transition-all font-medium text-sm" 
                                />
                                <div className="flex items-center gap-2 px-1 mt-2">
                                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                                    <p className="text-[11px] text-slate-500 font-medium">
                                        Link remains valid for 60 minutes.
                                    </p>
                                </div>
                            </div>

                            <Button 
                                type="submit"
                                className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-sm transition-all" 
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <div className="flex items-center gap-2">
                                        <Loader2 className="animate-spin h-4 w-4" />
                                        <span>Sending...</span>
                                    </div>
                                ) : (
                                    "Send Reset Link"
                                )}
                            </Button>
                        </form>

                        {/* FOOTER ACTIONS */}
                        <div className="pt-6 border-t border-slate-50 text-center">
                            <div className="flex items-center justify-center gap-2 mb-4">
                                <ShieldCheck className="h-4 w-4 text-emerald-500" />
                                <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                                    Your security is monitored. <br /> All reset attempts are recorded.
                                </p>
                            </div>
                            
                            <Button 
                                variant="ghost" 
                                onClick={() => window.history.back()}
                                className="text-xs font-bold text-slate-500 hover:text-blue-600 transition-colors"
                            >
                                Back to Login
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
}