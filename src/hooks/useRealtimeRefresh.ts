'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';

/**
 * Listens to database changes and triggers a dashboard refresh.
 * @param tables Array of table names to watch (e.g., ['sales', 'orders'])
 * @param queryKeys Array of query keys to invalidate (e.g., ['retail-dash'])
 */
export function useRealtimeRefresh(tables: string[], queryKeys: string[]) {
    const queryClient = useQueryClient();
    const supabase = createClient();

    useEffect(() => {
        // Create a unique channel name based on the tables being watched
        const channelName = `dashboard-realtime-${tables.join('-')}`;

        const channel = supabase.channel(channelName)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public' },
                (payload) => {
                    // Check if the change is in one of the tables we care about
                    if (tables.includes(payload.table)) {
                        console.log(`⚡ Real-time update: ${payload.table} changed. Refreshing dashboard...`);
                        
                        // 1. Force React Query to re-fetch the data immediately
                        queryKeys.forEach(key => {
                            queryClient.invalidateQueries({ queryKey: [key] });
                        });

                        // 2. Visual Feedback (Optional but professional)
                        // Only show toast for creation events (new sales/orders) to avoid spamming on updates
                        if (payload.eventType === 'INSERT') {
                            // Using a subtle toast
                            // toast.success('Dashboard updated', { duration: 2000, icon: '⚡' });
                        }
                    }
                }
            )
            .subscribe();

        // Cleanup subscription when component unmounts
        return () => {
            supabase.removeChannel(channel);
        };
    }, [tables, queryKeys, queryClient, supabase]);
}