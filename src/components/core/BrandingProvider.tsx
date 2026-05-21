'use client';

/**
 * --- BBU1 SOVEREIGN BRANDING PROVIDER ---
 * VERSION: v18.0 OMEGA-ULTIMATUM (THE IDENTITY ALIGNMENT)
 * JURISDICTION: Global Dashboard / Multi-Tenant / Visual Identity
 * 
 * CORE FIXES:
 * 1. RLS RESILIENCE: Switched from direct View querying (blocked by RLS) 
 *    to the 'get_branding_settings' RPC. This ensures branding loads 
 *    even when standard SELECT visibility is 0.
 * 2. IDENTITY SYNC: Aligned with the 'bbu1_active_business_id' cookie 
 *    to ensure the visual theme matches the active business node.
 * 3. THEME ENGINE: Preserved the HSL CSS variable injection for 
 *    Tailwind compatibility.
 */

import React, { createContext, useContext, useEffect, useMemo, ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import Cookies from 'js-cookie'; 

// --- 1. ENTERPRISE TYPE DEFINITIONS ---
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

// --- 2. THE SOVEREIGN THEME ENGINE (Tailwind Compatibility) ---
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
  const activeBizId = Cookies.get('bbu1_active_business_id');

  // 2. NEURAL FETCH: Switched to RLS-Resilient RPC
  const { data: branding, isLoading, refetch } = useQuery<CorporateIdentity>({
    queryKey: ['bbu1_corporate_identity', activeBizId],
    queryFn: async () => {
      // 🛡️ DEEP WELD: Instead of querying a view (subject to RLS), 
      // we use the SECURITY DEFINER RPC to ensure the branding is 
      // fetched even during the "Invisibility" phase of login.
      const { data, error } = await supabase.rpc('get_branding_settings').single();
      
      if (error) {
          console.warn("LITONU SECURITY: Branding node empty or restricted via RPC.", error.message);
          return null;
      }

      // Map the RPC return to the CorporateIdentity interface
      return {
          ...data,
          business_id: activeBizId // Link the active node ID
      } as CorporateIdentity;
    },
    staleTime: 1000 * 60 * 5, 
    refetchOnWindowFocus: false,
  });

  // 3. THE SOVEREIGN WELD: Apply Branding to CSS Variables
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
    isLoading,
    refreshBranding: refetch
  }), [branding, isLoading, refetch]);

  return (
    <BrandingContext.Provider value={value}>
      {children}
    </BrandingContext.Provider>
  );
}

export const useBranding = () => {
  const context = useContext(BrandingContext);
  if (context === undefined) {
    throw new Error('Sovereignty Fault: useBranding must be used within a BrandingProvider');
  }
  return context;
};