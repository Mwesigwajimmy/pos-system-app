'use client';

import React, { createContext, useContext, useEffect, useMemo, ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

// --- 1. ENTERPRISE TYPE DEFINITIONS ---
// This matches the "Neural Identity View" we created in SQL
interface CorporateIdentity {
  business_id: string;
  legal_name: string;
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
  ceo_designation: string | null;
  payment_instructions: string | null;
  physical_address: string | null;
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

// --- 3. THE MASTER PROVIDER ---

export default function BrandingProvider({ children }: { children: ReactNode }) {
  const supabase = createClient();

  // 1. NEURAL FETCH: Get everything from the Verified Identity View
  const { data: branding, isLoading, refetch } = useQuery<CorporateIdentity>({
    queryKey: ['bbu1_corporate_identity'],
    queryFn: async () => {
      // Identity Handshake: Find which business we are serving
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: profile } = await supabase.from('profiles').select('business_id').eq('id', user.id).single();
      
      if (profile?.business_id) {
        const { data, error } = await supabase
            .from('view_bbu1_corporate_identity')
            .select('*')
            .eq('business_id', profile.business_id)
            .single();
        
        if (error) throw error;
        return data as CorporateIdentity;
      }
      return null;
    },
    staleTime: 1000 * 60 * 5, // Refresh every 5 mins (standard enterprise)
  });

  // 2. THE SOVEREIGN WELD: Side-effect to skin the CSS Variables
  useEffect(() => {
    if (!branding) return;

    const root = document.documentElement;
    const primaryHsl = hexToHsl(branding.primary_color);
    
    if (primaryHsl) {
      root.style.setProperty('--primary', primaryHsl);
      root.style.setProperty('--brand-primary', branding.primary_color!); // Used by layout.tsx
      
      // Automatic Contrast Calculation
      const lightness = parseInt(primaryHsl.split(' ')[2], 10);
      root.style.setProperty('--primary-foreground', lightness > 60 ? '222 47% 11%' : '210 40% 98%');
    }
  }, [branding]);

  // Provide the data globally
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

// --- 4. ENTERPRISE HOOK ---
export const useBranding = () => {
  const context = useContext(BrandingContext);
  if (context === undefined) {
    throw new Error('useBranding must be used within a BrandingProvider');
  }
  return context;
};