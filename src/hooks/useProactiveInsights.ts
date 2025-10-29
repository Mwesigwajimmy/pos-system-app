'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useUserProfile } from './useUserProfile';
import type { Insight } from '@/components/dashboard/InsightCard'; // We will define this in the component

const supabase = createClient();

/**
 * A dedicated hook to fetch all proactive, AI-analyzed business insights.
 * It securely invokes a Supabase RPC function which performs the analysis.
 */
export const useProactiveInsights = () => {
    const { data: userProfile } = useUserProfile();
    const businessId = userProfile?.business_id;

    return useQuery<Insight[], Error>({ 
        queryKey: ['proactiveInsights', businessId], 
        queryFn: async () => {
            if (!businessId) return [];
            const { data, error } = await supabase.rpc('get_proactive_insights', { p_business_id: businessId });
            if (error) throw new Error(error.message);
            return data as Insight[];
        },
        enabled: !!businessId,
        staleTime: 1000 * 60 * 5, // Insights are fresh for 5 minutes
        refetchOnWindowFocus: true, 
    });
};