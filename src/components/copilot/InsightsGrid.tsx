'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import InsightCard, { Insight } from './InsightCard';
import { Loader2, ServerCrash } from 'lucide-react';
import { useUserProfile } from '@/hooks/useUserProfile';
import React from 'react';

const supabase = createClient();

async function fetchProactiveInsights(businessId: string): Promise<Insight[]> {
    if (!businessId) return [];
    // This RPC would be your custom Supabase function that runs complex queries
    // to find actionable insights for a specific business.
    // NOTE: This assumes your Supabase RPC handles the multi-tenant p_business_id
    const { data, error } = await supabase.rpc('get_proactive_insights', { p_business_id: businessId });
    if (error) throw new Error(error.message);
    return data as Insight[];
}

interface InsightsGridProps {
    onAskAI: (prompt: string) => void;
}

export default function InsightsGrid({ onAskAI }: InsightsGridProps) {
    const { data: userProfile } = useUserProfile();
    // FIX: Safely extract business_id and explicitly cast to any to handle type inconsistencies 
    const businessId = (userProfile as any)?.business_id || ''; 

    const { data: insights, isLoading, isError, error } = useQuery({
        queryKey: ['proactiveInsights', businessId],
        queryFn: () => fetchProactiveInsights(businessId),
        enabled: !!businessId, // Only run the query when businessId is available
        staleTime: 1000 * 60 * 5, // Refetch insights every 5 minutes
    });

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-48 text-muted-foreground">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                <span>Aura is analyzing your business...</span>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="flex flex-col items-center justify-center h-48 text-destructive bg-destructive/10 rounded-lg">
                <ServerCrash className="h-8 w-8 mb-2" />
                <p className="font-semibold">Failed to load AI Insights</p>
                <p className="text-xs">{error.message}</p>
            </div>
        );
    }

    if (!insights || insights.length === 0) {
        return (
            <div className="text-center h-48 flex flex-col justify-center items-center bg-muted/20 rounded-lg">
                <h3 className="font-semibold">All Clear!</h3>
                <p className="text-sm text-muted-foreground">Aura has not found any immediate insights for you.</p>
            </div>
        );
    }

    return (
        <div className="columns-1 md:columns-2 lg:columns-3 xl:columns-4 gap-4 space-y-4">
            {insights.map((insight) => (
                <InsightCard key={insight.id} insight={insight} onAskAI={onAskAI} />
            ))}
        </div>
    );
}