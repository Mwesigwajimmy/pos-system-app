'use client';

import React, { useState, memo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';

// UI Components
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Eye, EyeOff } from 'lucide-react';

// --- Schema & Types ---
const signupSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters."),
  businessName: z.string().min(2, "Business name must be at least 2 characters."),
  businessType: z.string().min(1, "Please select a business type."),
  email: z.string().email("Please enter a valid email address."),
  password: z.string().min(6, "Password must be at least 6 characters."),
});
type SignupFormInput = z.infer<typeof signupSchema>;

// --- Logic Hook (The Final, Corrected Version) ---
const useSignup = () => {
    const router = useRouter();
    const supabase = createClient();
    const [isLoading, setIsLoading] = useState(false);
    const form = useForm<SignupFormInput>({ resolver: zodResolver(signupSchema), defaultValues: { fullName: '', businessName: '', businessType: '', email: '', password: '' } });

    const handleSignup = async (values: SignupFormInput) => {
        setIsLoading(true);
        const toastId = toast.loading('Creating your account...');
        
        // This now calls your new, integrated backend function
        const { data, error } = await supabase.rpc('handle_new_signup', {
            p_email: values.email,
            p_password: values.password,
            p_full_name: values.fullName,
            p_business_name: values.businessName,
            p_business_type: values.businessType
        });

        if (error) {
            toast.error(error.message, { id: toastId });
            setIsLoading(false);
            return;
        }

        // Manually sign in the user, which is the correct "Login Logic"
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email: values.email,
            password: values.password,
        });

        if (signInError) {
            toast.error(signInError.message, { id: toastId });
            setIsLoading(false);
        } else {
            toast.success('Welcome! Your business is ready.', { id: toastId });
            router.refresh(); // Refresh to redirect to dashboard
        }
    };
    return { form, isLoading, onSubmit: form.handleSubmit(handleSignup) };
};

// --- UI Sub-components ---
const PasswordInput = memo(({ control }: { control: any }) => {
    const [isVisible, setIsVisible] = useState(false);
    return (
        <FormField control={control} name="password" render={({ field }) => (
            <FormItem>
                <FormLabel>Password</FormLabel>
                <div className="relative">
                    <FormControl><Input type={isVisible ? 'text' : 'password'} className="pr-10" {...field} /></FormControl>
                    <button type="button" onClick={() => setIsVisible(!isVisible)} className="absolute right-0 top-0 h-full px-3 text-muted-foreground" aria-label={isVisible ? "Hide password" : "Show password"}>
                       {isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                </div>
                <FormMessage />
            </FormItem>
        )}/>
    );
});
PasswordInput.displayName = 'PasswordInput';

const BusinessTypeSelect = memo(({ control }: { control: any }) => (
    <FormField control={control} name="businessType" render={({ field }) => (
        <FormItem>
            <FormLabel>Business Type</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl><SelectTrigger><SelectValue placeholder="Select your industry..." /></SelectTrigger></FormControl>
                <SelectContent className="max-h-[250px]">
                    <SelectGroup>
                        <SelectLabel>Common</SelectLabel>
                        <SelectItem value="Retail / Wholesale">Retail / Wholesale</SelectItem>
                        <SelectItem value="Restaurant / Cafe">Restaurant / Cafe</SelectItem>
                    </SelectGroup>
                    <SelectGroup>
                         <SelectLabel>Trades & Services</SelectLabel>
                        <SelectItem value="Contractor">Contractor (General, Remodeling)</SelectItem>
                        <SelectItem value="Field Service">Field Service (Trades, HVAC, Plumbing)</SelectItem>
                        <SelectItem value="Professional Services">Professional Services (Accounting, Legal)</SelectItem>
                    </SelectGroup>
                     <SelectGroup>
                        <SelectLabel>Specialized Industries</SelectLabel>
                        <SelectItem value="Distribution">Distribution</SelectItem>
                        <SelectItem value="Lending / Microfinance">Lending / Microfinance</SelectItem>
                        <SelectItem value="Rentals / Real Estate">Rentals / Real Estate</SelectItem>
                        <SelectItem value="SACCO / Co-operative">SACCO / Co-operative</SelectItem>
                        <SelectItem value="Telecom Services">Telecom Services</SelectItem>
                        <SelectItem value="Nonprofit">Nonprofit</SelectItem>
                    </SelectGroup>
                </SelectContent>
            </Select>
            <FormMessage />
        </FormItem>
    )}/>
));
BusinessTypeSelect.displayName = 'BusinessTypeSelect';

// --- The Main Page Component ---
export default function SignupPage() {
    const { form, isLoading, onSubmit } = useSignup();
    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle className="text-2xl font-bold">Create Your Business Account</CardTitle>
                    <CardDescription>One account to run your entire business empire.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={onSubmit} className="space-y-4">
                            <FormField control={form.control} name="fullName" render={({ field }) => (<FormItem><FormLabel>Your Full Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)}/>
                            <FormField control={form.control} name="businessName" render={({ field }) => (<FormItem><FormLabel>Business Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)}/>
                            <BusinessTypeSelect control={form.control} />
                            <FormField control={form.control} name="email" render={({ field }) => (<FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                            <PasswordInput control={form.control} />
                            <Button type="submit" className="w-full" disabled={isLoading}>{isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Sign Up Free</Button>
                            <p className="text-center text-sm text-muted-foreground">Already have an account?{' '}<Link href="/login" className="font-semibold text-primary hover:underline">Log In</Link></p>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    );
}