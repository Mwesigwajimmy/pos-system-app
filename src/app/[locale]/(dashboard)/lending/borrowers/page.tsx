'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import BorrowerManager from '@/components/lending/BorrowerManager';
import { Loader2 } from 'lucide-react';

async function fetchUserContext() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthenticated');
    const { data } = await supabase.from('profiles').select('business_id').eq('id', user.id).single();
    return data?.business_id;
}

export default function BorrowersPage() {
    const { data: tenantId, isLoading } = useQuery({
        queryKey: ['tenantId'],
        queryFn: fetchUserContext
    });

    if (isLoading) return <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;
    
    if (!tenantId) return <div className="p-8 text-red-600">Configuration Error: No Business ID found.</div>;

    return (
        <div className="p-8 space-y-6">
            <BorrowerManager tenantId={tenantId} />
        </div>
    );
}