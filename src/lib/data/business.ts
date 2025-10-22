import { SupabaseClient, User } from '@supabase/supabase-js';
import { UserProfile } from '@/hooks/useUserProfile'; // Import the type from where it's defined

/**
 * Fetches the combined UserProfile and Business Type data for a given user.
 * @param supabase The Supabase client instance.
 * @param user The authenticated Supabase User object.
 * @returns A promise that resolves to the combined UserProfile.
 */
export async function fetchUserBusinessContext(supabase: SupabaseClient, user: User): Promise<UserProfile> {
    const { data: profileData, error } = await supabase
        .from('profiles')
        .select(`
          id,
          business_id,
          role,
          full_name,
          businesses ( type )
        `)
        .eq('id', user.id)
        .single();

    if (error || !profileData) {
        console.error("Failed to fetch user profile:", error);
        // Throw an error to be handled by the caller
        throw new Error(error?.message || "Profile data not found.");
    }

    // Match to UserProfile interface
    const fullProfile: UserProfile = {
        id: profileData.id,
        business_id: profileData.business_id,
        role: profileData.role,
        full_name: profileData.full_name,
        // CORRECTED LINE: Access the first element of the 'businesses' array before getting 'type'
        business_type: profileData.businesses?.[0]?.type ?? '',
    };

    return fullProfile;
}