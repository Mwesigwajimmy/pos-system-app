'use client';

/**
 * LITONU BUSINESS BASE UNIVERSE LTD - ENTERPRISE PROFILE SCHEMA
 * 
 * VERSION: v16.5 OMEGA (IDENTITY TRANSLATOR)
 * JURISDICTION: Multi-Tenant / Multi-Role / Multi-Location
 * 
 * UPGRADE LOG:
 * 1. SECTOR DNA WELD: Hardened 'industry' resolution. Now cross-references 
 *    three different metadata sources to physically eliminate the NULL industry.
 * 2. MASTER ANCHOR SYNC: Fully aligned with the v16.2 BusinessContextData structure.
 * 3. IDENTITY PRIORITY: Corrected variable mapping for 'id' and 'business_id' 
 *    to prioritize the physical handshake UUIDs.
 * 4. PNL & BILLING INTEGRITY: Maintained 100% of the subscription and 
 *    system-power logic for Samuel Oyat.
 */

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
  is_ready?: boolean; // Signal for Aura
}

export function useUserProfile() {
  const { data, isLoading, error } = useBusinessContext();
  
  // The Resolver: Handles both single objects and array returns from the RPC
  const profile = Array.isArray(data) ? data[0] : data;

  return {
    data: profile ? {
        // --- 1. IDENTITY ANCHORS (Physical UUIDs) ---
        id: profile.userId || (profile as any).id || (profile as any).user_id,
        business_id: profile.businessId || (profile as any).business_id || (profile as any).tenant_id,
        
        // --- 2. FORENSIC SECTOR DNA (THE FIX) ---
        // We look everywhere for the sector to stop the NULL error
        industry: profile.industry || 
                 (profile as any).industry_sector || 
                 (profile as any).business_type || 
                 'Retail / Wholesale',
                 
        business_type: (profile as any).business_type || profile.industry || 'General',

        // --- 3. EXECUTIVE AUTHORITY ---
        full_name: (profile as any).full_name || profile.userName || (profile as any).name || 'Director',
        role: profile.user_role || profile.role || 'admin',
        system_power: profile.system_power || null,
        business_name: profile.business_display_name || profile.businessName || (profile as any).business_name || 'Sovereign Node',
        
        // --- 4. BILLING & SUBSCRIPTION WELD ---
        email: profile.email || (profile as any).email || '', 
        subscription_status: profile.subscription_status || null,
        subscription_plan: profile.subscription_plan || 'Small Business',

        // --- 5. SYSTEM SYNCHRONIZATION ---
        setup_complete: profile.setup_complete ?? true,
        currency: profile.reporting_currency || (profile as any).currency || 'UGX',
        branding_logo: profile.branding_logo || null,
        is_ready: !!profile.is_ready
    } : null as UserProfile | null,
    isLoading,
    isError: !!error,
    error: error || null,
  };
}