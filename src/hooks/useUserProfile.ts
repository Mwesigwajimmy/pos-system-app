'use client';

import { useBusinessContext } from './useBusinessContext';

/**
 * LITONU BUSINESS BASE UNIVERSE LTD - ENTERPRISE PROFILE SCHEMA
 * 
 * UPGRADE: Deeply integrated identity and billing state.
 * This schema defines the C-Suite authority for the BBU1 Universe.
 */
export interface UserProfile {
  id: string;
  business_id: string;
  role: string;
  system_power: string | null; 
  full_name: string;
  business_name: string;      
  business_type?: string;
  industry?: string;
  
  // --- ADDED FOR BILLING & SECURITY GATE ---
  email: string;
  subscription_status: string | null;
  subscription_plan: string | null;

  // --- SYSTEM STATE KEYS ---
  setup_complete: boolean;
  currency: string;
  branding_logo: string | null;
}

/**
 * LITONU BUSINESS BASE UNIVERSE LTD - IDENTITY TRANSLATOR
 * 
 * UPGRADE: Aligned with the Deep Context RPC.
 * This ensures the Sidebar and Copilot receive the correct "Active" identity
 * during multi-tenant node swaps and verifies billing status for Aura access.
 */
export function useUserProfile() {
  const { data, isLoading, error } = useBusinessContext();
  
  // The Resolver: Handles both single objects and array returns from the Supabase RPC
  const profile = Array.isArray(data) ? data[0] : data;

  return {
    data: profile ? {
        id: profile.userId || (profile as any).id || (profile as any).user_id,
        business_id: profile.businessId || (profile as any).business_id || (profile as any).tenant_id,
        
        // --- DEEP CONTEXT MAPPING ---
        // Maps the SQL return values to your Frontend variables
        full_name: (profile as any).full_name || (profile as any).name || 'Authorized Operator',
        
        // Priority 1: The Context Role (e.g. Accountant) from the active business node
        // Priority 2: The Fallback role from the global profile
        role: profile.user_role || (profile as any).role || 'admin',
        
        // Captures 'architect' or 'commander' status for God-Mode UI logic
        system_power: profile.system_power || null,
        
        // Captures the Professional name (e.g. NIM UGANDA LTD) resolved by the RPC
        business_name: profile.business_display_name || (profile as any).business_name || 'Sovereign Node',
        
        business_type: profile.business_type,
        industry: profile.industry_sector || profile.industry,

        // --- BILLING IDENTITY WELD ---
        // Essential for PesaPal initialization and Billing Page authorization
        email: profile.email || (profile as any).email || '', 
        subscription_status: profile.subscription_status || (profile as any).subscription_status || null,
        subscription_plan: profile.subscription_plan || (profile as any).subscription_plan || null,

        // --- SYSTEM SYNCHRONIZATION ---
        // Forces the UI to respect the setup and currency context of the business
        setup_complete: profile.setup_complete ?? true,
        currency: profile.reporting_currency || (profile as any).base_currency || 'UGX',
        branding_logo: profile.branding_logo || null
    } : null,
    isLoading,
    isError: !!error,
    error: error || null,
  };
}