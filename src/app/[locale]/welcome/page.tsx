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

// ✅ DEEP WELD IMPORT
import { useBusiness } from '@/context/BusinessContext';

// --- START OF FIX 1 ---
// This function now uses the secure RPC call instead of a direct query that fails with RLS.
async function fetchSetupStatus() {
    const supabase = createClient();
    const { data, error } = await supabase.rpc('get_setup_status');
    if (error) throw new Error('Could not fetch setup status.');
    return data[0] || { has_products: false, has_customers: false }; 
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


export default function WelcomePage() {
    const router = useRouter();
    const pathname = usePathname();
    
    // ✅ DEEP WELD: Get current business context
    const { profile, isLoading: isBusinessLoading } = useBusiness();

    const { data: status, isLoading, error, refetch } = useQuery({ 
        queryKey: ['setupStatus'], 
        queryFn: fetchSetupStatus,
        enabled: !!profile?.business_id // Only fetch once identity is anchored
    });
    
    const mutation = useMutation({
        mutationFn: completeSetup,
        onSuccess: () => {
            toast.success("Setup complete! Welcome to the Dashboard.");
            router.push('/'); 
            // The middleware will now see 'setup_complete: true' and send them to the dashboard
            router.refresh(); 
        },
        onError: (error: any) => toast.error(error.message),
    });

    useEffect(() => {
        if (profile?.business_id) {
            refetch();
        }
    }, [pathname, refetch, profile?.business_id]);

    // --- Necessary loading and error handling to prevent crashes ---
    if (isLoading || isBusinessLoading) {
        return (
            <div className="flex h-screen w-screen flex-col items-center justify-center bg-white">
                <Loader2 className="animate-spin h-10 w-10 text-primary mb-4" />
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                    Initializing Setup Environment...
                </p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex h-screen w-screen items-center justify-center text-destructive font-bold">
                Verification Error: {error.message}
            </div>
        );
    }

    const steps = [
        { title: "Add Your First Product", link: "/inventory", complete: status?.has_products },
        { title: "Create a Customer", link: "/customers", complete: status?.has_customers },
    ];

    return (
        <div className="container mx-auto py-10 flex justify-center">
            <Card className="w-full max-w-2xl shadow-xl border-slate-100 rounded-[2rem] overflow-hidden">
                <CardHeader className="text-center bg-slate-50/50 py-10">
                    <CardTitle className="text-3xl font-black uppercase tracking-tighter">Welcome to BBU1!</CardTitle>
                    <CardDescription className="font-medium">Let's get your business set up for success.</CardDescription>
                </CardHeader>
                <CardContent className="p-8 space-y-6">
                    {steps.map(step => (
                        <div key={step.title} className="flex items-center gap-4 p-5 border border-slate-100 rounded-2xl bg-white hover:border-primary/20 transition-all">
                            {step.complete ? (
                                <CheckCircle2 className="h-7 w-7 text-green-500" /> 
                            ) : (
                                <Circle className="h-7 w-7 text-slate-300" />
                            )}
                            <div>
                                <h3 className="font-bold text-slate-800">{step.title}</h3>
                            </div>
                            <Button variant="secondary" asChild className="ml-auto rounded-xl px-6">
                                <Link href={step.link}>Go</Link>
                            </Button>
                        </div>
                    ))}
                    
                    <div className="pt-8 text-center">
                        <Button 
                            size="lg" 
                            className="w-full h-16 rounded-2xl bg-slate-950 hover:bg-black text-white font-bold uppercase tracking-widest text-xs"
                            onClick={() => mutation.mutate()} 
                            disabled={mutation.isPending}
                        >
                            {mutation.isPending ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Finalizing Sovereign Node...
                                </>
                            ) : (
                                "Finish Setup & Go to Dashboard"
                            )}
                        </Button>
                        <p className="mt-4 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                            Jurisdiction: {profile?.country || 'Global'} | Currency: {profile?.currency || 'UGX'}
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}