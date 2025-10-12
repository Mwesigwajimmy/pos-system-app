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
import { Loader2, Eye, EyeOff } from 'lucide-react';

export default function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  
  const router = useRouter();
  const supabase = createClient();

  // ==================================================================
  // --- THIS IS THE FINAL AND ONLY CHANGE NEEDED ---
  // ==================================================================
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessType) {
        toast.error("Please select your business type.");
        return;
    }
    setIsLoading(true);
    const toastId = toast.loading('Creating your account and business...');

    const { data, error } = await supabase.auth.signUp({
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

    // If there was an error during signup (e.g., user already exists)
    if (error) {
        toast.error(error.message, { id: toastId });
        setIsLoading(false);
        return;
    }

    // If signup was successful, a session is automatically created for the user.
    // We do NOT need to sign in again. We just need to refresh the page state.
    // If you have email verification enabled, the user is created but they cannot log in
    // until they verify. The toast message handles this.
    if (data.session) {
      // User has a session, they are effectively logged in.
      // Refreshing the page will trigger the middleware to route them correctly.
      toast.success('Welcome to UG-BizSuite!', { id: toastId });
      router.refresh();
    } else {
      // This happens if you require email verification. The user object exists but no session.
      toast.success('Success! Please check your email to verify your account.', { id: toastId, duration: 6000 });
      setIsLoading(false);
    }
  };
  
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
                        className="pr-10"
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