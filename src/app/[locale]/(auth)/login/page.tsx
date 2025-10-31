// src/app/(auth)/login/page.tsx
'use client';

import React, { useState, memo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm, Control } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast'; // Import toast

// UI Components & Icons
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { FaGoogle, FaMicrosoft } from 'react-icons/fa';

// --- Schema and Types (Unchanged) ---
const loginSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z.string().min(1, { message: "Password is required." }),
});
type LoginFormInput = z.infer<typeof loginSchema>;
type SsoProvider = 'google' | 'azure';

// --- Logic Hook (with the necessary fix for redirection) ---
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
        const toastId = toast.loading('Signing in...');
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

        toast.success('Welcome back!', { id: toastId });
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

// --- UI Sub-components (Unchanged) ---
const PasswordInput = memo(({ control }: { control: Control<LoginFormInput> }) => {
    const [isVisible, setIsVisible] = useState(false);
    return (
        <FormField
            control={control}
            name="password"
            render={({ field }) => (
                <FormItem>
                    <FormLabel>Password</FormLabel>
                    <div className="relative">
                        <FormControl>
                            <Input type={isVisible ? 'text' : 'password'} className="pr-10" {...field} />
                        </FormControl>
                        <button type="button" onClick={() => setIsVisible(!isVisible)} className="absolute right-0 top-0 h-full px-3 text-muted-foreground" aria-label={isVisible ? "Hide password" : "Show password"}>
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
    <Button variant="outline" onClick={() => onClick(provider)} disabled={!!isSubmitting}>
        {isSubmitting === provider ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Icon className="mr-2 h-4 w-4" />}
        {label}
    </Button>
));
SsoButton.displayName = 'SsoButton';

// --- Main Page Component (with Syntax Fix) ---
export default function LoginPage() {
    const { form, isSubmitting, handleEmailLogin, handleSsoLogin } = useLogin();

    return (
        <div className="flex items-center justify-center min-h-screen">
            <Card className="w-full max-w-sm">
                <CardHeader>
                    <CardTitle className="text-2xl font-bold">Log In</CardTitle>
                    <CardDescription>Sign in with a provider or use your email.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <SsoButton provider="google" label="Google" icon={FaGoogle} onClick={handleSsoLogin} isSubmitting={isSubmitting} />
                        <SsoButton provider="azure" label="Microsoft" icon={FaMicrosoft} onClick={handleSsoLogin} isSubmitting={isSubmitting} />
                    </div>
                    
                    <div className="relative">
                        <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                        <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">Or continue with</span></div>
                    </div>

                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(handleEmailLogin)} className="space-y-4">
                            <FormField control={form.control} name="email" render={({ field }) => (
                                // THIS IS THE LINE THAT WAS FIXED
                                <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                            
                            <PasswordInput control={form.control} />
                            
                            <Button type="submit" className="w-full" disabled={!!isSubmitting}>
                                {isSubmitting === 'email' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Sign In with Email
                            </Button>
                        </form>
                    </Form>
                    
                    <p className="text-center text-sm text-muted-foreground">
                        Don't have an account?{' '}
                        <Link href="/signup" className="font-semibold text-primary hover:underline">Sign Up</Link>
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}