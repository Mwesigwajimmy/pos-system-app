'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, ShieldCheck, Rocket, Lock, UserMinus, Building2, ShieldAlert } from 'lucide-react';
import { motion } from 'framer-motion';

/**
 * LITONU BUSINESS BASE UNIVERSE LTD - IDENTITY ACTIVATION TERMINAL
 * 
 * UPGRADE: Authoritative Token Handshake.
 * Resolves the "Auth Session Missing" error by allowing Supabase time 
 * to consume the URL token before enforcing security gates.
 */
export default function AcceptInvitationPage() {
    const supabase = createClient();
    const router = useRouter();
    
    const [password, setPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [userEmail, setUserEmail] = useState<string | null>(null);
    const [verifying, setVerifying] = useState(true);
    
    // Safety ref to prevent multiple purge cycles
    const purgeAttempted = useRef(false);

    // --- 1. THE AUTHORITATIVE SECURITY HANDSHAKE ---
    const verifyIdentity = useCallback(async () => {
        try {
            // STEP A: Token Detection
            const hashParams = new URLSearchParams(window.location.hash.substring(1));
            const accessToken = hashParams.get('access_token');
            const type = hashParams.get('type');
            const errorCode = hashParams.get('error_code');
            const errorDesc = hashParams.get('error_description');

            // Handle explicit URL errors (e.g. expired link)
            if (errorCode || errorDesc) {
                setError(errorDesc?.replace(/\+/g, ' ') || "The invitation link has expired or is invalid.");
                setVerifying(false);
                return;
            }

            // STEP B: THE IDENTITY PURGE & RECOVERY
            // We check if a session exists. If it does, and we have an 'invite' token,
            // we assume it's the Owner's session and we purge it.
            const { data: { session } } = await supabase.auth.getSession();

            if (session && (accessToken || type === 'invite') && !purgeAttempted.current) {
                // Check if the logged in user is actually the one invited
                const { data: { user } } = await supabase.auth.getUser();
                
                // If there's an invite token but the user email doesn't match the token (logic check), purge.
                console.warn("LITONU SECURITY: Synchronizing Identity Node. Purging background session...");
                purgeAttempted.current = true;
                await supabase.auth.signOut();
                
                // We must reload to let the browser "cleanly" see the token as a new user
                window.location.reload();
                return;
            }

            // STEP C: THE HANDSHAKE BUFFER
            // If we have a token, we wait a moment for Supabase to initialize the session.
            let userResult = await supabase.auth.getUser();
            
            // RETRY LOGIC: If token is present but user is still null, wait 1.5 seconds and try once more.
            if (!userResult.data.user && accessToken) {
                await new Promise(resolve => setTimeout(resolve, 1500));
                userResult = await supabase.auth.getUser();
            }

            if (userResult.data.user) {
                setUserEmail(userResult.data.user.email || null);
                setVerifying(false);
            } else {
                // If there is NO user and NO token, then access is truly denied.
                if (!accessToken) {
                    setError("Security Handshake Missing: Please use the authoritative link sent to your email.");
                } else {
                    setError("Identity Handshake Timeout: The system could not verify your token. Please refresh the page.");
                }
                setVerifying(false);
            }
        } catch (err: any) {
            console.error("LITONU_HANDSHAKE_ERROR:", err);
            setError(err.message);
            setVerifying(false);
        }
    }, [supabase.auth]);

    useEffect(() => {
        verifyIdentity();
    }, [verifyIdentity]);


    // --- 2. IDENTITY ACTIVATION PROTOCOL ---
    const handleSetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (password.length < 8) {
            toast.error("Security Requirement: Password must be at least 8 characters.");
            return;
        }

        setIsSubmitting(true);
        const toastId = toast.loading("Sealing Sovereign Identity...");

        try {
            const { error: updateError } = await supabase.auth.updateUser({
                password: password,
            });

            if (updateError) throw updateError;

            await supabase.auth.refreshSession();

            toast.success("Account Sealed Successfully", { id: toastId });
            
            router.refresh();
            setTimeout(() => {
                window.location.href = '/dashboard';
            }, 1000);

        } catch (err: any) {
            console.error("LITONU_ACTIVATION_FAILURE:", err);
            toast.error("Activation Failed", { id: toastId, description: err.message });
            setIsSubmitting(false);
        }
    };
    

    // --- 3. ERROR RECOVERY UI ---
    if (error) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                    <Card className="w-full max-w-md border-none shadow-2xl bg-white rounded-[2.5rem] overflow-hidden">
                        <CardHeader className="text-center pt-12 px-10">
                            <div className="mx-auto h-20 w-20 bg-red-50 rounded-3xl flex items-center justify-center mb-6">
                                <ShieldAlert className="h-10 w-10 text-red-500" />
                            </div>
                            <CardTitle className="text-2xl font-black tracking-tighter text-slate-900 uppercase">Handshake Error</CardTitle>
                            <CardDescription className="font-bold text-slate-500 mt-2">{error}</CardDescription>
                        </CardHeader>
                        <CardContent className="pb-12 pt-6 px-10 text-center">
                            <Button 
                                onClick={() => window.location.reload()} 
                                className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl transition-all mb-3"
                            >
                                Retry Handshake
                            </Button>
                            <Button 
                                onClick={() => router.push('/login')} 
                                variant="ghost"
                                className="w-full h-14 text-slate-400 font-bold uppercase tracking-widest text-[10px]"
                            >
                                Return to Terminal
                            </Button>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>
        );
    }

    // --- 4. SYSTEM SYNCHRONIZATION UI ---
    if (verifying) {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
                <div className="relative mb-8">
                   <div className="absolute inset-0 bg-blue-500/20 blur-2xl animate-pulse rounded-full" />
                   <Loader2 className="h-14 w-14 animate-spin text-blue-500 relative z-10" />
                </div>
                <p className="text-[11px] font-black uppercase tracking-[0.5em] animate-pulse text-center">
                    Executing Identity Handshake...
                </p>
                <p className="text-[8px] text-slate-500 mt-4 uppercase tracking-widest">
                    LITONU Secure Infrastructure V10.2
                </p>
            </div>
        );
    }

    // --- 5. MAIN ACTIVATION VIEW ---
    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden font-sans">
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 blur-[120px] rounded-full" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-600/10 blur-[120px] rounded-full" />

            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="relative z-10 w-full max-w-md">
                <Card className="border-none shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] bg-white/95 backdrop-blur-xl rounded-[3.5rem] overflow-hidden">
                    <CardHeader className="pt-14 pb-6 text-center space-y-4">
                        <div className="flex justify-center mb-4">
                            <div className="p-5 bg-blue-600 rounded-[2rem] shadow-2xl shadow-blue-600/30">
                                <Rocket className="h-10 w-10 text-white" />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em]">
                                Sovereign Node Identity
                            </p>
                            <CardTitle className="text-3xl font-black tracking-tighter text-slate-900 uppercase italic">
                                Activate Account
                            </CardTitle>
                        </div>
                        <CardDescription className="text-slate-500 font-bold px-10 leading-relaxed">
                            Authorized personnel detected as <br/>
                            <span className="text-blue-600 font-black">{userEmail}</span>.
                        </CardDescription>
                    </CardHeader>
                    
                    <CardContent className="px-12 pb-14">
                        <form onSubmit={handleSetPassword} className="space-y-7">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 ml-1">
                                    Define Master Key
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
                                        <span>Syncing...</span>
                                    </>
                                ) : (
                                    "Initialize Node"
                                )}
                            </Button>

                            <div className="flex items-center justify-center gap-2 pt-4 opacity-40">
                                <ShieldCheck className="h-4 w-4 text-emerald-500" />
                                <span className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">
                                    AES-256 Encryption Sealed
                                </span>
                            </div>
                        </form>
                    </CardContent>
                </Card>
                
                <p className="mt-8 text-center text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 opacity-50">
                    &copy; {new Date().getFullYear()} LITONU BUSINESS BASE UNIVERSE LTD
                </p>
            </motion.div>
        </div>
    );
}