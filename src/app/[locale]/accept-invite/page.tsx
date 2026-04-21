'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, ShieldCheck, Rocket, Lock } from 'lucide-react';
import { motion } from 'framer-motion';

/**
 * SOVEREIGN IDENTITY ACTIVATION PAGE - MASTER UPGRADE
 * Final puzzle piece for multi-tenant recognition and identity sealing.
 */
export default function AcceptInvitationPage() {
    const supabase = createClient();
    const router = useRouter();
    
    const [password, setPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [userEmail, setUserEmail] = useState<string | null>(null);
    const [verifying, setVerifying] = useState(true);

    // --- 1. THE DEEP SECURITY HANDSHAKE ---
    // Surgical resolution of the URL token into a valid session.
    const verifyIdentity = useCallback(async () => {
        try {
            // STEP A: Check for explicit Supabase errors in the URL fragment (e.g. #error=access_denied)
            const hashParams = new URLSearchParams(window.location.hash.substring(1));
            const errorCode = hashParams.get('error_code');
            const errorDesc = hashParams.get('error_description');

            if (errorCode || errorDesc) {
                setError(errorDesc?.replace(/\+/g, ' ') || "The invitation handshake was rejected.");
                setVerifying(false);
                return;
            }

            // STEP B: Immediate Session Check
            // We use getSession() because it's faster for fragment consumption.
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
            
            if (sessionError) throw sessionError;

            if (session?.user) {
                setUserEmail(session.user.email || null);
                setVerifying(false);
            } else {
                // STEP C: Retry Handshake
                // Occasionally Supabase needs a moment to digest the #access_token fragment.
                setTimeout(async () => {
                    const { data: { session: retrySession } } = await supabase.auth.getSession();
                    if (retrySession?.user) {
                        setUserEmail(retrySession.user.email || null);
                    } else {
                        // If no session after retry and no error in hash, link is likely stale/already used.
                        setError("Identity Handshake Failed. The link may have expired or was already used.");
                    }
                    setVerifying(false);
                }, 2000);
            }
        } catch (err: any) {
            console.error("HANDSHAKE_BREACH:", err);
            setError(err.message);
            setVerifying(false);
        }
    }, [supabase.auth]);

    useEffect(() => {
        verifyIdentity();
    }, [verifyIdentity]);


    // --- 2. IDENTITY SEALING PROTOCOL ---
    // Replaces the "Ghost Hash" with a master key to ensure permanent recognition.
    const handleSetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (password.length < 8) {
            toast.error("Security Breach: Password must be at least 8 characters.");
            return;
        }

        setIsSubmitting(true);
        const toastId = toast.loading("Sealing Sovereign Identity...");

        try {
            // STEP A: SECURE PASSWORD WELD
            // This replaces the ghost password and marks the account as fully confirmed.
            const { error: updateError } = await supabase.auth.updateUser({
                password: password,
            });

            if (updateError) throw updateError;

            // STEP B: REFRESH CONTEXT
            // Forces the session to update with the new password claims.
            await supabase.auth.refreshSession();

            toast.success("Identity Sealed Successfully", { id: toastId });
            
            // STEP C: NEURAL REDIRECT
            // refresh() ensures the Middleware catches the newly active session.
            router.refresh();
            setTimeout(() => {
                window.location.href = '/dashboard';
            }, 1000);

        } catch (err: any) {
            console.error("ACTIVATION_CRITICAL_FAILURE:", err);
            toast.error("Activation Failed", { id: toastId, description: err.message });
            setIsSubmitting(false);
        }
    };
    

    // --- 3. ERROR STATE UI ---
    if (error) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                    <Card className="w-full max-w-md border-none shadow-2xl bg-white rounded-[2.5rem] overflow-hidden">
                        <CardHeader className="text-center pt-12">
                            <div className="mx-auto h-20 w-20 bg-red-50 rounded-3xl flex items-center justify-center mb-6">
                                <Lock className="h-10 w-10 text-red-500" />
                            </div>
                            <CardTitle className="text-2xl font-black tracking-tighter text-slate-900 uppercase">Protocol Breach</CardTitle>
                            <CardDescription className="font-bold text-slate-500 px-6">{error}</CardDescription>
                        </CardHeader>
                        <CardContent className="pb-12 pt-6 px-10 text-center">
                            <Button 
                                onClick={() => router.push('/login')} 
                                className="w-full h-14 bg-slate-900 hover:bg-black text-white rounded-2xl font-black uppercase tracking-widest shadow-xl transition-all"
                            >
                                Return to Terminal
                            </Button>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>
        );
    }

    // --- 4. LOADING STATE UI ---
    if (verifying) {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
                <Loader2 className="h-12 w-12 animate-spin text-blue-500 mb-6" />
                <p className="text-[10px] font-black uppercase tracking-[0.4em] animate-pulse">Verifying Security Handshake...</p>
            </div>
        );
    }

    // --- 5. MAIN ACTIVATION UI ---
    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
            {/* Ambient Neural Background */}
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 blur-[120px] rounded-full" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-600/10 blur-[120px] rounded-full" />

            <motion.div 
                initial={{ opacity: 0, scale: 0.95 }} 
                animate={{ opacity: 1, scale: 1 }}
                className="relative z-10 w-full max-w-md"
            >
                <Card className="border-none shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] bg-white/95 backdrop-blur-xl rounded-[3.5rem] overflow-hidden">
                    <CardHeader className="pt-14 pb-6 text-center space-y-4">
                        <div className="flex justify-center mb-4">
                            <div className="p-5 bg-blue-600 rounded-[2rem] shadow-2xl shadow-blue-600/30">
                                <Rocket className="h-10 w-10 text-white" />
                            </div>
                        </div>
                        <CardTitle className="text-3xl font-black tracking-tighter text-slate-900 uppercase italic">
                            Activate Identity
                        </CardTitle>
                        <CardDescription className="text-slate-500 font-bold px-8 leading-relaxed">
                            Authorized personnel detected as <span className="text-blue-600 font-black">{userEmail}</span>. Set your master access key.
                        </CardDescription>
                    </CardHeader>
                    
                    <CardContent className="px-12 pb-14">
                        <form onSubmit={handleSetPassword} className="space-y-7">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 ml-1">
                                    Define Master Password
                                </Label>
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="••••••••••••"
                                    className="h-16 rounded-2xl bg-slate-50 border-none focus-visible:ring-2 focus-visible:ring-blue-600 font-black text-xl px-6"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    autoComplete="new-password"
                                />
                                <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest ml-1">Complexity Requirement: 8+ Characters</p>
                            </div>

                            <Button 
                                type="submit" 
                                className="w-full h-16 bg-slate-900 hover:bg-black text-white font-black uppercase tracking-[0.2em] rounded-2xl shadow-2xl shadow-slate-900/20 transition-all active:scale-[0.97] flex items-center justify-center gap-3" 
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="h-5 w-5 animate-spin" /> 
                                        <span>Executing Protocol...</span>
                                    </>
                                ) : (
                                    "Initialize Dashboard"
                                )}
                            </Button>

                            <div className="flex items-center justify-center gap-2 pt-4 opacity-40">
                                <ShieldCheck className="h-4 w-4 text-emerald-500" />
                                <span className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">
                                    AES-256 Sovereign Encryption
                                </span>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
}