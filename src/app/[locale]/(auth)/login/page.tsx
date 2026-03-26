// src/app/(auth)/login/page.tsx
'use client';

import React, { useState, memo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm, Control } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

// UI Components & Icons
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Eye, EyeOff, Loader2, Rocket, ShieldCheck } from 'lucide-react';
import { FaGoogle, FaMicrosoft } from 'react-icons/fa';

// --- Schema and Types ---
const loginSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z.string().min(1, { message: "Password is required." }),
});
type LoginFormInput = z.infer<typeof loginSchema>;
type SsoProvider = 'google' | 'azure';

// --- Logic Hook ---
const useLogin = () => {
    const router = useRouter();
    const supabase = createClient();
    const [isSubmitting, setIsSubmitting] = useState<string | null>(null);
    const form = useForm<LoginFormInput>({
        resolver: zodResolver(loginSchema),
        defaultValues: { email: '', password: '' },
    });

    const handleEmailLogin = async (values: LoginFormInput) => {
        setIsSubmitting('email');
        const toastId = toast.loading('Authenticating...');
        const { error: signInError } = await supabase.auth.signInWithPassword(values);

        if (signInError) {
            toast.error(signInError.message, { id: toastId });
            setIsSubmitting(null);
            return;
        }

        const { data: profileData, error: profileError } = await supabase
            .rpc('get_user_business_profile');
        
        const profile = profileData ? profileData[0] : null;

        if (profileError || !profile) {
            toast.error('Critical Error: Business profile not found.', { id: toastId });
            await supabase.auth.signOut();
            setIsSubmitting(null);
            return;
        }

        toast.success('Access Granted. Welcome back.', { id: toastId });
        router.push('/dashboard');
    };

    const handleSsoLogin = async (provider: SsoProvider) => {
        setIsSubmitting(provider);
        const { error } = await supabase.auth.signInWithOAuth({
            provider,
            options: { redirectTo: `${window.location.origin}/auth/callback` },
        });
        if (error) {
            toast.error(`SSO Error: ${error.message}`);
            setIsSubmitting(null);
        }
    };
    
    return { form, isSubmitting, handleEmailLogin, handleSsoLogin };
};

// --- UI Sub-components ---
const PasswordInput = memo(({ control }: { control: Control<LoginFormInput> }) => {
    const [isVisible, setIsVisible] = useState(false);
    return (
        <FormField
            control={control}
            name="password"
            render={({ field }) => (
                <FormItem>
                    <FormLabel className="text-xs font-bold text-slate-700 uppercase">Password</FormLabel>
                    <div className="relative">
                        <FormControl>
                            <Input type={isVisible ? 'text' : 'password'} className="h-11 pr-10 border-slate-200" {...field} />
                        </FormControl>
                        <button type="button" onClick={() => setIsVisible(!isVisible)} className="absolute right-0 top-0 h-full px-3 text-slate-400 hover:text-blue-600 transition-colors" aria-label={isVisible ? "Hide" : "Show"}>
                            {isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                    </div>
                    <FormMessage />
                </FormItem>
            )}
        />
    );
});
PasswordInput.displayName = 'PasswordInput';

const SsoButton = memo(({ provider, icon: Icon, label, onClick, isSubmitting }: { provider: SsoProvider; icon: React.ElementType; label: string; onClick: (p: SsoProvider) => void; isSubmitting: string | null; }) => (
    <Button variant="outline" className="h-11 border-slate-200 font-semibold" onClick={() => onClick(provider)} disabled={!!isSubmitting}>
        {isSubmitting === provider ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Icon className="mr-2 h-4 w-4" />}
        {label}
    </Button>
));
SsoButton.displayName = 'SsoButton';

// --- Main Page Component ---
export default function LoginPage() {
    const { form, isSubmitting, handleEmailLogin, handleSsoLogin } = useLogin();

    return (
        <div className="min-h-screen bg-slate-950 relative flex items-center justify-center p-4 font-sans antialiased overflow-hidden">
            
            {/* --- PREMIUM MOTION BACKGROUND --- */}
            <div className="absolute inset-0 z-0 pointer-events-none">
                <motion.div
                    animate={{
                        scale: [1, 1.2, 1],
                        rotate: [0, 45, 0],
                        x: [-100, 100, -100],
                        y: [-50, 50, -50],
                    }}
                    transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
                    className="absolute top-[-20%] left-[-10%] w-[80%] h-[80%] rounded-full bg-blue-600/10 blur-[120px]"
                />
                <motion.div
                    animate={{
                        scale: [1.3, 1, 1.3],
                        rotate: [0, -45, 0],
                        x: [100, -100, 100],
                        y: [50, -50, 50],
                    }}
                    transition={{ duration: 35, repeat: Infinity, ease: "linear" }}
                    className="absolute bottom-[-20%] right-[-10%] w-[90%] h-[90%] rounded-full bg-blue-900/15 blur-[150px]"
                />
                <div className="absolute inset-0 bg-[url('/patterns/grid-light.svg')] opacity-[0.03] bg-[length:40px_40px]" />
            </div>

            <Card className="relative z-10 w-full max-w-md shadow-2xl bg-white/95 backdrop-blur-xl border-none rounded-2xl overflow-hidden">
                <CardHeader className="pt-10 pb-6 text-center space-y-2">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-blue-600 rounded-xl shadow-lg shadow-blue-600/20">
                            <Rocket className="h-8 w-8 text-white" />
                        </div>
                    </div>
                    <CardTitle className="text-2xl font-bold tracking-tight text-slate-900">Sign In</CardTitle>
                    <CardDescription className="text-slate-500 font-medium">Access your global business dashboard</CardDescription>
                </CardHeader>
                
                <CardContent className="px-8 pb-10 space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <SsoButton provider="google" label="Google" icon={FaGoogle} onClick={handleSsoLogin} isSubmitting={isSubmitting} />
                        <SsoButton provider="azure" label="Microsoft" icon={FaMicrosoft} onClick={handleSsoLogin} isSubmitting={isSubmitting} />
                    </div>
                    
                    <div className="relative py-2">
                        <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-200" /></div>
                        <div className="relative flex justify-center text-[10px] font-bold uppercase tracking-widest"><span className="bg-white px-3 text-slate-400">Secure Email Login</span></div>
                    </div>

                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(handleEmailLogin)} className="space-y-5">
                            <FormField control={form.control} name="email" render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-xs font-bold text-slate-700 uppercase tracking-tight">Work Email</FormLabel>
                                    <FormControl><Input type="email" placeholder="email@company.com" className="h-11 border-slate-200" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            
                            <PasswordInput control={form.control} />
                            
                            <Button type="submit" className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-lg transition-all active:scale-[0.98]" disabled={!!isSubmitting}>
                                {isSubmitting === 'email' ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Verifying...</> : "Sign In to Dashboard"}
                            </Button>
                        </form>
                    </Form>
                    
                    <div className="pt-4 border-t border-slate-100 text-center space-y-4">
                        <p className="text-sm text-slate-500 font-medium">
                            New to BBU1?{' '}
                            <Link href="/signup" className="font-bold text-blue-600 hover:underline">Create an account</Link>
                        </p>
                        
                        <div className="flex items-center justify-center gap-2 text-[10px] font-bold uppercase text-slate-300 tracking-widest">
                            <ShieldCheck className="h-3 w-3" />
                            Standard SSL Encrypted Session
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}