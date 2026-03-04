'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

export interface BusinessContextData {
  userId: string;
  businessId: string;
  businessName: string;
  industry: string;
  country?: string;
}

async function fetchBusinessContextData(): Promise<BusinessContextData | null> {
    const supabase = createClient();
    
    // --- FORENSIC FIX: Swapping to the verified RPC found in the audit ---
    // 'get_aura_handshake' was confirmed in your DB audit to return 
    // the user_id, business_id, and industry.
    const { data, error } = await supabase.rpc('get_aura_handshake'); 

    if (error) {
        console.error("Neural Link Handshake Error:", error);
        // Fallback: If RPC fails, try a direct table fetch to bypass RPC naming
        const { data: profile } = await supabase
            .from('profiles')
            .select('id, business_id, business_name, industry')
            .single();
            
        if (profile) return {
            userId: profile.id,
            businessId: profile.business_id,
            businessName: profile.business_name,
            industry: profile.industry
        };

        return null;
    }
    return data as BusinessContextData;
}

export function useBusinessContext() {
    return useQuery<BusinessContextData | null, Error>({
      queryKey: ['businessContext'],
      queryFn: fetchBusinessContextData,
      staleTime: 1000 * 60 * 15, // Cache for 15 minutes
    });
}