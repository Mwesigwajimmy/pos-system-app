'use client';

/**
 * --- BBU1 SOVEREIGN BUSINESS CONTEXT ---
 * VERSION: v19.8 OMEGA-ULTIMATUM (THE STABILIZED WELD)
 * 
 * CORE FIXES:
 * 1. DECOUPLED AUTH LISTENER: Removed TOKEN_REFRESHED from the fetch trigger.
 *    Token refreshes are background tasks and shouldn't restart the identity handshake.
 * 2. ELIMINATED RECURSIVE REFRESH: Removed auth.refreshSession() from the polling loop.
 *    This physically stops the 429 Rate Limit errors.
 * 3. SINGLETON FETCH GUARD: Added 'isFetching' ref to ensure only ONE handshake 
 *    process is active at any time, preventing race conditions.
 */

import React, { createContext, useContext, useState, useEffect, ReactNode, useRef, useCallback } from 'react';
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
    country: string;
    is_ready: boolean;
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
    
    const retryCount = useRef(0);
    const isFetching = useRef(false); // Singleton Guard
    const MAX_RETRIES = 8; // Increased to give DB more time without hammering

    const fetchBusinessProfile = useCallback(async () => {
        // Prevent multiple concurrent handshake attempts
        if (isFetching.current) return;
        isFetching.current = true;

        const supabase = createClient();
        const activeBizId = Cookies.get('bbu1_active_business_id');

        try {
            const { data, error: rpcError } = await supabase.rpc('get_aura_handshake', {
                p_target_biz_id: (activeBizId && activeBizId !== 'loading') ? activeBizId : null
            });

            if (rpcError) {
                if ((rpcError as any).status === 429) throw new Error("RATE_LIMIT");
                console.error("[LITONU] Handshake RPC Fault:", rpcError);
                setError('Identity Vault Connection Failed.');
                setIsLoading(false);
                isFetching.current = false;
                return;
            }

            const aura = Array.isArray(data) ? data[0] : data;

            if (aura && aura.is_ready) {
                // ✅ SUCCESS: ALIGNMENT ACHIEVED
                Cookies.set('bbu1_active_business_id', aura.businessId, { expires: 30, path: '/', sameSite: 'lax' });

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
                retryCount.current = 0;
                isFetching.current = false;
            } else {
                // 🔄 LATENCY RECOVERY (No Auth Refresh here to avoid 429 loop)
                if (retryCount.current < MAX_RETRIES) {
                    retryCount.current++;
                    console.warn(`[LITONU] Identity Latent. Polling Attempt ${retryCount.current}/${MAX_RETRIES}...`);
                    
                    isFetching.current = false; // Release guard for the next timeout
                    setTimeout(fetchBusinessProfile, 3000); // 3s delay for DB stability
                } else {
                    console.error("[LITONU] Critical: Identity alignment timeout.");
                    setError('Business identity not aligned. Please secure re-login.');
                    setIsLoading(false);
                    isFetching.current = false;
                }
            }
        } catch (err: any) {
            isFetching.current = false;
            if (err.message === "RATE_LIMIT") {
                setError('System heavily throttled. Waiting 30s...');
                setTimeout(fetchBusinessProfile, 30000);
            } else {
                setError('Neural Link Interrupted.');
                setIsLoading(false);
            }
        }
    }, []);

    useEffect(() => {
        const supabase = createClient();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            // ONLY trigger handshake on explicit sign-ins. 
            // Ignore TOKEN_REFRESHED to prevent recursive loops.
            if (event === 'SIGNED_IN' && session) {
                retryCount.current = 0;
                fetchBusinessProfile();
            } else if (event === 'SIGNED_OUT') {
                setProfile(null);
                setIsLoading(false);
                setError(null);
                Cookies.remove('bbu1_active_business_id');
            }
        });

        // Initial check on mount
        fetchBusinessProfile();

        return () => subscription.unsubscribe();
    }, [fetchBusinessProfile]);

    return (
        <BusinessContext.Provider value={{ profile, isLoading, error }}>
            {children}
        </BusinessContext.Provider>
    );
};

export const useBusiness = () => {
    const context = useContext(BusinessContext);
    if (context === undefined) throw new Error('useBusiness fault.');
    return context;
};