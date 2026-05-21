'use client';

/**
 * --- LITONU BUSINESS BASE UNIVERSE LTD - IDENTITY TRANSLATOR ---
 * 
 * VERSION: v16.6 OMEGA (REFERENCE-STABLE)
 * JURISDICTION: Multi-Tenant / Multi-Role / Multi-Location
 * 
 * CORE UPGRADES:
 * 1. REFERENCE STABILITY: Wrapped the mapping in useMemo to prevent unnecessary 
 *    re-renders. This is a critical secondary defense against the 429 rate limit.
 * 2. SECTOR DNA WELD: Hardened 'industry' resolution to ensure the Director 
 *    is never "Blind" to their sector.
 * 3. MASTER ANCHOR SYNC: Fully aligned with the v16.2 BusinessContextData schema.
 * 4. PNL & BILLING INTEGRITY: 100% preservation of subscription logic.
 */

import { useMemo } from 'react';
import { useBusinessContext } from './useBusinessContext';

export interface UserProfile {
  id: string;
  business_id: string;
  role: string;
  system_power: string | null; 
  full_name: string;
  business_name: string;      
  business_type?: string;
  industry?: string;
  email: string;
  subscription_status: string | null;
  subscription_plan: string | null;
  setup_complete: boolean;
  currency: string;
  branding_logo: string | null;
  is_ready: boolean; 
}

export function useUserProfile() {
  const { data, isLoading, error } = useBusinessContext();
  
  // The Resolver: Handles both single objects and array returns
  const profile = Array.isArray(data) ? data[0] : data;

  /**
   * ✅ OMEGA REFERENCE WELD:
   * We memoize the mapped data object. This ensures that the physical 
   * memory reference only changes if the underlying profile data changes.
   * This physically stops unnecessary re-renders in the Sidebar/Copilot.
   */
  const mappedData = useMemo(() => {
    if (!profile) return null;

    return {
        // --- 1. IDENTITY ANCHORS (Physical UUIDs) ---
        id: profile.userId || (profile as any).id || (profile as any).user_id,
        business_id: profile.businessId || (profile as any).business_id || (profile as any).tenant_id,
        
        // --- 2. FORENSIC SECTOR DNA ---
        // Cross-references four different metadata keys to kill the NULL industry.
        industry: profile.industry || 
                 (profile as any).industry_sector || 
                 (profile as any).business_type || 
                 'Retail / Wholesale',
                 
        business_type: (profile as any).business_type || profile.industry || 'General',

        // --- 3. EXECUTIVE AUTHORITY ---
        full_name: (profile as any).full_name || profile.userName || (profile as any).name || 'Authorized Operator',
        role: profile.user_role || profile.role || 'admin',
        system_power: profile.system_power || null,
        business_name: profile.business_display_name || profile.businessName || (profile as any).business_name || 'Sovereign Node',
        
        // --- 4. BILLING & SUBSCRIPTION WELD ---
        email: profile.email || (profile as any).email || '', 
        subscription_status: (profile as any).subscription_status || null,
        subscription_plan: (profile as any).subscription_plan || 'Small Business',

        // --- 5. SYSTEM SYNCHRONIZATION ---
        setup_complete: profile.setup_complete ?? true,
        currency: profile.reporting_currency || (profile as any).currency || (profile as any).base_currency || 'UGX',
        branding_logo: profile.branding_logo || null,
        is_ready: !!profile.is_ready
    };
  }, [profile]); // Only re-map if the physical profile object changes

  return {
    data: mappedData,
    isLoading,
    isError: !!error,
    error: error || null,
  };
}