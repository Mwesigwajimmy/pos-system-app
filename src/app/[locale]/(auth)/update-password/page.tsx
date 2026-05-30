'use client';

/**
 * --- BBU1 SOVEREIGN IDENTITY SEAL ---
 * COMPONENT: UpdatePasswordPage
 * ROLE: Re-securing account access via master key rotation.
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
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 selection:bg-blue-500/30">
            <motion.div 
                initial={{ opacity: 0, scale: 0.98, y: 10 }} 
                animate={{ opacity: 1, scale: 1, y: 0 }} 
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="w-full max-w-md"
            >
                <Card className="border-none shadow-2xl bg-white rounded-[2.5rem] overflow-hidden border border-slate-100/50">
                    {/* VISUAL SECURITY HEADER */}
                    <CardHeader className="pt-12 text-center bg-blue-600 text-white pb-10 relative">
                        <div className="absolute top-4 right-4 opacity-20">
                            <ShieldCheck size={40} />
                        </div>
                        <Lock className="h-10 w-10 mx-auto mb-4 drop-shadow-md" />
                        <CardTitle className="text-2xl font-black uppercase tracking-tighter">
                            New Master Key
                        </CardTitle>
                        <CardDescription className="text-blue-100 font-bold uppercase text-[9px] tracking-[0.2em] opacity-80">
                            Re-securing Sovereign Account Node
                        </CardDescription>
                    </CardHeader>

                    {/* FORM CONTENT */}
                    <CardContent className="p-10">
                        <form onSubmit={handleUpdate} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">
                                    Master Password
                                </label>
                                <div className="relative group">
                                    <Input 
                                        type={showPassword ? "text" : "password"} 
                                        className="h-14 rounded-xl bg-slate-50 border-slate-100 font-bold text-lg pr-12 focus:ring-2 focus:ring-blue-600/10 focus:border-blue-600 transition-all duration-200" 
                                        value={password} 
                                        onChange={(e) => setPassword(e.target.value)} 
                                        placeholder="••••••••••••"
                                        required 
                                        autoFocus
                                    />
                                    <button 
                                        type="button" 
                                        onClick={() => setShowPassword(!showPassword)} 
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-900 transition-colors"
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                                <p className="text-[9px] text-slate-400 px-1 font-medium">
                                    Minimum 8 characters required for master seal.
                                </p>
                            </div>

                            {/* SUBMIT ACTION */}
                            <Button 
                                type="submit" 
                                className="w-full h-14 bg-slate-900 hover:bg-black text-white font-black uppercase tracking-widest rounded-xl shadow-lg hover:shadow-xl active:scale-[0.98] transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed" 
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? (
                                    <div className="flex items-center gap-2">
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                        <span>Processing Seal...</span>
                                    </div>
                                ) : (
                                    "UPDATE IDENTITY SEAL"
                                )}
                            </Button>

                            {/* SECURITY DISCLAIMER */}
                            <div className="pt-4 text-center">
                                <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed">
                                    By updating this key, all previous sessions <br /> will be invalidated for security compliance.
                                </p>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
}