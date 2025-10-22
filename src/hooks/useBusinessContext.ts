'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

// Define the expected return type for your business context data.
// Customize this interface based on what 'get_business_context_data' would return.
export interface BusinessContextData {
  id: string;
  name: string;
  // Add other properties relevant to the overall business context
  // e.g., legal_name: string;
  //       main_currency: string;
  //       subscription_status: string;
}

async function fetchBusinessContextData(): Promise<BusinessContextData | null> {
    const supabase = createClient();
    // Assuming you have a Supabase RPC function that fetches the relevant business context data
    // Replace 'get_business_context_data' with your actual RPC function name,
    // or a direct .from().select() if it's simpler.
    const { data, error } = await supabase.rpc('get_business_context_data'); // <-- Customize this RPC call

    if (error) {
        console.error("Error fetching business context data:", error);
        return null; // Return null on error, similar to useBusinessType
    }
    return data as BusinessContextData;
}

export function useBusinessContext() {
    return useQuery<BusinessContextData | null, Error>({
      queryKey: ['businessContext'],
      queryFn: fetchBusinessContextData,
      staleTime: 1000 * 60 * 15, // Example: Cache this context data for 15 minutes
    });
}