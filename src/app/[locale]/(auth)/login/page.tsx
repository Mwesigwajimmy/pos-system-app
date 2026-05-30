'use client';

/**
 * --- BBU1 SOVEREIGN ACCESS PORTAL ---
 * COMPONENT: LoginPage
 * ROLE: Primary entry point for authorized business personnel.
 * 
 * DEEP LOGIC INTEGRATION:
 * 1. Locale-Aware Routing: Ensures navigation persists within [locale] context.
 * 2. Identity Recovery: Links directly to the hardened ForgotPassword node.
 * 3. SSO Handshake: Managed via Supabase OAuth 2.0.
 * 4. MFA-Ready: Structure supports future second-factor implementation.
 * 5. Visual Theme: Professional Sovereign White (Slate-50).
 */

import React, { useState, memo } from 'react';
import { useRouter, useParams } from 'next/navigation'; 
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
import { Eye, EyeOff, Loader2, ShieldCheck } from 'lucide-react';
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
    const params = useParams(); 
    const locale = params?.locale || 'en';
    const supabase = createClient();
    const [isSubmitting, setIsSubmitting] = useState<string | null>(null);
    const form = useForm<LoginFormInput>({
        resolver: zodResolver(loginSchema),
        defaultValues: { email: '', password: '' },
    });

    const handleEmailLogin = async (values: LoginFormInput) => {
        setIsSubmitting('email');
        const toastId = toast.loading('Verifying Identity...');
        
        const { error: signInError } = await supabase.auth.signInWithPassword(values);

        if (signInError) {
            const errorMessage = signInError.status === 400 
                ? "Invalid credentials. Check your master key." 
                : signInError.message;
                
            toast.error(errorMessage, { id: toastId });
            setIsSubmitting(null);
            return;
        }

        const { data: profileData, error: profileError } = await supabase
            .rpc('get_user_business_profile');
        
        const profile = profileData ? profileData[0] : null;

        if (profileError || !profile) {
            toast.error('Identity Conflict: Business profile not resolved.', { id: toastId });
            await supabase.auth.signOut();
            setIsSubmitting(null);
            return;
        }

        toast.success('Access Granted. Welcome back.', { id: toastId });
        router.push(`/${locale}/dashboard`);
    };

    const handleSsoLogin = async (provider: SsoProvider) => {
        setIsSubmitting(provider);
        const locale = params?.locale || 'en';
        
        const { error } = await supabase.auth.signInWithOAuth({
            provider,
            options: { 
                // DEEP WELD FIX: Removing '/auth/' because of Route Group configuration
                redirectTo: `${window.location.origin}/${locale}/callback` 
            },
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
    const params = useParams();
    const locale = params?.locale || 'en';

    return (
        <FormField
            control={control}
            name="password"
            render={({ field }) => (
                <FormItem>
                    <div className="flex items-center justify-between">
                        <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-tight">Master Password</FormLabel>
                        <Link 
                            href={`/${locale}/forgot-password`} 
                            className="text-[10px] font-black text-blue-600 hover:underline uppercase tracking-tighter"
                        >
                            Forgot Key?
                        </Link>
                    </div>
                    <div className="relative">
                        <FormControl>
                            <Input 
                                type={isVisible ? 'text' : 'password'} 
                                className="h-12 pr-10 border-slate-100 bg-slate-50/50 rounded-xl font-bold shadow-inner" 
                                {...field} 
                            />
                        </FormControl>
                        <button type="button" onClick={() => setIsVisible(!isVisible)} className="absolute right-0 top-0 h-full px-4 text-slate-300 hover:text-blue-600 transition-colors" aria-label={isVisible ? "Hide" : "Show"}>
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
    <Button 
        variant="outline" 
        className="h-12 border-slate-100 bg-slate-50/50 hover:bg-slate-100 font-black uppercase text-[10px] tracking-widest rounded-xl transition-all" 
        onClick={() => onClick(provider)} 
        disabled={!!isSubmitting}
    >
        {isSubmitting === provider ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Icon className="mr-2 h-4 w-4 text-slate-600" />}
        {label}
    </Button>
));
SsoButton.displayName = 'SsoButton';

// --- Main Page Component ---
export default function LoginPage() {
    const { form, isSubmitting, handleEmailLogin, handleSsoLogin } = useLogin();
    const params = useParams();
    const locale = params?.locale || 'en';

    return (
        <div className="min-h-screen bg-slate-50 relative flex items-center justify-center p-4 font-sans antialiased overflow-hidden">
            
            {/* --- PROFESSIONAL SOVEREIGN BACKGROUND GRID --- */}
            <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.04] bg-[url('/patterns/grid-dark.svg')] bg-[length:40px_40px]" />

            <Card className="relative z-10 w-full max-w-md shadow-xl border-slate-200 bg-white rounded-[2.5rem] overflow-hidden border-none">
                <CardHeader className="pt-12 pb-6 text-center space-y-4">
                    <div className="flex justify-center mb-2">
                        {/* THE B-LOGO INTEGRATION */}
                        <img 
                            src="/logo.png" 
                            alt="BBU1 Logo" 
                            className="h-20 w-20 object-contain drop-shadow-sm" 
                        />
                    </div>
                    <CardTitle className="text-3xl font-black uppercase tracking-tighter text-slate-900">Sign In</CardTitle>
                    <CardDescription className="text-slate-400 font-bold uppercase text-[9px] tracking-[0.2em]">Global Sovereign Dashboard</CardDescription>
                </CardHeader>
                
                <CardContent className="px-10 pb-12 space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <SsoButton provider="google" label="Google" icon={FaGoogle} onClick={handleSsoLogin} isSubmitting={isSubmitting} />
                        <SsoButton provider="azure" label="Microsoft" icon={FaMicrosoft} onClick={handleSsoLogin} isSubmitting={isSubmitting} />
                    </div>
                    
                    <div className="relative py-4">
                        <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-100" /></div>
                        <div className="relative flex justify-center text-[9px] font-black uppercase tracking-widest"><span className="bg-white px-4 text-slate-300">Identity Protocol</span></div>
                    </div>

                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(handleEmailLogin)} className="space-y-6">
                            <FormField control={form.control} name="email" render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-tight">Work Email</FormLabel>
                                    <FormControl>
                                        <Input 
                                            type="email" 
                                            placeholder="admin@bbu1.com" 
                                            className="h-12 border-slate-100 bg-slate-50/50 rounded-xl font-bold" 
                                            {...field} 
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            
                            <PasswordInput control={form.control} />
                            
                            <Button 
                                type="submit" 
                                className="w-full h-14 bg-slate-900 hover:bg-black text-white font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-slate-100 transition-all active:scale-[0.98]" 
                                disabled={!!isSubmitting}
                            >
                                {isSubmitting === 'email' ? (
                                    <div className="flex items-center gap-2">
                                        <Loader2 className="h-5 w-5 animate-spin" /> 
                                        <span>Authorizing...</span>
                                    </div>
                                ) : "Authorize Access"}
                            </Button>
                        </form>
                    </Form>
                    
                    <div className="pt-6 border-t border-slate-50 text-center space-y-4">
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                            New Node Account?{' '}
                            <Link href={`/${locale}/signup`} className="text-blue-600 hover:underline">Register Here</Link>
                        </p>
                        
                        <div className="flex items-center justify-center gap-2 text-[8px] font-black uppercase text-slate-300 tracking-[0.3em]">
                            <ShieldCheck className="h-3 w-3" />
                            Sovereign SSL Protocol Active
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}