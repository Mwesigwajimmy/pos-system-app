'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, ShieldCheck, Rocket, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * SOVEREIGN IDENTITY ACTIVATION PAGE
 * Handles the final step of the invitation protocol.
 */
export default function AcceptInvitationPage() {
    const supabase = createClient();
    const router = useRouter();
    
    const [password, setPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [userEmail, setUserEmail] = useState<string | null>(null);

    // --- 1. IDENTITY HANDSHAKE ---
    // Listens for the session created by the #access_token in the email link
    useEffect(() => {
        const { data: authListener } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                // When Supabase consumes the invitation token, it signs the user in temporarily
                if (event === 'SIGNED_IN' || event === 'PASSWORD_RECOVERY') {
                    const { data: { user } } = await supabase.auth.getUser();
                    setUserEmail(user?.email || null);
                }
            }
        );
        
        // Immediate verification fallback
        const verifySession = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setUserEmail(user.email || null);
            } else {
                // Check if we are actually in a recovery/invite flow
                const hash = window.location.hash;
                if (!hash.includes('access_token') && !hash.includes('type=invite')) {
                    setError("This invitation link is invalid, expired, or has already been used.");
                }
            }
        };

        verifySession();

        return () => {
            authListener.subscription.unsubscribe();
        };
    }, [supabase.auth]);


    // --- 2. ACTIVATION PROTOCOL ---
    const handleSetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (password.length < 8) {
            toast.error("Security Requirement: Password must be at least 8 characters.");
            return;
        }

        setIsSubmitting(true);
        const toastId = toast.loading("Finalizing your sovereign identity...");

        try {
            // STEP A: SECURE PASSWORD UPDATE
            // This consumes the invitation and makes the user's session permanent.
            const { error: updateError } = await supabase.auth.updateUser({
                password: password,
            });

            if (updateError) throw updateError;

            // STEP B: INITIALIZE CONTEXT
            // We refresh the session to ensure all JWT metadata is synced with the DB
            await supabase.auth.refreshSession();

            toast.success("Account Activated! Welcome to the Enterprise.", { id: toastId });
            
            // STEP C: NEURAL HANDOFF
            // router.refresh() triggers the Middleware, which will now see 'setup_complete: true'
            // and Jimmy's specific role, routing him to the correct dashboard.
            router.refresh();
            setTimeout(() => {
                router.push('/dashboard');
            }, 1000);

        } catch (err: any) {
            console.error("ACTIVATION_CRITICAL_FAILURE:", err);
            toast.error("Activation Failed", { id: toastId, description: err.message });
            setError(err.message);
            setIsSubmitting(false);
        }
    };
    

    // --- 3. ERROR STATE UI ---
    if (error) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                    <Card className="w-full max-w-md border-none shadow-2xl bg-white/95 backdrop-blur-xl rounded-[2.5rem]">
                        <CardHeader className="text-center pt-10">
                            <div className="mx-auto h-16 w-16 bg-red-50 rounded-full flex items-center justify-center mb-4">
                                <Lock className="h-8 w-8 text-red-500" />
                            </div>
                            <CardTitle className="text-2xl font-black tracking-tighter text-slate-900 uppercase">Protocol Error</CardTitle>
                            <CardDescription className="font-medium text-slate-500">{error}</CardDescription>
                        </CardHeader>
                        <CardContent className="pb-10 text-center">
                            <Button onClick={() => router.push('/login')} className="w-full h-12 bg-slate-900 rounded-2xl font-bold uppercase tracking-widest">
                                Return to Login
                            </Button>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>
        );
    }

    // --- 4. LOADING STATE UI ---
    if (!userEmail) {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
                <Loader2 className="h-12 w-12 animate-spin text-blue-500 mb-4" />
                <p className="text-sm font-black uppercase tracking-[0.3em] animate-pulse">Verifying Security Handshake...</p>
            </div>
        );
    }

    // --- 5. MAIN ACTIVATION UI ---
    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
            {/* Ambient Background Elements */}
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 blur-[120px] rounded-full" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-600/10 blur-[120px] rounded-full" />

            <motion.div 
                initial={{ opacity: 0, scale: 0.95 }} 
                animate={{ opacity: 1, scale: 1 }}
                className="relative z-10 w-full max-w-md"
            >
                <Card className="border-none shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] bg-white/95 backdrop-blur-xl rounded-[3rem] overflow-hidden">
                    <CardHeader className="pt-12 pb-6 text-center space-y-2">
                        <div className="flex justify-center mb-6">
                            <div className="p-4 bg-blue-600 rounded-2xl shadow-xl shadow-blue-600/20">
                                <Rocket className="h-10 w-10 text-white" />
                            </div>
                        </div>
                        <CardTitle className="text-3xl font-black tracking-tighter text-slate-900 uppercase">
                            Activate Identity
                        </CardTitle>
                        <CardDescription className="text-slate-500 font-bold px-4">
                            Set a secure password for <span className="text-blue-600">{userEmail}</span> to join the organization.
                        </CardDescription>
                    </CardHeader>
                    
                    <CardContent className="px-10 pb-12">
                        <form onSubmit={handleSetPassword} className="space-y-6">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">
                                    Create New Password
                                </Label>
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="••••••••"
                                    className="h-14 rounded-2xl bg-slate-50 border-none focus-visible:ring-2 focus-visible:ring-blue-600 font-bold text-lg"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    autoComplete="new-password"
                                />
                                <p className="text-[10px] text-slate-400 font-bold ml-1">Minimum 8 characters with high complexity recommended.</p>
                            </div>

                            <Button 
                                type="submit" 
                                className="w-full h-14 bg-slate-900 hover:bg-black text-white font-black uppercase tracking-[0.15em] rounded-2xl shadow-xl transition-all active:scale-[0.98]" 
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? (
                                    <span className="flex items-center gap-2">
                                        <Loader2 className="h-5 w-5 animate-spin" /> Finalizing Protocol...
                                    </span>
                                ) : (
                                    "Initialize Dashboard"
                                )}
                            </Button>

                            <div className="flex items-center justify-center gap-2 pt-4">
                                <ShieldCheck className="h-4 w-4 text-emerald-500" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    AES-256 Bit Encrypted Session
                                </span>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
}