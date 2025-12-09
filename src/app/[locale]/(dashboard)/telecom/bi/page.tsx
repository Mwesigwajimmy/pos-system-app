'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Loader2, ShieldAlert } from 'lucide-react';

// IMPORT YOUR FILE HERE (Adjust path if you saved it elsewhere)
import { TelecomBIAnalytics } from '@/components/telecom/bi/TelecomBIAnalytics'; 

async function fetchTenantId() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthenticated");

    const { data } = await supabase.from('profiles').select('business_id').eq('id', user.id).single();
    return data?.business_id;
}

export default function TelecomAnalyticsPage() {
    // 1. Get the Context (Tenant ID)
    const { data: tenantId, isLoading, isError } = useQuery({
        queryKey: ['tenant-context'],
        queryFn: fetchTenantId
    });

    if (isLoading) {
        return (
            <div className="flex h-[80vh] w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary/50" />
            </div>
        );
    }

    if (isError || !tenantId) {
        return (
            <div className="p-8">
                <div className="flex items-center gap-4 rounded-lg bg-red-50 p-4 text-red-600">
                    <ShieldAlert className="h-6 w-6" />
                    <p>Unable to verify business context. Please log in again.</p>
                </div>
            </div>
        );
    }

    // 2. Render Your Component with the ID
    return (
        <div className="p-6 md:p-8 max-w-[1600px] mx-auto">
             <div className="mb-6">
                <h1 className="text-3xl font-bold tracking-tight">Business Intelligence</h1>
                <p className="text-muted-foreground">Network performance and subscriber growth analytics.</p>
            </div>
            
            <TelecomBIAnalytics tenantId={tenantId} />
        </div>
    );
}