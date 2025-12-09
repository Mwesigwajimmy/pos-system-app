'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { StatAuditPanel } from '@/components/lending/StatAuditPanel';
import { Loader2, Landmark } from 'lucide-react';

// --- Context Fetcher ---
async function fetchUserContext() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthenticated');
    const { data } = await supabase.from('profiles').select('business_id').eq('id', user.id).single();
    return data?.business_id;
}

export default function AuditPage() {
    const { data: tenantId, isLoading } = useQuery({
        queryKey: ['tenantId'],
        queryFn: fetchUserContext
    });

    if (isLoading) return <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin h-8 w-8 text-primary"/></div>;
    if (!tenantId) return <div className="p-8 text-red-600">Error: Configuration Missing.</div>;

    return (
        <div className="p-8 space-y-6">
             <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                        <Landmark className="h-8 w-8 text-primary" /> Statutory Audit
                    </h2>
                    <p className="text-muted-foreground">Generate, download, and track regulatory compliance reports.</p>
                </div>
            </div>
            <StatAuditPanel tenantId={tenantId} />
        </div>
    );
}