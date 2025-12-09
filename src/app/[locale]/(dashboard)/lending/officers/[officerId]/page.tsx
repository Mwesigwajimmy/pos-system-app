'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Loader2, ShieldAlert } from 'lucide-react';
import { OfficerDetailView } from '@/components/lending/OfficerDetailView';

// --- Secure Context Fetcher ---
async function fetchUserContext() {
    const supabase = createClient();
    
    // 1. Check Auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error('Unauthenticated');
    
    // 2. Get Business Context
    const { data, error } = await supabase
        .from('profiles')
        .select('business_id')
        .eq('id', user.id)
        .single();
        
    if (error || !data?.business_id) throw new Error('Tenant context missing');
    return data.business_id;
}

export default function OfficerDetailsPage({ params }: { params: { officerId: string } }) {
    const { data: tenantId, isLoading, error } = useQuery({
        queryKey: ['tenant-context'],
        queryFn: fetchUserContext,
        staleTime: 1000 * 60 * 30, // Cache tenant ID for 30 mins
    });

    if (isLoading) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-slate-50/50">
                <Loader2 className="animate-spin h-6 w-6 text-slate-400"/>
            </div>
        );
    }

    if (error || !tenantId) {
        return (
            <div className="p-8 flex items-center justify-center h-full">
                <div className="bg-destructive/10 text-destructive p-6 rounded-lg max-w-md text-center border border-destructive/20">
                    <ShieldAlert className="h-10 w-10 mx-auto mb-4" />
                    <h3 className="font-bold text-lg">Access Denied</h3>
                    <p className="text-sm mt-2 opacity-90">
                        Unable to verify your business organization context. Please log in again.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 md:p-8 max-w-[1600px] mx-auto">
            <OfficerDetailView officerId={params.officerId} tenantId={tenantId} />
        </div>
    );
}