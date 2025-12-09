'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { AgentMobilePortal } from '@/components/lending/AgentMobilePortal'; // Ensure your component is saved here
import { Loader2 } from 'lucide-react';

// --- Auth Fetcher ---
async function fetchAgentContext() {
    const supabase = createClient();
    
    // 1. Get User
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error('Not authenticated');

    // 2. Get Profile/Tenant
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('business_id')
        .eq('id', user.id)
        .single();

    if (profileError) throw profileError;

    return { 
        agentId: user.id, 
        tenantId: profile?.business_id 
    };
}

export default function AgentPortalPage() {
    const router = useRouter();

    // Fetch context using TanStack Query
    const { data, isLoading, isError } = useQuery({
        queryKey: ['agentContext'],
        queryFn: fetchAgentContext,
        retry: false
    });

    // Handle Auth Redirect
    useEffect(() => {
        if (isError) {
            router.push('/login');
        }
    }, [isError, router]);

    // Loading State
    if (isLoading) {
        return (
            <div className="h-[calc(100vh-4rem)] w-full flex flex-col items-center justify-center bg-slate-50">
                <Loader2 className="h-10 w-10 animate-spin text-blue-600 mb-4" />
                <p className="text-slate-500 font-medium">Initializing Field Agent Portal...</p>
            </div>
        );
    }

    // Error State
    if (isError || !data) return null; // Redirect handles this

    // Render the Component you provided
    return (
        <div className="min-h-[calc(100vh-4rem)] bg-slate-50 flex justify-center">
            {/* We constrain width to simulate mobile view on desktop, or fill on mobile */}
            <div className="w-full max-w-md bg-white min-h-full shadow-xl">
                <AgentMobilePortal tenantId={data.tenantId} agentId={data.agentId} />
            </div>
        </div>
    );
}