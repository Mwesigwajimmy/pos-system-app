'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { OpenAPIGatewayPanel } from '@/components/lending/OpenAPIGatewayPanel';
import { Loader2, Globe } from 'lucide-react';

// Fetch Context
async function fetchUserContext() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthenticated');
    
    // Check if user has 'admin' or 'developer' role
    const { data } = await supabase.from('profiles').select('business_id, role').eq('id', user.id).single();
    return data;
}

export default function ApiGatewayPage() {
    const { data, isLoading } = useQuery({
        queryKey: ['userContext'],
        queryFn: fetchUserContext
    });

    if (isLoading) return <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin h-8 w-8 text-primary"/></div>;
    
    if (!data?.business_id) return <div className="p-8 text-red-600">Configuration Error.</div>;

    // Optional: Role Check
    // if (data.role !== 'admin') return <div>Access Denied.</div>;

    return (
        <div className="p-8 space-y-6">
             <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                        <Globe className="h-8 w-8 text-primary" /> Developer API
                    </h2>
                    <p className="text-muted-foreground">Manage API keys, webhooks, and third-party integrations.</p>
                </div>
            </div>
            <OpenAPIGatewayPanel tenantId={data.business_id} />
        </div>
    );
}