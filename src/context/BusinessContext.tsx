'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';

// Define the shape of our core business profile data.
// This will be the single source of truth for the user's identity and tenancy.
export interface BusinessProfile {
    id: string;          // User's UUID
    business_id: string; // The Tenant's UUID
    full_name: string;
    role: string;
    is_active: boolean;
    business_type: string;
}

// Define the shape of the context that our components will consume.
interface BusinessContextType {
    profile: BusinessProfile | null;
    isLoading: boolean;
    error: string | null;
}

// Create the actual React Context.
const BusinessContext = createContext<BusinessContextType | undefined>(undefined);

/**
 * The BusinessProvider is a component that wraps your entire authenticated application.
 * It is responsible for fetching the user's business profile once and providing it
 * to all descendant components. This eliminates redundant data fetching and race conditions.
 */
export const BusinessProvider = ({ children }: { children: ReactNode }) => {
    const [profile, setProfile] = useState<BusinessProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // --- THIS ENTIRE useEffect BLOCK IS THE FIX ---

        const supabase = createClient();

        // The fetch function remains the same, but with better state clearing.
        const fetchBusinessProfile = async () => {
            // We use the resilient RPC function we created earlier. This is crucial for stability.
            const { data, error: rpcError } = await supabase.rpc('get_user_business_profile');

            if (rpcError) {
                setError('Failed to fetch business profile.');
                setProfile(null);
                console.error("Business Context Critical Error:", rpcError);
            } else if (data && data.length > 0) {
                // The RPC returns an array, we take the first (and only) element.
                setProfile(data[0] as BusinessProfile);
                setError(null); // Clear previous errors on success
            } else {
                // This state occurs if the RPC retried and still found nothing.
                setError('Business profile not found. The user may not be fully set up.');
                setProfile(null);
            }
            setIsLoading(false);
        };

        // We listen for when the user signs in or out to avoid a race condition.
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN' && session) {
                // Fetch the profile only AFTER we know the user is signed in.
                fetchBusinessProfile();
            } else if (event === 'SIGNED_OUT') {
                // Clear all data on sign out.
                setProfile(null);
                setError(null);
                setIsLoading(false);
            }
        });

        // Also check for a session when the component first mounts.
        const checkInitialSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                fetchBusinessProfile();
            } else {
                setIsLoading(false); // No user is logged in, stop loading.
            }
        };

        checkInitialSession();

        // This function cleans up the listener when the component is removed.
        return () => {
            subscription.unsubscribe();
        };

    }, []);

    const value = { profile, isLoading, error };

    return (
        <BusinessContext.Provider value={value}>
            {children}
        </BusinessContext.Provider>
    );
};

/**
 * A custom hook for easy, type-safe access to the business context.
 * All components will now use this hook instead of fetching data themselves.
 * e.g., const { profile, isLoading } = useBusiness();
 */
export const useBusiness = (): BusinessContextType => {
    const context = useContext(BusinessContext);
    if (context === undefined) {
        throw new Error('useBusiness must be used within a BusinessProvider');
    }
    return context;
};