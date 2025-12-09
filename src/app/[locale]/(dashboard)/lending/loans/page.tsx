'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import ActiveLoansTable from '@/components/lending/ActiveLoansTable';
import { Loader2, FileCheck } from 'lucide-react';

// Fetcher: Get User's Tenant ID (Context)
async function fetchUserContext() {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error('Not authenticated');

    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('business_id')
        .eq('id', user.id)
        .single();

    if (profileError) throw profileError;
    return { userId: user.id, tenantId: profile?.business_id };
}

export default function ActiveLoansPage() {
    const router = useRouter();

    const { data, isLoading, isError } = useQuery({
        queryKey: ['userContext'],
        queryFn: fetchUserContext,
        retry: 1
    });

    useEffect(() => {
        if (isError) router.push('/login');
    }, [isError, router]);

    if (isLoading) {
        return <div className="h-full w-full flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    }

    if (!data?.tenantId) return <div className="p-8 text-red-600">Configuration Error: No Tenant/Business ID found for this user.</div>;

    return (
        <div className="flex flex-col h-full space-y-6 p-8">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                        <FileCheck className="h-8 w-8 text-primary" /> Active Loans
                    </h2>
                    <p className="text-muted-foreground">Monitor ongoing loan portfolio, statuses, and upcoming collections.</p>
                </div>
            </div>
            {/* The Table Component */}
            <ActiveLoansTable tenantId={data.tenantId} />
        </div>
    );
}