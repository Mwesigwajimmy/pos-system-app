// This is the complete and final code for your frontend "Accept Invitation" page.
// It uses the standard Supabase method that solves the "invalid credentials" bug.

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
    const [userEmail, setUserEmail] = useState<string | null>(null);

    // This useEffect hook handles the #access_token from the URL.
    // The Supabase client automatically uses it to create a temporary session.
    useEffect(() => {
        const { data: authListener } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                // When the temporary session is ready, get the user's email to display it.
                if (event === 'SIGNED_IN' || event === 'PASSWORD_RECOVERY') {
                    const user = (await supabase.auth.getUser()).data.user;
                    setUserEmail(user?.email || null);
                }
            }
        );
        
        // A fallback check in case the listener is slow
        const checkInitialUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setUserEmail(user.email || null);
            } else if (!window.location.hash.includes('access_token')) {
                setError("Invalid or expired invitation link. No token found.");
            }
        };

        checkInitialUser();

        return () => {
            authListener.subscription.unsubscribe();
        };
    }, [supabase.auth]);


    const handleSetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password.length < 6) {
            toast.error("Password must be at least 6 characters long.");
            return;
        }

        setIsSubmitting(true);
        const toastId = toast.loading("Setting your password and activating your account...");

        // --- THE FINAL FIX IS HERE ---
        // We use supabase.auth.updateUser directly on the client.
        // This uses the temporary session from the invite link to securely update the password
        // and fully authenticate the user in one step. This is the correct method.
        const { error: updateError } = await supabase.auth.updateUser({
            password: password,
        });

        setIsSubmitting(false);

        if (updateError) {
            toast.error("Failed to activate account", { id: toastId, description: updateError.message });
            setError(updateError.message);
            return;
        }

        // The user is now successfully logged in with a valid, permanent session.
        toast.success("Account activated! Redirecting you to the dashboard...", { id: toastId });
        
        // router.refresh() is important to tell Next.js the user is now logged in.
        router.refresh(); 
    };
    

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

    if (!userEmail) {
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