// This is the complete and final code for the Accept Invitation page.
// There are no placeholders or omitted sections.

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

export default function AcceptInvitationPage() {
    const supabase = createClient();
    const router = useRouter();
    const [password, setPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [accessToken, setAccessToken] = useState<string | null>(null);
    const [userEmail, setUserEmail] = useState<string | null>(null); // State to hold the user's email

    useEffect(() => {
        const hash = window.location.hash;
        const params = new URLSearchParams(hash.substring(1));
        const token = params.get('access_token');

        if (token) {
            setAccessToken(token);
            // After getting the token, immediately try to get the user's email
            const fetchUser = async () => {
                const { data: { user }, error: userError } = await supabase.auth.getUser(token);
                if (user) {
                    setUserEmail(user.email || null);
                } else {
                    setError("Invalid or expired invitation link. Could not verify user.");
                }
            };
            fetchUser();
        } else {
            setError("Invalid or expired invitation link. No token found.");
        }
    }, [supabase.auth]);

    const handleSetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!accessToken || !userEmail) {
            setError("Cannot set password without a valid session token and user email.");
            return;
        }

        setIsSubmitting(true);
        const toastId = toast.loading("Setting your password and activating your account...");

        const response = await fetch('/api/accept-invite', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                accessToken: accessToken,
                password: password,
            }),
        });

        const result = await response.json();

        if (!response.ok) {
            toast.error("Failed to set password", { id: toastId, description: result.error });
            setIsSubmitting(false);
            return;
        }

        // The password is now set. We now perform a regular login to create a new, secure session.
        const { error: signInError } = await supabase.auth.signInWithPassword({
            email: userEmail,
            password: password,
        });
        
        if (signInError) {
             toast.error("Account activated, but auto-login failed. Please log in manually.", { id: toastId, duration: 6000 });
             router.push('/login');
             return;
        }

        toast.success("Account activated! Redirecting you to the dashboard...", { id: toastId });
        router.refresh();
    };
    
    // --- THIS IS THE COMPLETE UI RENDERING LOGIC ---

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <Card className="w-full max-w-md text-center">
                    <CardHeader><CardTitle className="text-red-600">Activation Failed</CardTitle></CardHeader>
                    <CardContent><p>{error}</p></CardContent>
                </Card>
            </div>
        );
    }

    if (!accessToken || !userEmail) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
                <p className="ml-2 text-muted-foreground">Verifying invitation...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle>Welcome! Complete Your Account</CardTitle>
                    <CardDescription>Please set a password for your account: <span className="font-bold">{userEmail}</span></CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSetPassword} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="password">New Password</Label>
                            <Input
                                id="password"
                                type="password"
                                minLength={6}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                        <Button type="submit" className="w-full" disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Set Password & Log In
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
} 