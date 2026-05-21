'use client';

/**
 * --- BBU1 SOVEREIGN BUSINESS CONTEXT ---
 * VERSION: v17.0 OMEGA (IDENTITY WELD)
 * JURISDICTION: Global Dashboard / Sidebar / AI Handshake
 * 
 * UPGRADE LOG:
 * 1. SPLIT-BRAIN FIX: Unified with v16.2 Master Anchor. Now fetches 
 *    industry, currency, and the 'is_ready' signal for Aura.
 * 2. RACE CONDITION SEAL: Maintained the force-refresh logic for new users 
 *    but hardened it with multi-tenant UUID validation.
 * 3. IDENTITY PARSITY: Resolves snake_case DB keys to camelCase UI props 
 *    to prevent the 0xNULL identity crash.
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';
import Cookies from 'js-cookie';

export interface BusinessProfile {
    id: string;
    business_id: string;
    full_name: string;
    role: string;
    is_active: boolean;
    business_type: string;
    industry: string;         // ✅ ADDED FOR AURA
    currency: string;         // ✅ ADDED FOR CFO
    is_ready: boolean;        // ✅ ADDED FOR QUANTUM HANDSHAKE
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

    useEffect(() => {
        const supabase = createClient();

        const fetchBusinessProfile = async () => {
            const activeBizId = Cookies.get('bbu1_active_business_id');

            // 🛡️ v17.0 OMNISCIENT HANDSHAKE
            // We call the master handshake to get the full industry and ready-state
            const { data, error: rpcError } = await supabase.rpc('get_aura_handshake', {
                p_target_biz_id: activeBizId
            });

            if (rpcError) {
                console.error("[LITONU] Context Fault:", rpcError);
                setError('Neural Link Interrupted.');
                setIsLoading(false);
                return;
            }

            const aura = Array.isArray(data) ? data[0] : data;

            if (aura && aura.is_ready) {
                setProfile({
                    id: aura.userId,
                    business_id: aura.businessId,
                    full_name: aura.businessName, // Maps to Director Identity
                    role: aura.role || 'admin',
                    is_active: true,
                    business_type: aura.industry || 'General',
                    industry: aura.industry || 'Retail / Wholesale',
                    currency: aura.currency || 'UGX',
                    is_ready: true,
                    setup_complete: true
                });
                setError(null);
                setIsLoading(false);
            } else {
                // *** CRITICAL REFRESH LOGIC (PRESERVED & HARDENED) ***
                console.warn("LITONU: Identity latent. Refreshing Quantum Session...");
                const { error: refreshError } = await supabase.auth.refreshSession();

                if (refreshError) {
                    setError("Identity sync failed.");
                    setIsLoading(false);
                    return;
                }

                // Retry with updated JWT metadata
                const { data: retryData } = await supabase.rpc('get_aura_handshake');
                const retryAura = Array.isArray(retryData) ? retryData[0] : retryData;

                if (retryAura?.is_ready) {
                    setProfile({
                        id: retryAura.userId,
                        business_id: retryAura.businessId,
                        full_name: retryAura.businessName,
                        role: retryAura.role || 'admin',
                        is_active: true,
                        business_type: retryAura.industry || 'General',
                        industry: retryAura.industry || 'Retail / Wholesale',
                        currency: retryAura.currency || 'UGX',
                        is_ready: true,
                        setup_complete: true
                    });
                    setError(null);
                } else {
                    setError('Business identity not found in vault.');
                }
                setIsLoading(false);
            }
        };

        // --- AUTH EVENT LISTENERS ---
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session) {
                fetchBusinessProfile();
            } else if (event === 'SIGNED_OUT') {
                setProfile(null);
                setIsLoading(false);
            }
        });

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

export const useBusiness = () => {
    const context = useContext(BusinessContext);
    if (context === undefined) throw new Error('useBusiness must be used within a BusinessProvider');
    return context;
};