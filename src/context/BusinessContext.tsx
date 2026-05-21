'use client';

/**
 * --- BBU1 SOVEREIGN BUSINESS CONTEXT ---
 * VERSION: v19.7 OMEGA-ULTIMATUM (THE FINAL IDENTITY WELD)
 * JURISDICTION: Global Dashboard / Multi-Tenant / Multi-Country
 * 
 * CORE ARCHITECTURAL FIXES:
 * 1. ANTI-LOOP SHIELD (429 FIX): Implemented an 'isRefreshing' lock and 
 *    strict retry limits. This physically stops the rapid-fire session 
 *    refreshes that cause Supabase Rate Limiting.
 * 2. COOKIE ALIGNMENT: As soon as the 'get_aura_handshake' returns the 
 *    correct Business ID, we force-update the 'bbu1_active_business_id' 
 *    cookie. This ensures the Middleware and Frontend are perfectly synced.
 * 3. LATENCY RECOVERY: Maintains the recursive polling logic but with 
 *    increased delays (2.5s) to allow database triggers (Tenant/Org/Profile) 
 *    to finalize in the background.
 * 4. OMNISCIENT MAPPING: Direct JSONB alignment for userId, businessId, 
 *    businessName, country, and currency.
 */

import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import Cookies from 'js-cookie';

// --- DATA STRUCTURES ---
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
    country: string;         // ✅ JURISDICTIONAL ANCHOR
    is_ready: boolean;       // ✅ READINESS SIGNAL
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
    
    // --- CONTROL REFS (Anti-Recursion) ---
    const retryCount = useRef(0);
    const isRefreshing = useRef(false);
    const MAX_RETRIES = 5; 

    /**
     * MASTER FETCH: The Sovereign Handshake
     * Physically verifies the link between Auth and the Business Vault.
     */
    const fetchBusinessProfile = async () => {
        const supabase = createClient();
        const activeBizId = Cookies.get('bbu1_active_business_id');

        try {
            // 🛡️ CALL SECURE HANDSHAKE
            const { data, error: rpcError } = await supabase.rpc('get_aura_handshake', {
                p_target_biz_id: activeBizId && activeBizId !== 'loading' ? activeBizId : null
            });

            if (rpcError) {
                // Check for Supabase Rate Limiting
                if ((rpcError as any).status === 429) {
                    throw new Error("RATE_LIMIT");
                }
                console.error("[LITONU] Handshake RPC Fault:", rpcError);
                setError('Identity Vault Connection Failed.');
                setIsLoading(false);
                return;
            }

            const aura = Array.isArray(data) ? data[0] : data;

            if (aura && aura.is_ready) {
                // ✅ SYNC SUCCESS: The database has finalized the Identity Birth
                
                // PHYSICALLY ALIGN COOKIE: Critical for Middleware stability
                Cookies.set('bbu1_active_business_id', aura.businessId, { 
                    expires: 30, 
                    path: '/',
                    sameSite: 'lax'
                });

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
                retryCount.current = 0; // Reset for future session changes
            } else {
                // 🔄 IDENTITY LATENCY RECOVERY
                // The user is authenticated but the Profile/Tenant link is still processing.
                if (retryCount.current < MAX_RETRIES) {
                    retryCount.current++;
                    console.warn(`[LITONU] Identity Latent. Polling Attempt ${retryCount.current}/${MAX_RETRIES}...`);
                    
                    // REFRESH JWT: Pull any new metadata from the database trigger
                    // Locked by isRefreshing to prevent 429 errors.
                    if (retryCount.current === 1 && !isRefreshing.current) {
                        isRefreshing.current = true;
                        console.log("[LITONU] Aligning Quantum Session Metadata...");
                        await supabase.auth.refreshSession();
                        isRefreshing.current = false;
                    }

                    // Use a slightly longer delay (2.5s) to ensure the DB has time to commit.
                    setTimeout(fetchBusinessProfile, 2500);
                } else {
                    // ❌ EXHAUSTED: System failed to align data after 12.5 seconds
                    console.error("[LITONU] Critical: Identity data exists but is not aligned.");
                    setError('Business identity not aligned. Please secure re-login.');
                    setIsLoading(false);
                }
            }
        } catch (err: any) {
            if (err.message === "RATE_LIMIT") {
                setError('System is busy. Retrying in 30 seconds...');
                setTimeout(fetchBusinessProfile, 30000); // Back off heavily on 429
            } else {
                console.error("[LITONU] Unexpected Identity Fault:", err);
                setError('Neural Link Interrupted.');
            }
            setIsLoading(false);
        }
    };

    useEffect(() => {
        const supabase = createClient();

        // Listen for Real-time Auth changes (Login/Logout/Refresh)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session) {
                retryCount.current = 0;
                fetchBusinessProfile();
            } else if (event === 'SIGNED_OUT') {
                // CLEAR ALL TRACES: Wipe local identity
                setProfile(null);
                setIsLoading(false);
                setError(null);
                Cookies.remove('bbu1_active_business_id');
            }
        });

        // Trigger identity alignment on mount
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
 * SOVEREIGN ACCESS HOOK
 * Ensures children have access to the verified business node.
 */
export const useBusiness = () => {
    const context = useContext(BusinessContext);
    if (context === undefined) {
        throw new Error('Sovereignty Fault: useBusiness must be used within a BusinessProvider');
    }
    return context;
};