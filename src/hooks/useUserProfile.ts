'use client';

import { useBusinessContext } from './useBusinessContext';

export interface UserProfile {
  id: string;
  business_id: string;
  role: string;
  system_power: string | null; // NEW: Captures Architect status
  full_name: string;
  business_name: string;      // NEW: Captures the Dynamic Name
  business_type?: string;
  industry?: string;
}

/**
 * LITONU BUSINESS BASE UNIVERSE LTD - IDENTITY TRANSLATOR
 * 
 * UPGRADE: Aligned with the Deep Context RPC.
 * This ensures the Sidebar receives the correct "Active" identity
 * during multi-tenant node swaps.
 */
export function useUserProfile() {
  const { data, isLoading, error } = useBusinessContext();
  
  const profile = Array.isArray(data) ? data[0] : data;

  return {
    data: profile ? {
        id: profile.userId || (profile as any).id,
        business_id: profile.businessId || (profile as any).business_id,
        
        // --- DEEP CONTEXT MAPPING ---
        // Maps the SQL return values to your Frontend variables
        full_name: (profile as any).full_name || 'Authorized Operator',
        
        // Priority 1: The Context Role (e.g. Accountant) 
        // Priority 2: The Fallback role
        role: profile.user_role || (profile as any).role || 'admin',
        
        // Captures if the user is an 'architect' or 'commander'
        system_power: profile.system_power || null,
        
        // Captures the Professional name (NIM UGANDA LTD)
        business_name: profile.business_display_name || (profile as any).business_name || 'Sovereign Node',
        
        business_type: profile.business_type,
        industry: profile.industry_sector || profile.industry
    } : null,
    isLoading,
    isError: !!error,
    error: error || null,
  };
}