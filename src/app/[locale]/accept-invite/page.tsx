'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
    Loader2, 
    ShieldCheck, 
    Rocket, 
    Lock, 
    ShieldAlert, 
    Fingerprint, 
    Eye, 
    EyeOff 
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function AcceptInvitationPage() {
    const supabase = createClient();
    const router = useRouter();
    
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [userEmail, setUserEmail] = useState<string | null>(null);
    const [verifying, setVerifying] = useState(true);

    // --- 1. THE DEEP IDENTITY HANDSHAKE (Logic Unchanged) ---
    const verifyIdentity = useCallback(async () => {
        try {
            const hash = window.location.hash.substring(1);
            const params = new URLSearchParams(hash);
            
            const accessToken = params.get('access_token');
            const refreshToken = params.get('refresh_token');
            const type = params.get('type');

            const { data: { session: existingSession } } = await supabase.auth.getSession();
            if (existingSession && (accessToken || type === 'invite')) {
                console.warn("LITONU SECURITY: Conflicting identity detected. Purging session...");
                await supabase.auth.signOut();
                window.location.reload();
                return;
            }

            if (accessToken && refreshToken) {
                const { error: sessionError } = await supabase.auth.setSession({
                    access_token: accessToken,
                    refresh_token: refreshToken,
                });
                if (sessionError) throw sessionError;
            }

            const { data: { user }, error: userError } = await supabase.auth.getUser();
            
            if (userError) throw userError;

            if (user) {
                setUserEmail(user.email || null);
                setVerifying(false);
            } else {
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

    // --- 2. IDENTITY SEALING PROTOCOL (Logic Unchanged) ---
    const handleSetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (password.length < 8) {
            toast.error("Security Breach: Password must be at least 8 characters.");
            return;
        }

        setIsSubmitting(true);
        const toastId = toast.loading("Sealing Identity to Global Node...");

        try {
            const { error: updateError } = await supabase.auth.updateUser({
                password: password,
            });

            if (updateError) throw updateError;

            await supabase.auth.refreshSession();

            toast.success("Identity Sealed Successfully", { id: toastId });
            
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
            <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                    <Card className="w-full max-w-md border-none shadow-2xl bg-white rounded-[2rem] overflow-hidden">
                        <CardHeader className="text-center pt-12 px-10">
                            <div className="mx-auto h-16 w-16 bg-red-50 rounded-2xl flex items-center justify-center mb-6">
                                <ShieldAlert className="h-8 w-8 text-red-500" />
                            </div>
                            <CardTitle className="text-xl font-bold tracking-tight text-slate-900 uppercase">Handshake Error</CardTitle>
                            <CardDescription className="font-medium text-slate-500 mt-2">
                                {error}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="pb-12 pt-6 px-10 text-center">
                            <Button 
                                onClick={() => window.location.reload()} 
                                className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold uppercase tracking-wider transition-all mb-4"
                            >
                                Restart Protocol
                            </Button>
                            <button 
                                onClick={() => router.push('/login')} 
                                className="text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-colors"
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
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center">
                <div className="relative mb-8">
                   <div className="absolute inset-0 bg-blue-500/20 blur-3xl animate-pulse rounded-full" />
                   <Fingerprint className="h-12 w-12 text-blue-500 relative z-10 animate-pulse" />
                </div>
                <p className="text-[10px] font-bold text-blue-400 uppercase tracking-[0.5em] animate-pulse">
                    Authenticating Identity...
                </p>
            </div>
        );
    }

    // --- 5. MAIN ACTIVATION TERMINAL ---
    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 relative overflow-hidden">
            {/* Ambient Background Accents */}
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/5 blur-[120px] rounded-full pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-600/5 blur-[120px] rounded-full pointer-events-none" />

            <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="relative z-10 w-full max-w-md">
                <Card className="border-none shadow-2xl bg-white/95 backdrop-blur-xl rounded-[2.5rem] overflow-hidden">
                    <CardHeader className="pt-12 pb-6 text-center">
                        <div className="flex justify-center mb-6">
                            <div className="p-4 bg-blue-600 rounded-2xl shadow-xl shadow-blue-600/20">
                                <Rocket className="h-8 w-8 text-white" />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <p className="text-[10px] font-bold text-blue-600 uppercase tracking-[0.3em]">
                                Verification Successful
                            </p>
                            <CardTitle className="text-2xl font-bold tracking-tight text-slate-900 uppercase italic">
                                Activate Account
                            </CardTitle>
                        </div>
                        <CardDescription className="text-slate-500 font-medium pt-4">
                            Recognized Identity: <br/>
                            <span className="text-slate-900 font-bold text-sm">{userEmail}</span>
                        </CardDescription>
                    </CardHeader>
                    
                    <CardContent className="px-10 pb-12">
                        <form onSubmit={handleSetPassword} className="space-y-6">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">
                                    Set Master Access Key
                                </Label>
                                <div className="relative">
                                    <Input
                                        id="password"
                                        type={showPassword ? "text" : "password"}
                                        placeholder="••••••••••••"
                                        className="h-14 rounded-xl bg-slate-50 border-slate-100 focus-visible:ring-2 focus-visible:ring-blue-600 font-bold text-lg px-6 pr-12 shadow-sm"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        autoComplete="new-password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition-colors"
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                                <p className="text-[9px] text-slate-400 font-medium ml-1 uppercase tracking-wider">Requirement: 8+ Characters</p>
                            </div>

                            <Button 
                                type="submit" 
                                className="w-full h-14 bg-slate-900 hover:bg-black text-white font-bold uppercase tracking-widest rounded-xl shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-3 text-xs" 
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" /> 
                                        <span>Sealing Identity...</span>
                                    </>
                                ) : (
                                    "Initialize Workspace"
                                )}
                            </Button>

                            <div className="flex items-center justify-center gap-2 pt-4 opacity-40">
                                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                                <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500">
                                    Authoritative Node Secured
                                </span>
                            </div>
                        </form>
                    </CardContent>
                </Card>
                
                <div className="mt-8 text-center">
                    <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-slate-500 opacity-50">
                        &copy; {new Date().getFullYear()} LITONU BUSINESS BASE UNIVERSE LTD
                    </p>
                </div>
            </motion.div>
        </div>
    );
}