'use client';
import { useQuery, useMutation } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
// 1. IMPORT 'usePathname' to fix the useEffect hook.
import { useRouter, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CheckCircle2, Circle } from 'lucide-react';
import Link from 'next/link';
import { useEffect } from 'react';
// 2. IMPORT 'toast' to fix the mutation's error handler.
import toast from 'react-hot-toast';

// This function checks if the user has completed each setup step.
async function fetchSetupStatus() {
    const supabase = createClient();
    
    // 3. THE MAIN FIX: Correctly destructure the 'count' property from the Supabase response.
    // We rename 'count' to 'productCount' and 'customerCount' to use them.
    const { count: productCount, error: productError } = await supabase.from('products').select('*', { count: 'exact', head: true });
    const { count: customerCount, error: customerError } = await supabase.from('customers').select('*', { count: 'exact', head: true });

    if (productError) throw new Error('Could not fetch product count.');
    if (customerError) throw new Error('Could not fetch customer count.');

    return {
        hasProducts: (productCount ?? 0) > 0,
        hasCustomers: (customerCount ?? 0) > 0,
    };
}

async function completeSetup() {
    const supabase = createClient();
    // This needs a proper RPC call in a real multi-tenant app
    // to get the user's business ID securely.
    const { data: profile } = await supabase.from('profiles').select('business_id').single();
    if (!profile) throw new Error("Could not find user profile.");
    const { error } = await supabase.from('businesses').update({ setup_complete: true }).eq('id', profile.business_id);
    if (error) throw error;
}

export default function WelcomePage() {
    const router = useRouter();
    // Define 'pathname' so it can be used in the useEffect hook below.
    const pathname = usePathname();
    const { data: status, refetch } = useQuery({ queryKey: ['setupStatus'], queryFn: fetchSetupStatus });
    const mutation = useMutation({
        mutationFn: completeSetup,
        onSuccess: () => router.push('/'),
        onError: (error: any) => toast.error(error.message),
    });

    // Refetch status when the user navigates back to this page
    useEffect(() => {
        refetch();
    }, [pathname, refetch]); // Added 'refetch' to the dependency array as is best practice

    const steps = [
        { title: "Add Your First Product", link: "/inventory", complete: status?.hasProducts },
        { title: "Create a Customer", link: "/customers", complete: status?.hasCustomers },
        // ... more steps can be added here
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