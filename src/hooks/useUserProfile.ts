'use client'; // Ensure this file is treated as a client component

import { useBusiness } from '@/context/BusinessContext';

// --- Your Original Type Definition (Preserved) ---
export interface UserProfile {
  id: string;
  business_id: string;
  role: string;
  full_name: string;
  business_type?: string;
}

// This function is no longer needed as the BusinessProvider handles fetching globally.
// We keep it commented out for reference but it will not be used.
/*
async function fetchUserProfile(): Promise<UserProfile> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User not authenticated.");
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, business_id, role, full_name')
    .eq('id', user.id)
    .single();

  if (error || !profile) {
    throw new Error(error?.message || "User profile not found in database.");
  }

  return profile as UserProfile;
}
*/

/**
 * This hook now acts as a clean, performant wrapper around the global `useBusiness` context.
 * It no longer fetches data itself, eliminating race conditions.
 * It provides the globally fetched profile to any component that still uses `useUserProfile`.
 */
export function useUserProfile() {
  const { profile, isLoading, error } = useBusiness();
  
  // The 'useQuery' structure is replaced with direct context consumption.
  // We return an object that has the same shape your components expect.
  return {
    data: profile,
    isLoading,
    isError: !!error,
    error: error ? new Error(error) : null,
  };
}