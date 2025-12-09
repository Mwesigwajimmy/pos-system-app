'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { LendingDashboard } from '@/components/lending/LendingDashboard';
import { Loader2, Landmark } from 'lucide-react';
import { useRouter } from 'next/navigation';

async function fetchUserContext() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthenticated');
    const { data } = await supabase.from('profiles').select('business_id, full_name').eq('id', user.id).single();
    return data;
}

export default function LendingPage() {
    const router = useRouter();
    const { data, isLoading } = useQuery({
        queryKey: ['userContext'],
        queryFn: fetchUserContext
    });

    if (isLoading) return <div className="h-[calc(100vh-4rem)] flex items-center justify-center"><Loader2 className="animate-spin h-10 w-10 text-primary" /></div>;
    
    if (!data?.business_id) return <div className="p-8 text-red-600">Error: Configuration Missing.</div>;

    return (
        <div className="p-8 space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                        <Landmark className="h-8 w-8 text-blue-600" /> Lending Center
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Welcome back, {data.full_name}. Here is your portfolio overview.
                    </p>
                </div>
            </div>
            <LendingDashboard tenantId={data.business_id} />
        </div>
    );
}