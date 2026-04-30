'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, ShieldCheck, Rocket, Lock, ShieldAlert, Fingerprint } from 'lucide-react';
import { motion } from 'framer-motion';

/**
 * LITONU BUSINESS BASE UNIVERSE LTD - AUTHORITATIVE IDENTITY ACTIVATION
 * 
 * DEEP FIX: Explicit Token Consumption.
 * This version physically extracts the access_token from the URL hash 
 * and forces Supabase to initialize the session. This prevents the "Timeout" 
 * error and ensures the employee is correctly remembered by the system.
 */
export default function AcceptInvitationPage() {
    const supabase = createClient();
    const router = useRouter();
    
    const [password, setPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [userEmail, setUserEmail] = useState<string | null>(null);
    const [verifying, setVerifying] = useState(true);

    // --- 1. THE DEEP IDENTITY HANDSHAKE ---
    const verifyIdentity = useCallback(async () => {
        try {
            // STEP A: Extract Hash Fragment Data
            // Supabase sends the token after the '#' symbol. 
            const hash = window.location.hash.substring(1);
            const params = new URLSearchParams(hash);
            
            const accessToken = params.get('access_token');
            const refreshToken = params.get('refresh_token');
            const type = params.get('type');

            // STEP B: IDENTITY PURGE (Conflict Prevention)
            // If the Architect is logged in, we must clear them out first.
            const { data: { session: existingSession } } = await supabase.auth.getSession();
            if (existingSession && (accessToken || type === 'invite')) {
                const { data: { user: currentUser } } = await supabase.auth.getUser();
                
                // If current user is NOT the one in the URL (or if we are testing), purge.
                console.warn("LITONU SECURITY: Conflicting identity detected. Purging session...");
                await supabase.auth.signOut();
                // Clear the hash and reload to start fresh with the new token
                window.location.reload();
                return;
            }

            // STEP C: FORCED TOKEN HANDSHAKE
            // If we have an access token but no session, we MANUALLY tell Supabase to use it.
            if (accessToken && refreshToken) {
                const { error: sessionError } = await supabase.auth.setSession({
                    access_token: accessToken,
                    refresh_token: refreshToken,
                });
                if (sessionError) throw sessionError;
            }

            // STEP D: FINAL IDENTITY RESOLUTION
            // Now that the session is forced, we fetch the invited user.
            const { data: { user }, error: userError } = await supabase.auth.getUser();
            
            if (userError) throw userError;

            if (user) {
                setUserEmail(user.email || null);
                setVerifying(false);
            } else {
                // If still no user, the link is either stale or corrupted.
                setError("Identity Handshake Failed: The security token is invalid or has already been consumed.");
                setVerifying(false);
            }
        } catch (err: any) {
            console.error("LITONU_HANDSHAKE_CRITICAL:", err);
            setError(err.message || "An internal security error occurred during the handshake.");
            setVerifying(false);
        }
    }, [supabase.auth]);

    useEffect(() => {
        verifyIdentity();
    }, [verifyIdentity]);


    // --- 2. IDENTITY SEALING PROTOCOL (Password Set) ---
    const handleSetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (password.length < 8) {
            toast.error("Security Breach: Password must be at least 8 characters.");
            return;
        }

        setIsSubmitting(true);
        const toastId = toast.loading("Sealing Identity to Global Node...");

        try {
            // Physically updates the employee's auth record
            const { error: updateError } = await supabase.auth.updateUser({
                password: password,
            });

            if (updateError) throw updateError;

            // Mark session as fully verified
            await supabase.auth.refreshSession();

            toast.success("Identity Sealed Successfully", { id: toastId });
            
            // Allow the system 1 second to propagate the new password to all nodes
            setTimeout(() => {
                window.location.href = '/dashboard';
            }, 1000);

        } catch (err: any) {
            console.error("LITONU_ACTIVATION_FAILURE:", err);
            toast.error("Activation Failed", { id: toastId, description: err.message });
            setIsSubmitting(false);
        }
    };
    

    // --- 3. ERROR RECOVERY VIEW ---
    if (error) {
        return (
            <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                    <Card className="w-full max-w-md border-none shadow-[0_0_50px_rgba(239,68,68,0.1)] bg-white rounded-[2.5rem] overflow-hidden">
                        <CardHeader className="text-center pt-14 px-12">
                            <div className="mx-auto h-20 w-20 bg-red-50 rounded-3xl flex items-center justify-center mb-8">
                                <ShieldAlert className="h-10 w-10 text-red-500" />
                            </div>
                            <CardTitle className="text-2xl font-black tracking-tighter text-slate-900 uppercase">Handshake Error</CardTitle>
                            <CardDescription className="font-bold text-slate-500 mt-4 leading-relaxed">
                                {error}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="pb-14 pt-8 px-12 text-center">
                            <Button 
                                onClick={() => window.location.reload()} 
                                className="w-full h-16 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl transition-all mb-4"
                            >
                                Restart Protocol
                            </Button>
                            <button 
                                onClick={() => router.push('/login')} 
                                className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-slate-900 transition-colors"
                            >
                                Return to Terminal
                            </button>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>
        );
    }

    // --- 4. SECURE INITIALIZATION VIEW ---
    if (verifying) {
        return (
            <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center text-white">
                <div className="relative mb-10">
                   <div className="absolute inset-0 bg-blue-500/20 blur-3xl animate-pulse rounded-full" />
                   <Fingerprint className="h-16 w-16 text-blue-500 relative z-10 animate-pulse" />
                </div>
                <p className="text-[11px] font-black uppercase tracking-[0.6em] animate-pulse text-center">
                    Authenticating Sovereign Identity...
                </p>
            </div>
        );
    }

    // --- 5. MAIN ACTIVATION TERMINAL ---
    return (
        <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6 relative overflow-hidden">
            {/* Ambient System Glow */}
            <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] bg-blue-600/10 blur-[150px] rounded-full" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[70%] h-[70%] bg-indigo-600/10 blur-[150px] rounded-full" />

            <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="relative z-10 w-full max-w-md">
                <Card className="border-none shadow-[0_40px_100px_-20px_rgba(0,0,0,0.8)] bg-white/95 backdrop-blur-2xl rounded-[3.5rem] overflow-hidden">
                    <CardHeader className="pt-16 pb-8 text-center space-y-6">
                        <div className="flex justify-center mb-2">
                            <div className="p-6 bg-blue-600 rounded-[2.2rem] shadow-2xl shadow-blue-600/40">
                                <Rocket className="h-10 w-10 text-white" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.4em]">
                                Verification Successful
                            </p>
                            <CardTitle className="text-3xl font-black tracking-tighter text-slate-900 uppercase italic">
                                Activate Account
                            </CardTitle>
                        </div>
                        <CardDescription className="text-slate-500 font-bold px-10 leading-relaxed text-sm">
                            Identity recognized as: <br/>
                            <span className="text-blue-600 font-black text-base">{userEmail}</span>
                        </CardDescription>
                    </CardHeader>
                    
                    <CardContent className="px-12 pb-16">
                        <form onSubmit={handleSetPassword} className="space-y-8">
                            <div className="space-y-3">
                                <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 ml-1">
                                    Set Master Access Key
                                </Label>
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="••••••••••••"
                                    className="h-16 rounded-2xl bg-slate-50 border-none focus-visible:ring-2 focus-visible:ring-blue-600 font-black text-2xl px-8 shadow-inner"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    autoComplete="new-password"
                                />
                                <div className="flex items-center gap-2 ml-1 opacity-60">
                                    <div className="h-1 w-1 rounded-full bg-blue-600" />
                                    <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Entropy Requirement: 8+ Characters</p>
                                </div>
                            </div>

                            <Button 
                                type="submit" 
                                className="w-full h-18 bg-slate-900 hover:bg-black text-white font-black uppercase tracking-[0.25em] rounded-2xl shadow-2xl shadow-slate-900/30 transition-all active:scale-[0.96] flex items-center justify-center gap-4 text-sm py-8" 
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="h-5 w-5 animate-spin" /> 
                                        <span>Sealing Identity...</span>
                                    </>
                                ) : (
                                    "Initialize Workspace"
                                )}
                            </Button>

                            <div className="flex items-center justify-center gap-3 pt-6 opacity-30">
                                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">
                                    Authoritative Node Secured
                                </span>
                            </div>
                        </form>
                    </CardContent>
                </Card>
                
                <p className="mt-10 text-center text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 opacity-40">
                    &copy; {new Date().getFullYear()} LITONU BUSINESS BASE UNIVERSE LTD
                </p>
            </motion.div>
        </div>
    );
}