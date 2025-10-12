// File: app/accept-invite/page.tsx

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
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    useEffect(() => {
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                setIsAuthenticated(true);
            } else {
                setError("Invalid or expired invitation link. Please request a new invitation.");
            }
        };
        checkSession();
    }, [supabase.auth]);

    const handleSetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsSubmitting(true);
        const toastId = toast.loading("Setting your password and activating your account...");

        const { error: updateError } = await supabase.auth.updateUser({
            password: password,
        });

        if (updateError) {
            toast.error("Failed to set password", { id: toastId, description: updateError.message });
            setError(updateError.message);
            setIsSubmitting(false);
            return;
        }

        toast.success("Account activated! Redirecting you to the dashboard...", { id: toastId });
        
        // Refresh the page. The middleware will now handle the redirect.
        router.refresh();
    };

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <Card className="w-full max-w-md text-center">
                    <CardHeader><CardTitle className="text-red-600">Activation Failed</CardTitle></CardHeader>
                    <CardContent><p>{error}</p></CardContent>
                </Card>
            </div>
        );
    }

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle>Welcome! Complete Your Account</CardTitle>
                    <CardDescription>Please set a password to activate your account and join the team.</CardDescription>
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