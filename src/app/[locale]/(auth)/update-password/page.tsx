'use client';

/**
 * --- BBU1 SOVEREIGN IDENTITY SEAL ---
 * COMPONENT: UpdatePasswordPage
 * ROLE: Re-securing account access via master key rotation.
 * 
 * DEEP THEME UPDATE:
 * 1. Visual Language: Professional White (Slate-50) Sovereign Theme.
 * 2. Identity Branding: B-Logo Integration.
 * 3. Security UX: High-contrast inputs and refined processing states.
 * 
 * LOGIC: 
 * 1. Captures new master password from user input.
 * 2. Authenticates session via Supabase Identity Hook.
 * 3. Commits the new identity seal to the sovereign node.
 * 4. Redirects to localized login to finalize session restoration.
 */

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, ShieldCheck, Lock, Eye, EyeOff } from 'lucide-react';
import { motion } from 'framer-motion';

export default function UpdatePasswordPage() {
    // INITIALIZING SOVEREIGN CLIENTS
    const supabase = createClient();
    const router = useRouter();
    const params = useParams(); // DETECTING ACTIVE LOCALE [de, en, fr, etc.]
    
    // STATE MANAGEMENT
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    /**
     * HANDLE IDENTITY SEAL UPDATE
     * Triggered on form submission to commit new security credentials.
     */
    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();

        // SECURITY POLICY ENFORCEMENT
        if (password.length < 8) {
            toast.error("Security Policy Breach", {
                description: "Password must be at least 8 characters to meet Sovereign standards."
            });
            return;
        }

        setIsSubmitting(true);
        const toastId = toast.loading("Sealing New Master Key...");

        try {
            // COMMITTING NEW PASSWORD TO SUPABASE AUTH ENGINE
            const { error } = await supabase.auth.updateUser({ password });
            
            if (error) {
                throw error;
            }

            toast.success("Identity Sealed Successfully", { 
                id: toastId,
                description: "Your master key has been rotated and hardened."
            });

            /**
             * LOCALIZED REDIRECT LOGIC
             * We extract the current locale from the URL params to prevent 
             * the middleware from redirecting the user to the default home page.
             */
            const currentLocale = params?.locale || 'en';
            
            // Redirecting user to their specific localized login portal
            router.push(`/${currentLocale}/login`);

        } catch (err: any) {
            // ERROR HANDLING & LOGGING
            toast.error("Identity Seal Failed", { 
                id: toastId, 
                description: err.message || "An unexpected error occurred during rotation." 
            });
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 relative flex items-center justify-center p-6 font-sans antialiased overflow-hidden">
            
            {/* CLEAN PROFESSIONAL BACKGROUND GRID */}
            <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.04] bg-[url('/patterns/grid-dark.svg')] bg-[length:40px_40px]" />

            <motion.div 
                initial={{ opacity: 0, scale: 0.98, y: 10 }} 
                animate={{ opacity: 1, scale: 1, y: 0 }} 
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="relative z-10 w-full max-w-md"
            >
                <Card className="border-none shadow-xl bg-white rounded-[2.5rem] overflow-hidden">
                    
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
                            New Master Key
                        </CardTitle>
                        <CardDescription className="text-slate-400 font-bold uppercase text-[9px] tracking-[0.25em] mt-2">
                            Re-securing Sovereign Account Node
                        </CardDescription>
                    </CardHeader>

                    {/* FORM CONTENT */}
                    <CardContent className="px-10 pb-12">
                        <form onSubmit={handleUpdate} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-500 ml-1 tracking-widest">
                                    Define Master Password
                                </label>
                                <div className="relative group">
                                    <Input 
                                        type={showPassword ? "text" : "password"} 
                                        className="h-14 rounded-xl bg-slate-50/50 border-slate-100 font-bold text-lg pr-12 focus:ring-2 focus:ring-blue-600/10 focus:border-blue-600 transition-all duration-200 shadow-inner" 
                                        value={password} 
                                        onChange={(e) => setPassword(e.target.value)} 
                                        placeholder="••••••••••••"
                                        required 
                                        autoFocus
                                    />
                                    <button 
                                        type="button" 
                                        onClick={() => setShowPassword(!showPassword)} 
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-blue-600 transition-colors"
                                    >
                                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                    </button>
                                </div>
                                <div className="flex items-center gap-2 px-1">
                                    <ShieldCheck className="w-3 h-3 text-blue-500" />
                                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">
                                        Minimum 8 characters for master seal.
                                    </p>
                                </div>
                            </div>

                            {/* SUBMIT ACTION */}
                            <Button 
                                type="submit" 
                                className="w-full h-14 bg-slate-900 hover:bg-black text-white font-black uppercase tracking-widest rounded-2xl shadow-lg hover:shadow-xl active:scale-[0.98] transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed" 
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? (
                                    <div className="flex items-center gap-2">
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                        <span>Applying Seal...</span>
                                    </div>
                                ) : (
                                    "UPDATE IDENTITY SEAL"
                                )}
                            </Button>

                            {/* SECURITY DISCLAIMER */}
                            <div className="pt-6 border-t border-slate-50 text-center">
                                <p className="text-[8px] text-slate-300 font-black uppercase tracking-[0.3em] leading-relaxed">
                                    Authorized rotation protocol active. <br /> all previous sessions will be invalidated.
                                </p>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
}