'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
// --- 1. IMPORT THE ICONS ---
import { Eye, EyeOff } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  // --- 2. ADD STATE FOR PASSWORD VISIBILITY ---
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const router = useRouter();
  const supabase = createClient();
  const isOnline = useOnlineStatus();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    if (!isOnline) {
      setError("You are currently offline. Please connect to the internet to log in.");
      setIsLoading(false);
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
    } else {
      router.refresh();
    }
    setIsLoading(false);
  };
  
  // --- 3. CREATE A TOGGLE FUNCTION ---
  const togglePasswordVisibility = () => {
    setIsPasswordVisible((prevState) => !prevState);
  };

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-2xl font-bold">Log In</CardTitle>
        <CardDescription>Enter your credentials to access your dashboard.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>

          {/* --- 4. IMPLEMENT THE NEW PASSWORD INPUT WITH TOGGLE BUTTON --- */}
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
                <Input 
                    id="password" 
                    type={isPasswordVisible ? 'text' : 'password'} 
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

          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Signing In...' : 'Sign In'}
          </Button>
          <div className="text-center text-sm">
            Don't have an account?{' '}
            <Link href="/signup" className="font-medium text-indigo-600 hover:underline">
              Sign Up
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}