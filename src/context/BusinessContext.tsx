'use client';

/**
 * --- BBU1 SOVEREIGN BUSINESS CONTEXT ---
 * VERSION: v21.0 OMEGA-ULTIMATUM (THE KEYBOARD ACTIVATION WELD)
 * JURISDICTION: Multi-Tenant / Multi-Sector Forensic Identity
 * 
 * CORE ARCHITECTURAL UPGRADES:
 * 1. EXPLICIT USER ANCHOR: Now physically retrieves the Auth Session ID 
 *    before calling the RPC. This prevents 'null' userId results and 
 *    correctly triggers the 'is_ready' boolean.
 * 2. MULTI-COLUMN MAPPING: Maps the RPC 'businessId' to both 'business_id' 
 *    and 'profile_linked_biz_id' to satisfy the Copilot's internal search.
 * 3. TYPING ACTIVATION: Hard-welds 'is_ready' and 'setup_complete' based on 
 *    the successful Omniscient Handshake verified in the SQL audit.
 * 4. SINGLETON FETCH GUARD: Prevents recursive handshake loops that lead to 
 *    429 Rate Limit errors.
 */

import React, { createContext, useContext, useState, useEffect, ReactNode, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import Cookies from 'js-cookie';

export interface BusinessProfile {
    id: string;
    auth_user_id: string;        
    business_id: string;
    profile_linked_biz_id: string; 
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
    const isFetching = useRef(false); 
    const MAX_RETRIES = 5; 

    const fetchBusinessProfile = useCallback(async () => {
        // 🛡️ Prevent multiple concurrent attempts
        if (isFetching.current) return;
        isFetching.current = true;

        const supabase = createClient();
        
        try {
            // 1. PHYSICALLY IDENTIFY THE SESSION USER
            // This is the fix for the 'null' userId seen in your console.
            const { data: { session } } = await supabase.auth.getSession();
            const activeUserId = session?.user?.id;

            if (!activeUserId) {
                console.warn("[AURA] No active session found. Waiting for Auth.");
                setIsLoading(false);
                isFetching.current = false;
                return;
            }

            const activeBizIdFromCookie = Cookies.get('bbu1_active_business_id');

            // 2. EXECUTE THE OMNISCIENT HANDSHAKE
            // Passing p_user_id explicitly to match our SQL repair.
            const { data, error: rpcError } = await supabase.rpc('get_aura_handshake', {
                p_target_biz_id: (activeBizIdFromCookie && activeBizIdFromCookie !== 'loading') ? activeBizIdFromCookie : null,
                p_user_id: activeUserId
            });

            if (rpcError) {
                console.error("[AURA] Handshake RPC Fault:", rpcError);
                setError('Identity Vault Connection Failed.');
                setIsLoading(false);
                isFetching.current = false;
                return;
            }

            const aura = Array.isArray(data) ? data[0] : data;

            // 3. VALIDATE AND WELD THE IDENTITY
            // We check if the database says 'is_ready' is true.
            if (aura && aura.is_ready === true) {
                
                const finalBizId = aura.businessId;

                // Sync the cookie for server-side operations
                Cookies.set('bbu1_active_business_id', finalBizId, { expires: 30, path: '/', sameSite: 'lax' });

                // Set the Profile - This object is consumed by useCopilot()
                setProfile({
                    id: aura.userId,
                    auth_user_id: aura.userId,
                    business_id: finalBizId,
                    profile_linked_biz_id: finalBizId, // PHYSICALLY SEALED FOR COPILOT
                    full_name: aura.businessName || 'Sovereign Node', 
                    role: aura.role || 'admin',
                    system_power: aura.power || null,
                    is_active: true,
                    business_type: aura.industry || 'Retail / Wholesale',
                    industry: aura.industry || 'Retail / Wholesale',
                    currency: aura.currency || 'UGX',
                    country: aura.country || 'UG',
                    is_ready: true, // ✅ THIS UNLOCKS THE TYPING FIELD
                    setup_complete: true
                });

                setError(null);
                setIsLoading(false);
                retryCount.current = 0;
                isFetching.current = false;
                console.log("%c[AURA] Identity Handshake: SECURE & READY.", "color: #10B981; font-weight: bold;");
            } else {
                // 🔄 Latency Recovery logic
                if (retryCount.current < MAX_RETRIES) {
                    retryCount.current++;
                    console.warn(`[AURA] Identity Latent. Re-attempting handshake ${retryCount.current}/${MAX_RETRIES}`);
                    isFetching.current = false; 
                    setTimeout(fetchBusinessProfile, 2000); 
                } else {
                    console.error("[AURA] Critical: Identity alignment timeout.");
                    setError('Business identity not aligned.');
                    setIsLoading(false);
                    isFetching.current = false;
                }
            }
        } catch (err: any) {
            isFetching.current = false;
            console.error("[AURA] Unexpected Handshake Error:", err);
            setError('Neural Link Interrupted.');
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        const supabase = createClient();

        // 🛡️ RE-ANCHOR ON AUTH CHANGE
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
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

        // Trigger handshake on mount
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
    if (context === undefined) throw new Error('useBusiness must be used within a BusinessProvider');
    return context;
};