'use client';

import React, { useState, memo, useEffect } from 'react';
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
// Google/Microsoft SSO hidden for now — uncomment when ready to re-enable.
// import { FaGoogle, FaMicrosoft } from 'react-icons/fa';

// --- Schema ---
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
        const toastId = toast.loading('Authenticating...');
        
        const { error: signInError } = await supabase.auth.signInWithPassword(values);

        if (signInError) {
            const errorMessage = signInError.status === 400 
                ? "Invalid email or password." 
                : signInError.message;
                
            toast.error(errorMessage, { id: toastId });
            setIsSubmitting(null);
            return;
        }

        const { data: profileData, error: profileError } = await supabase
            .rpc('get_user_business_profile');
        
        const profile = profileData ? profileData[0] : null;

        if (profileError || !profile) {
            toast.error('Unable to resolve business profile.', { id: toastId });
            await supabase.auth.signOut();
            setIsSubmitting(null);
            return;
        }

        toast.success('Login successful.', { id: toastId });
        router.push(`/${locale}/dashboard`);
    };

    const handleSsoLogin = async (provider: SsoProvider) => {
        setIsSubmitting(provider);
        const locale = params?.locale || 'en';
        
        const { error } = await supabase.auth.signInWithOAuth({
            provider,
            options: { 
                redirectTo: `${window.location.origin}/${locale}/callback` 
            },
        });
        if (error) {
            toast.error(`Login error: ${error.message}`);
            setIsSubmitting(null);
        }
    };
    
    return { form, isSubmitting, handleEmailLogin, handleSsoLogin };
};

// --- Password Input Component ---
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
                        <FormLabel className="text-xs font-semibold text-slate-700">Password</FormLabel>
                        <Link 
                            href={`/${locale}/forgot-password`} 
                            className="text-xs font-medium text-blue-600 hover:text-blue-700"
                        >
                            Forgot password?
                        </Link>
                    </div>
                    <div className="relative">
                        <FormControl>
                            <Input 
                                type={isVisible ? 'text' : 'password'} 
                                className="h-11 border-slate-200 bg-white rounded-lg text-sm focus:ring-1 focus:ring-blue-500" 
                                {...field} 
                            />
                        </FormControl>
                        <button type="button" onClick={() => setIsVisible(!isVisible)} className="absolute right-0 top-0 h-full px-3 text-slate-400 hover:text-slate-600">
                            {isVisible ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>
                    <FormMessage />
                </FormItem>
            )}
        />
    );
});
PasswordInput.displayName = 'PasswordInput';

// --- SSO Button Component ---
// Hidden for now (Google/Microsoft not ready) — uncomment alongside the
// react-icons/fa import above and the usage below to bring SSO back.
// const SsoButton = memo(({ provider, icon: Icon, label, onClick, isSubmitting }: { provider: SsoProvider; icon: React.ElementType; label: string; onClick: (p: SsoProvider) => void; isSubmitting: string | null; }) => (
//     <Button
//         variant="outline"
//         className="h-11 border-slate-200 bg-white hover:bg-slate-50 text-sm font-medium rounded-lg transition-colors flex-1"
//         onClick={() => onClick(provider)}
//         disabled={!!isSubmitting}
//     >
//         {isSubmitting === provider ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Icon className="mr-2 h-4 w-4 text-slate-500" />}
//         {label}
//     </Button>
// ));
// SsoButton.displayName = 'SsoButton';

// --- Main Login Page ---
export default function LoginPage() {
    const { form, isSubmitting, handleEmailLogin } = useLogin();
    const params = useParams();
    const locale = params?.locale || 'en';

    return (
        <div className="relative min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans antialiased overflow-hidden">
            {/* Animated gradient backdrop */}
            <div className="absolute inset-0 -z-10 overflow-hidden">
                <motion.div
                    className="absolute -top-40 -left-32 w-[28rem] h-[28rem] rounded-full bg-blue-400/20 blur-3xl"
                    animate={{ x: [0, 40, 0], y: [0, 30, 0] }}
                    transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
                />
                <motion.div
                    className="absolute -bottom-40 -right-32 w-[28rem] h-[28rem] rounded-full bg-blue-600/15 blur-3xl"
                    animate={{ x: [0, -30, 0], y: [0, -40, 0] }}
                    transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
                />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 24, filter: 'blur(4px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="w-full max-w-md"
            >
            <Card className="w-full shadow-2xl border border-slate-200 bg-white rounded-2xl overflow-hidden">
                <CardHeader className="pt-10 pb-6 text-center space-y-4">
                    <div className="flex justify-center mb-2">
                        <motion.img
                            /* src="/logo.png" — swap back to the production logo once hosted */
                            src="/logo.png"
                            alt="Company Logo"
                            className="h-16 w-auto object-contain"
                            animate={{ scale: [1, 1.05, 1] }}
                            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", repeatDelay: 1 }}
                        />
                    </div>
                    <div className="space-y-1">
                        <CardTitle className="text-2xl font-bold text-slate-900 tracking-tight">Welcome back</CardTitle>
                        <CardDescription className="text-slate-500 text-sm font-medium">
                            Bold Business Solutions
                        </CardDescription>
                    </div>
                </CardHeader>

                <CardContent className="px-8 pb-10 space-y-6">
                    {/*
                        Google / Microsoft SSO — hidden for now, not ready yet.
                        Uncomment this block, the SsoButton component above, and the
                        react-icons/fa import at the top of the file to bring it back.

                        <div className="flex gap-4">
                            <SsoButton provider="google" label="Google" icon={FaGoogle} onClick={handleSsoLogin} isSubmitting={isSubmitting} />
                            <SsoButton provider="azure" label="Microsoft" icon={FaMicrosoft} onClick={handleSsoLogin} isSubmitting={isSubmitting} />
                        </div>

                        <div className="relative">
                            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-100" /></div>
                            <div className="relative flex justify-center text-xs uppercase tracking-wider">
                                <span className="bg-white px-3 text-slate-400 font-medium">Or continue with</span>
                            </div>
                        </div>
                    */}

                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(handleEmailLogin)} className="space-y-5">
                            <FormField control={form.control} name="email" render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-xs font-semibold text-slate-700">Email Address</FormLabel>
                                    <FormControl>
                                        <Input 
                                            type="email" 
                                            placeholder="name@company.com" 
                                            className="h-11 border-slate-200 bg-white rounded-lg text-sm focus:ring-1 focus:ring-blue-500" 
                                            {...field} 
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            
                            <PasswordInput control={form.control} />
                            
                            <Button 
                                type="submit" 
                                className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg shadow-sm transition-all" 
                                disabled={!!isSubmitting}
                            >
                                {isSubmitting === 'email' ? (
                                    <span className="flex items-center gap-2">
                                        <Loader2 className="h-4 w-4 animate-spin" /> 
                                        Authenticating...
                                    </span>
                                ) : "Sign In"}
                            </Button>
                        </form>
                    </Form>
                    
                    <div className="pt-6 border-t border-slate-50 text-center space-y-4">
                        <p className="text-xs font-medium text-slate-500">
                            Don't have an account?{' '}
                            <Link href={`/${locale}/signup`} className="text-blue-600 hover:text-blue-700 font-semibold">Create an account</Link>
                        </p>
                        
                        <div className="flex items-center justify-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            <ShieldCheck size={14} className="text-emerald-500" />
                            Secure Environment
                        </div>
                    </div>
                </CardContent>
            </Card>
            </motion.div>
        </div>
    );
}