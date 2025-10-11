'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import toast from 'react-hot-toast';
// --- 1. IMPORT THE ICONS & LOADER ---
import { Loader2, Eye, EyeOff } from 'lucide-react';

export default function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  // --- 2. ADD STATE FOR PASSWORD VISIBILITY ---
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  
  const router = useRouter();
  const supabase = createClient();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessType) {
        toast.error("Please select your business type.");
        return;
    }
    setIsLoading(true);
    const toastId = toast.loading('Creating your account and business...');

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          business_name: businessName,
          business_type: businessType,
        },
      },
    });

    if (signUpError) {
        toast.error(signUpError.message, { id: toastId });
        setIsLoading(false);
        return;
    }

    if (signUpData.user) {
        toast.loading('Signing you in...', { id: toastId });

        const { error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (signInError) {
            toast.error(`Account created, but auto-login failed: ${signInError.message}. Please log in manually.`, { id: toastId, duration: 6000 });
            router.push('/login');
        } else {
            toast.success('Welcome to UG-BizSuite!', { id: toastId });
            router.refresh();
        }
    } else {
        toast.success('Success! Please check your email to verify your account.', { id: toastId, duration: 6000 });
    }
    
    setIsLoading(false);
  };
  
  // --- 3. CREATE A TOGGLE FUNCTION ---
  const togglePasswordVisibility = () => {
    setIsPasswordVisible((prevState) => !prevState);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Create Your Business Account</CardTitle>
          <CardDescription>One account to run your entire business empire.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignup} className="space-y-4">
            <div className="space-y-2"><Label htmlFor="full_name">Your Full Name</Label><Input id="full_name" value={fullName} onChange={(e) => setFullName(e.target.value)} required /></div>
            <div className="space-y-2"><Label htmlFor="business_name">Business Name</Label><Input id="business_name" value={businessName} onChange={(e) => setBusinessName(e.target.value)} required /></div>
            <div className="space-y-2">
                <Label htmlFor="business_type">Business Type</Label>
                <Select onValueChange={setBusinessType} value={businessType} required name="business_type">
                    <SelectTrigger id="business_type"><SelectValue placeholder="Select your industry..." /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="Retail">Retail / Wholesale</SelectItem>
                        <SelectItem value="Hospitality">Restaurant / Cafe</SelectItem>
                        <SelectItem value="Lending">Lending / Microfinance</SelectItem>
                        <SelectItem value="Rentals">Rentals / Real Estate</SelectItem>
                        <SelectItem value="SACCO">SACCO / Co-operative</SelectItem>
                        <SelectItem value="Telecom Services">Telecom Services</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
            
            {/* --- 4. IMPLEMENT THE NEW PASSWORD INPUT WITH TOGGLE BUTTON --- */}
            <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                    <Input 
                        id="password" 
                        type={isPasswordVisible ? 'text' : 'password'} 
                        minLength={6} 
                        value={password} 
                        onChange={(e) => setPassword(e.target.value)} 
                        required 
                        className="pr-10" // Make space for the icon
                    />
                    <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm" 
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent" 
                        onClick={togglePasswordVisibility}
                    >
                        {isPasswordVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        <span className="sr-only">{isPasswordVisible ? "Hide password" : "Show password"}</span>
                    </Button>
                </div>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isLoading ? 'Setting Up Your Business...' : 'Sign Up Free'}
            </Button>
            <div className="text-center text-sm">Already have an account? <Link href="/login" className="font-medium text-primary hover:underline">Log In</Link></div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}