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
        const fetchBusinessProfile = async () => {
            const supabase = createClient();
            
            // We use the resilient RPC function we created earlier. This is crucial for stability.
            const { data, error: rpcError } = await supabase.rpc('get_user_business_profile');

            if (rpcError) {
                setError('Failed to fetch business profile.');
                console.error("Business Context Critical Error:", rpcError);
            } else if (data && data.length > 0) {
                // The RPC returns an array, we take the first (and only) element.
                setProfile(data[0] as BusinessProfile);
            } else {
                // This state occurs if the RPC retried and still found nothing.
                setError('Business profile not found. The user may not be fully set up.');
            }
            setIsLoading(false);
        };

        fetchBusinessProfile();
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