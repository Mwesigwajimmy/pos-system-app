// next.config.mjs
// V-REVOLUTION: ENTERPRISE BUILD ENGINE V10.4
// Final Logic Alignment for Next.js 15 + PWA + next-intl
// MOBILE APP WELD: Stabilized via Live Bridge (The Canva Way)

import withPWAInit from "@ducanh2912/next-pwa";
import createNextIntlPlugin from 'next-intl/plugin';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const withNextIntl = createNextIntlPlugin('./i18n.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // NOTE: 'output: export' removed to enable Server-Side logic and AI APIs (The Canva Way)
  
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },

  // --- OMEGA BUILD STABILIZATION ---
  // Re-aligned for Next.js 15: Moved out of experimental
  serverExternalPackages: [
    '@google/generative-ai',
    'zod',
    'vm2',
    'langchain',
    '@langchain/core',
    '@langchain/openai',
    '@langchain/community',
    '@langchain/google-genai'
  ],

  webpack: (config, { isServer }) => {
    if (isServer) {
        config.externals.push({
            'vm2': 'commonjs vm2',
            'coffee-script': 'commonjs coffee-script'
        });
    }

    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      '@': path.resolve(__dirname, 'src'),
      // LANGCHAIN SHIMS REMOVED TO RESTORE CORE FUNCTIONALITY
    };

    return config;
  },
};

// --- PWA INITIALIZATION ---
// GRASSROOT FIX: We define 'withPWA' using the imported 'withPWAInit'
const withPWA = withPWAInit({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
});

// --- THE ULTIMATE WELD ---
// Wrapping the config correctly to resolve the 'not a function' and 'not defined' errors.
export default withNextIntl(withPWA(nextConfig));