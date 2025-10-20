'use client';

import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

// --- 1. Type Definitions ---

interface BrandingSettings {
  logo_url: string | null;
  primary_color: string | null;
}

interface ThemeVariables {
  '--primary': string;
  '--primary-foreground': string;
}

// --- 2. Utility Functions ---

/**
 * Converts HEX color string to an HSL string for advanced theme color support.
 * @param hex The hex color string (e.g., "#3b82f6" or "#38f").
 * @returns An HSL string for CSS (e.g., "217 91% 60%") or null if the format is invalid.
 */
function hexToHsl(hex: string | null | undefined): string | null {
  if (!hex || !/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)) {
    return null;
  }

  let hexVal = hex.substring(1);

  // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
  if (hexVal.length === 3) {
    hexVal = hexVal.split('').map(char => char + char).join('');
  }

  const r = parseInt(hexVal.substring(0, 2), 16) / 255;
  const g = parseInt(hexVal.substring(2, 4), 16) / 255;
  const b = parseInt(hexVal.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);

  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

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

  const hue = Math.round(h * 360);
  const saturation = Math.round(s * 100);
  const lightness = Math.round(l * 100);

  return `${hue} ${saturation}% ${lightness}%`;
}

// --- 3. Custom Hooks for Logic Encapsulation ---

/**
 * Applies theme variables to the document root.
 * Memoized for performance and automatic cleanup.
 */
const useThemeEffect = (theme: ThemeVariables | null) => {
  useEffect(() => {
    if (!theme) return;

    const root = document.documentElement;
    Object.entries(theme).forEach(([property, value]) => {
      root.style.setProperty(property, value);
    });

    // Cleanup: reset styles if provider unmounts
    return () => {
      Object.keys(theme).forEach(property => {
        root.style.removeProperty(property);
      });
    };
  }, [theme]);
};

/**
 * Fetch branding settings and compute theme variables.
 * Handles data-fetching, transformation, and caching.
 */
const useBranding = () => {
  const supabase = createClient();

  const { data: branding } = useQuery<BrandingSettings | null>({
    queryKey: ['brandingSettings'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_branding_settings').single();
      if (error && error.code !== 'PGRST116') {
        console.error("Failed to fetch branding settings:", error);
        return null;
      }
      // FIX: Assert the type of 'data' to match the expected return type.
      return data as BrandingSettings | null;
    },
    staleTime: 1000 * 60 * 60, // 1 hour
    refetchOnWindowFocus: false,
  });

  // Auto-accessible color contrast for best UX
  const theme = useMemo((): ThemeVariables | null => {
    const primaryHsl = hexToHsl(branding?.primary_color);
    if (!primaryHsl) return null;

    const lightness = parseInt(primaryHsl.split(' ')[2], 10);
    // Determine best foreground text color for accessibility
    const primaryForegroundHsl = lightness > 50 ? '0 0% 10%' : '0 0% 100%';

    return {
      '--primary': primaryHsl,
      '--primary-foreground': primaryForegroundHsl,
    };
  }, [branding]);

  useThemeEffect(theme);
};

// --- 4. The Main Provider Component ---

/**
 * BrandingProvider: Fetches branding settings and injects CSS variables into the root document.
 * Wrap your app with this for live, dynamic, and accessible theme support.
 */
export default function BrandingProvider({ children }: { children: React.ReactNode }) {
  useBranding();
  return <>{children}</>;
}