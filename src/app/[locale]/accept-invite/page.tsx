'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, ShieldCheck, Rocket, Lock, UserMinus, Building2 } from 'lucide-react';
import { motion } from 'framer-motion';

/**
 * LITONU BUSINESS BASE UNIVERSE LTD - IDENTITY ACTIVATION TERMINAL
 * 
 * UPGRADE: This page now handles "Identity Separation."
 * If a Business Owner is logged in and clicks an employee's invite link, 
 * the system will automatically log the owner out to prevent an account overwrite.
 */
export default function AcceptInvitationPage() {
    const supabase = createClient();
    const router = useRouter();
    
    const [password, setPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [userEmail, setUserEmail] = useState<string | null>(null);
    const [verifying, setVerifying] = useState(true);

    // --- 1. THE AUTHORITATIVE SECURITY HANDSHAKE ---
    // This ensures we are activating the correct person and clearing any old sessions.
    const verifyIdentity = useCallback(async () => {
        try {
            // STEP A: Detect the invitation token from the URL
            const hashParams = new URLSearchParams(window.location.hash.substring(1));
            const accessToken = hashParams.get('access_token');
            const type = hashParams.get('type');

            // STEP B: THE IDENTITY PURGE (CRITICAL FIX)
            // If we detect an invitation link but someone is already logged in (e.g. the Owner),
            // we must clear that session to prevent the "Identity Leak" you experienced.
            const { data: { session } } = await supabase.auth.getSession();

            if (session && (accessToken || type === 'invite')) {
                console.warn("LITONU SECURITY: Conflicting session detected. Purging background identity...");
                // We sign out the current user to make room for the new employee identity
                await supabase.auth.signOut();
                // We reload to allow Supabase to process the invitation token cleanly
                window.location.reload();
                return;
            }

            // STEP C: Check for handshake errors (expired links, etc.)
            const errorCode = hashParams.get('error_code');
            const errorDesc = hashParams.get('error_description');

            if (errorCode || errorDesc) {
                setError(errorDesc?.replace(/\+/g, ' ') || "The invitation link has expired or is invalid.");
                setVerifying(false);
                return;
            }

            // STEP D: Resolve the New Identity
            // Now that the old session is purged, we fetch the invited user's details.
            const { data: { user }, error: userError } = await supabase.auth.getUser();
            
            if (userError) throw userError;

            if (user) {
                setUserEmail(user.email || null);
                setVerifying(false);
            } else {
                setError("Authorized identity not found. Please contact your business administrator.");
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
    // This officially sets the employee's password and seals their account.
    const handleSetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (password.length < 8) {
            toast.error("Security Requirement: Password must be at least 8 characters.");
            return;
        }

        setIsSubmitting(true);
        const toastId = toast.loading("Activating your business identity...");

        try {
            // STEP A: Set the new master password
            const { error: updateError } = await supabase.auth.updateUser({
                password: password,
            });

            if (updateError) throw updateError;

            // STEP B: Finalize the session
            await supabase.auth.refreshSession();

            toast.success("Account Activated Successfully", { id: toastId });
            
            // STEP C: Redirect to the correct Business Node
            router.refresh();
            setTimeout(() => {
                window.location.href = '/dashboard';
            }, 1500);

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
                        <CardHeader className="text-center pt-12">
                            <div className="mx-auto h-20 w-20 bg-red-50 rounded-3xl flex items-center justify-center mb-6">
                                <Lock className="h-10 w-10 text-red-500" />
                            </div>
                            <CardTitle className="text-2xl font-black tracking-tighter text-slate-900 uppercase">Access Denied</CardTitle>
                            <CardDescription className="font-bold text-slate-500 px-6 leading-relaxed">
                                {error}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="pb-12 pt-6 px-10 text-center">
                            <Button 
                                onClick={() => router.push('/login')} 
                                className="w-full h-14 bg-slate-900 hover:bg-black text-white rounded-2xl font-black uppercase tracking-widest shadow-xl transition-all"
                            >
                                Return to Login
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
                <Loader2 className="h-12 w-12 animate-spin text-blue-500 mb-6" />
                <p className="text-[10px] font-black uppercase tracking-[0.4em] animate-pulse text-center">
                    Verifying Identity... <br/>
                    <span className="text-[8px] text-slate-500 mt-2 block">Clearing background sessions for security.</span>
                </p>
            </div>
        );
    }

    // --- 5. MAIN ACTIVATION VIEW ---
    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
            {/* Professional Background Elements */}
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
                                <Building2 className="h-10 w-10 text-white" />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em]">
                                Litonu Business Base Universe
                            </p>
                            <CardTitle className="text-3xl font-black tracking-tighter text-slate-900 uppercase italic">
                                Activate Account
                            </CardTitle>
                        </div>
                        <CardDescription className="text-slate-500 font-bold px-8 leading-relaxed">
                            Welcome. You are joining as <span className="text-blue-600 font-black">{userEmail}</span>. Please set your secure access password.
                        </CardDescription>
                    </CardHeader>
                    
                    <CardContent className="px-12 pb-14">
                        <form onSubmit={handleSetPassword} className="space-y-7">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 ml-1">
                                    New Account Password
                                </Label>
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="••••••••"
                                    className="h-16 rounded-2xl bg-slate-50 border-none focus-visible:ring-2 focus-visible:ring-blue-600 font-black text-xl px-6"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    autoComplete="new-password"
                                />
                                <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest ml-1">Requirement: 8 or more characters</p>
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
                                    "Complete Activation"
                                )}
                            </Button>

                            <div className="flex items-center justify-center gap-2 pt-4 opacity-40">
                                <ShieldCheck className="h-4 w-4 text-emerald-500" />
                                <span className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">
                                    Verified Secure Infrastructure
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