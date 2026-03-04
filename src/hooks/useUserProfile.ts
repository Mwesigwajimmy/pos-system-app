'use client';

import { useBusinessContext } from './useBusinessContext';

export interface UserProfile {
  id: string;
  business_id: string;
  role: string;
  full_name: string;
  business_type?: string;
  industry?: string;
}

/**
 * Clean wrapper around the verified Business Context.
 * Resolves the "Synchronizing" loop by ensuring data is never undefined.
 */
export function useUserProfile() {
  // Use the verified context fetcher
  const { data, isLoading, error } = useBusinessContext();
  
  // Normalize the data for your components
  // Handles both single objects and array wrappers
  const profile = Array.isArray(data) ? data[0] : data;

  return {
    data: profile ? {
        id: profile.userId || (profile as any).id,
        business_id: profile.businessId || (profile as any).business_id,
        full_name: (profile as any).full_name || 'Authorized User',
        role: (profile as any).role || 'admin',
        industry: profile.industry
    } : null,
    isLoading,
    isError: !!error,
    error: error || null,
  };
}