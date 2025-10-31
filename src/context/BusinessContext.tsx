'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';

export interface BusinessProfile {
    id: string;
    business_id: string;
    full_name: string;
    role: string;
    is_active: boolean;
    business_type: string;
}

interface BusinessContextType {
    profile: BusinessProfile | null;
    isLoading: boolean;
    error: string | null;
}

const BusinessContext = createContext<BusinessContextType | undefined>(undefined);

export const BusinessProvider = ({ children }: { children: ReactNode }) => {
    const [profile, setProfile] = useState<BusinessProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const supabase = createClient();

        const fetchBusinessProfile = async () => {
            const { data, error: rpcError } = await supabase.rpc('get_user_business_profile');

            if (rpcError) {
                setError('Failed to fetch business profile.');
                setProfile(null);
                setIsLoading(false);
                console.error("Business Context Critical Error:", rpcError);
                return; // Exit on hard error
            }

            if (data && data.length > 0) {
                setProfile(data[0] as BusinessProfile);
                setError(null);
                setIsLoading(false);
            } else {
                // *** THIS IS THE CRITICAL FIX FOR THE RACE CONDITION ***
                // Profile not found on first try. This might be a new user with a stale JWT.
                console.warn("Profile not found on first attempt. Refreshing session to get updated JWT from trigger...");

                // Force a session refresh to get the JWT with the business_id from the trigger.
                const { error: refreshError } = await supabase.auth.refreshSession();

                if (refreshError) {
                    setError("Failed to refresh session for new user.");
                    setIsLoading(false);
                    return;
                }

                // Now, try the RPC call one more time with the refreshed session.
                const { data: dataAfterRefresh, error: rpcErrorAfterRefresh } = await supabase.rpc('get_user_business_profile');

                if (rpcErrorAfterRefresh || !dataAfterRefresh || dataAfterRefresh.length === 0) {
                    setError('Business profile not found. The user may not be fully set up.');
                    setProfile(null);
                } else {
                    setProfile(dataAfterRefresh[0] as BusinessProfile);
                    setError(null);
                }
                setIsLoading(false);
            }
        };

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN' && session) {
                fetchBusinessProfile();
            } else if (event === 'SIGNED_OUT') {
                setProfile(null);
                setError(null);
                setIsLoading(false);
            }
        });

        const checkInitialSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                fetchBusinessProfile();
            } else {
                setIsLoading(false);
            }
        };

        checkInitialSession();

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

export const useBusiness = (): BusinessContextType => {
    const context = useContext(BusinessContext);
    if (context === undefined) {
        throw new Error('useBusiness must be used within a BusinessProvider');
    }
    return context;
};