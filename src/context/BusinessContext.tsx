'use client';

/**
 * --- BBU1 SOVEREIGN BUSINESS CONTEXT ---
 * VERSION: v18.8 OMEGA-ULTIMATUM (DEEP IDENTITY WELD)
 * JURISDICTION: Global Dashboard / Multi-Tenant / Multi-Country
 * 
 * CORE FIXES:
 * 1. LATENCY PROTECTION: Implemented a recursive polling mechanism (MAX_RETRIES).
 *    This gives the database trigger 'handle_new_user_master_v1' time to complete
 *    Tenant/Org/Membership creation before the UI fails.
 * 2. JSONB MAPPING: Corrected the parsing logic to match the 'get_aura_handshake' 
 *    JSON return format exactly (userId, businessId, businessName, etc.).
 * 3. MULTI-JURISDICTION: Added 'country' and 'system_power' to the identity anchor.
 * 4. REDIRECT SHIELD: Keeps 'isLoading' true during retries to prevent the 
 *    DashboardGatekeeper from triggering the "Identity Desync" error screen prematurely.
 */

import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import Cookies from 'js-cookie';

export interface BusinessProfile {
    id: string;
    business_id: string;
    full_name: string;
    role: string;
    system_power: string | null;
    is_active: boolean;
    business_type: string;
    industry: string;
    currency: string;
    country: string;         // ✅ DEEP WELD: Multi-Country Support
    is_ready: boolean;        // ✅ DEEP WELD: Aura Readiness Signal
    setup_complete: boolean;
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
    
    // Use a Ref to track retries across re-renders for new signups/slow triggers
    const retryCount = useRef(0);
    const MAX_RETRIES = 6; // Total 12 seconds grace period for database "Birth"

    const fetchBusinessProfile = async () => {
        const supabase = createClient();
        const activeBizId = Cookies.get('bbu1_active_business_id');

        try {
            // 🛡️ DEEP VERIFICATION CALL
            // Calling the RPC that verifies AI Keys, Tenants, and Profiles in one go
            const { data, error: rpcError } = await supabase.rpc('get_aura_handshake', {
                p_target_biz_id: activeBizId && activeBizId !== 'loading' ? activeBizId : null
            });

            if (rpcError) {
                console.error("[LITONU] Handshake RPC Fault:", rpcError);
                setError('Neural Link Interrupted.');
                setIsLoading(false);
                return;
            }

            // Parse the JSONB return from the database
            const aura = Array.isArray(data) ? data[0] : data;

            if (aura && aura.is_ready) {
                // ✅ FULLY ALIGNED: All links (Profile, Tenant, Membership, AI Keys) verified
                setProfile({
                    id: aura.userId,
                    business_id: aura.businessId,
                    full_name: aura.businessName, 
                    role: aura.role || 'admin',
                    system_power: aura.power || null,
                    is_active: true,
                    business_type: aura.industry || 'General',
                    industry: aura.industry || 'Retail / Wholesale',
                    currency: aura.currency || 'UGX',
                    country: aura.country || 'UG',
                    is_ready: true,
                    setup_complete: aura.setup_complete ?? true
                });
                setError(null);
                setIsLoading(false);
                retryCount.current = 0; // Reset counter on success
            } else {
                // 🔄 IDENTITY RECOVERY POLLING
                // If is_ready is false, the database is likely still running triggers
                if (retryCount.current < MAX_RETRIES) {
                    retryCount.current++;
                    console.warn(`[LITONU] Identity Latent. Polling Attempt ${retryCount.current}/${MAX_RETRIES}...`);
                    
                    // Force a session refresh on first retry to sync JWT metadata
                    if (retryCount.current === 1) {
                        await supabase.auth.refreshSession();
                    }

                    // Wait 2 seconds and try again
                    setTimeout(fetchBusinessProfile, 2000);
                } else {
                    // ❌ FINAL DESYNC: Database failed to verify the business after multiple attempts
                    console.error("[LITONU] Deep Verification Failed: Data exists but is not aligned.");
                    setError('Business identity not found in vault.');
                    setIsLoading(false);
                }
            }
        } catch (err) {
            console.error("[LITONU] Unexpected Identity Fault:", err);
            setError('Neural Link Interrupted.');
            setIsLoading(false);
        }
    };

    useEffect(() => {
        const supabase = createClient();

        // Listen for Auth changes to trigger identity hydration
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session) {
                retryCount.current = 0;
                fetchBusinessProfile();
            } else if (event === 'SIGNED_OUT') {
                setProfile(null);
                setIsLoading(false);
                Cookies.remove('bbu1_active_business_id');
            }
        });

        // Initial fetch on mount
        fetchBusinessProfile();

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    return (
        <BusinessContext.Provider value={{ profile, isLoading, error }}>
            {children}
        </BusinessContext.Provider>
    );
};

/**
 * Hook for consuming the Sovereign Business Context
 */
export const useBusiness = () => {
    const context = useContext(BusinessContext);
    if (context === undefined) {
        throw new Error('useBusiness must be used within a BusinessProvider');
    }
    return context;
};