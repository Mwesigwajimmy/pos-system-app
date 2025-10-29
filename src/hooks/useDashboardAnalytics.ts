'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useUserProfile } from './useUserProfile';

const supabase = createClient();

// --- Hook 1: Fetches the Key Performance Indicators ---
export const useDashboardKPIs = () => {
    const { data: userProfile } = useUserProfile();
    const businessId = userProfile?.business_id;

    return useQuery({
        queryKey: ['dashboardKPIs', businessId],
        queryFn: async () => {
            if (!businessId) throw new Error("Business ID not available.");
            const { data, error } = await supabase.rpc('get_dashboard_kpis', { p_business_id: businessId }).single();
            if (error) throw new Error(error.message);
            return data;
        },
        enabled: !!businessId, // Only run query when businessId exists
        staleTime: 1000 * 60 * 5, // Data is considered fresh for 5 minutes
    });
};

// --- Hook 2: Fetches data for the overview chart ---
export const useOverviewChartData = () => {
    const { data: userProfile } = useUserProfile();
    const businessId = userProfile?.business_id;

    return useQuery({
        queryKey: ['overviewChartData', businessId],
        queryFn: async () => {
            if (!businessId) throw new Error("Business ID not available.");
            const { data, error } = await supabase.rpc('get_overview_chart_data', { p_business_id: businessId });
            if (error) throw new Error(error.message);
            return data;
        },
        enabled: !!businessId,
    });
};

// --- Hook 3: Fetches the most recent sales ---
export const useRecentSales = () => {
    const { data: userProfile } = useUserProfile();
    const businessId = userProfile?.business_id;

    return useQuery({
        queryKey: ['recentSales', businessId],
        queryFn: async () => {
            if (!businessId) throw new Error("Business ID not available.");
            const { data, error } = await supabase.rpc('get_recent_sales', { p_business_id: businessId });
            if (error) throw new Error(error.message);
            return data;
        },
        enabled: !!businessId,
    });
};