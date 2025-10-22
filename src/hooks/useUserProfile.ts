// src/hooks/useUserProfile.ts
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

export interface UserProfile {
  id: string;
  business_id: string;
  role: string;
  full_name: string;
  business_type?: string;
}

async function fetchUserProfile(): Promise<UserProfile> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    // This will now cause the query to fail with a clear error
    throw new Error("User not authenticated.");
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, business_id, role, full_name')
    .eq('id', user.id)
    .single();

  if (error || !profile) {
    // This gives us a specific database error in the console
    throw new Error(error?.message || "User profile not found in database.");
  }

  return profile as UserProfile;
}

export function useUserProfile() {
  return useQuery({
    queryKey: ['userProfile'],
    queryFn: fetchUserProfile,
    staleTime: 1000 * 60 * 5,
  });
}