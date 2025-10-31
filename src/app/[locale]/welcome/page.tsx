// src/app/[locale]/welcome/page.tsx
'use client';
import { useQuery, useMutation } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useRouter, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CheckCircle2, Circle, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useEffect } from 'react';
import toast from 'react-hot-toast';

// --- START OF FIX 1 ---
// This function now uses the secure RPC call instead of a direct query that fails with RLS.
async function fetchSetupStatus() {
    const supabase = createClient();
    const { data, error } = await supabase.rpc('get_setup_status');
    if (error) throw new Error('Could not fetch setup status.');
    return data[0]; // Returns { has_products: boolean, has_customers: boolean }
}
// --- END OF FIX 1 ---

// --- START OF FIX 2 ---
// This function now uses the secure RPC call to mark setup as complete.
async function completeSetup() {
    const supabase = createClient();
    const { error } = await supabase.rpc('mark_setup_complete');
    if (error) throw error;
}
// --- END OF FIX 2 ---


// --- Your original component, now using the corrected functions ---
export default function WelcomePage() {
    const router = useRouter();
    const pathname = usePathname();

    const { data: status, isLoading, error, refetch } = useQuery({ queryKey: ['setupStatus'], queryFn: fetchSetupStatus });
    
    const mutation = useMutation({
        mutationFn: completeSetup,
        onSuccess: () => {
            router.push('/');
            router.refresh(); // This helps ensure the middleware re-runs with the new 'setup_complete' status
        },
        onError: (error: any) => toast.error(error.message),
    });

    // Your original useEffect hook, untouched
    useEffect(() => {
        refetch();
    }, [pathname, refetch]);

    // --- Necessary loading and error handling to prevent crashes ---
    if (isLoading) {
        return <div className="flex h-screen w-screen items-center justify-center"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;
    }

    if (error) {
        return <div className="flex h-screen w-screen items-center justify-center text-destructive">Error: {error.message}</div>;
    }
    // --- End of necessary handling ---

    // Your original steps array and JSX, untouched
    const steps = [
        { title: "Add Your First Product", link: "/inventory", complete: status?.has_products },
        { title: "Create a Customer", link: "/customers", complete: status?.has_customers },
    ];

    return (
        <div className="container mx-auto py-10 flex justify-center">
            <Card className="w-full max-w-2xl">
                <CardHeader className="text-center">
                    <CardTitle className="text-3xl">Welcome to BBU1!</CardTitle>
                    <CardDescription>Let's get your business set up for success.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {steps.map(step => (
                        <div key={step.title} className="flex items-center gap-4 p-4 border rounded-lg">
                            {step.complete ? <CheckCircle2 className="h-6 w-6 text-green-500" /> : <Circle className="h-6 w-6 text-muted-foreground" />}
                            <div><h3 className="font-semibold">{step.title}</h3></div>
                            <Button variant="secondary" asChild className="ml-auto"><Link href={step.link}>Go</Link></Button>
                        </div>
                    ))}
                    <div className="pt-6 text-center">
                        <Button size="lg" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
                            {mutation.isPending ? "Finalizing..." : "Finish Setup & Go to Dashboard"}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}