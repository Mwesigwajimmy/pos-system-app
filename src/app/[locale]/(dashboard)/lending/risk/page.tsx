'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { CreditRiskDashboard } from '@/components/lending/CreditRiskDashboard';
import { Loader2, ShieldCheck } from 'lucide-react';

async function fetchUserContext() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthenticated');
    
    // Check for 'risk_manager' or 'admin' role ideally
    const { data } = await supabase.from('profiles').select('business_id').eq('id', user.id).single();
    return data?.business_id;
}

export default function RiskPage() {
    const { data: tenantId, isLoading } = useQuery({
        queryKey: ['tenantId'],
        queryFn: fetchUserContext
    });

    if (isLoading) return <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin h-8 w-8 text-primary"/></div>;
    if (!tenantId) return <div className="p-8 text-red-600">Configuration Error.</div>;

    return (
        <div className="p-8 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                        <ShieldCheck className="h-8 w-8 text-primary" /> Credit Risk
                    </h2>
                    <p className="text-muted-foreground">Portfolio quality, provisions, and concentration analysis.</p>
                </div>
            </div>
            <CreditRiskDashboard tenantId={tenantId} />
        </div>
    );
}