'use client';

/**
 * --- BBU1 SOVEREIGN BRANDING PROVIDER ---
 * VERSION: v18.1 OMEGA-ULTIMATUM (THE HANDSHAKE WELD)
 * 
 * CORE FIXES:
 * 1. HANDSHAKE AWARENESS: Now consumes 'useBusiness'. It will NOT fetch 
 *    branding until the Aura Handshake is 100% 'is_ready'.
 * 2. 429 REDUCTION: By disabling the query until the identity is verified, 
 *    we eliminate the "Double Hammer" effect on Supabase Auth/RPCs.
 * 3. IDENTITY LOCK: Uses the verified business_id from context rather than 
 *    relying solely on the raw (and sometimes latent) cookie.
 */

import React, { createContext, useContext, useEffect, useMemo, ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useBusiness } from '@/context/BusinessContext'; // ✅ THE IDENTITY ANCHOR

interface CorporateIdentity {
  business_id: string;
  company_name_display: string;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  tin_number: string | null;
  plot_number: string | null;
  po_box: string | null;
  official_email: string | null;
  official_phone: string | null;
  currency_code: string | null;
  receipt_footer: string | null;
  ceo_name: string | null;
  ceo_role: string | null;
  payment_instructions: string | null;
}

interface BrandingContextType {
  branding: CorporateIdentity | null;
  isLoading: boolean;
  refreshBranding: () => void;
}

const BrandingContext = createContext<BrandingContextType | undefined>(undefined);

// (hexToHsl function remains the same as your original)
function hexToHsl(hex: string | null | undefined): string | null {
  if (!hex || !/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)) return null;
  let hexVal = hex.substring(1);
  if (hexVal.length === 3) hexVal = hexVal.split('').map(char => char + char).join('');
  const r = parseInt(hexVal.substring(0, 2), 16) / 255;
  const g = parseInt(hexVal.substring(2, 4), 16) / 255;
  const b = parseInt(hexVal.substring(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

export default function BrandingProvider({ children }: { children: ReactNode }) {
  const supabase = createClient();
  
  // ✅ CONSUME THE MASTER IDENTITY
  const { profile } = useBusiness();
  const activeBizId = profile?.business_id;
  const isHandshakeComplete = profile?.is_ready === true;

  const { data: branding, isLoading, refetch } = useQuery<CorporateIdentity>({
    queryKey: ['bbu1_corporate_identity', activeBizId],
    queryFn: async () => {
      // Pass the verified business_id to the RPC to ensure perfect RLS alignment
      const { data, error } = await supabase.rpc('get_branding_settings', {
          p_biz_id: activeBizId 
      }).single();
      
      if (error) {
          console.warn("[LITONU] Branding restricted:", error.message);
          return null;
      }

      return {
          ...data,
          business_id: activeBizId
      } as CorporateIdentity;
    },
    // 🛡️ THE CRITICAL GUARD: Disable this query until the Handshake says "GO"
    enabled: !!activeBizId && isHandshakeComplete,
    staleTime: 1000 * 60 * 15, // Increase cache to 15 mins to save requests
    refetchOnWindowFocus: false,
  });

  // Apply Branding to CSS Variables
  useEffect(() => {
    if (!branding) return;
    const root = document.documentElement;
    const primaryHsl = hexToHsl(branding.primary_color);
    if (primaryHsl) {
      root.style.setProperty('--primary', primaryHsl);
      root.style.setProperty('--brand-primary', branding.primary_color!); 
      const lightness = parseInt(primaryHsl.split(' ')[2], 10);
      root.style.setProperty('--primary-foreground', lightness > 60 ? '222 47% 11%' : '210 40% 98%');
    }
  }, [branding]);

  const value = useMemo(() => ({
    branding: branding || null,
    isLoading: isLoading && isHandshakeComplete, // Only report loading if we're actually fetching
    refreshBranding: refetch
  }), [branding, isLoading, isHandshakeComplete, refetch]);

  return (
    <BrandingContext.Provider value={value}>
      {children}
    </BrandingContext.Provider>
  );
}

export const useBranding = () => {
  const context = useContext(BrandingContext);
  if (context === undefined) throw new Error('Sovereignty Fault.');
  return context;
};