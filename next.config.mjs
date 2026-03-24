// next.config.mjs
// V-REVOLUTION: ENTERPRISE BUILD ENGINE V10.4
// Final Logic Alignment for Next.js 15 + PWA + next-intl

import withPWAInit from "@ducanh2912/next-pwa";
import createNextIntlPlugin from 'next-intl/plugin';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const withNextIntl = createNextIntlPlugin('./i18n.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },

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
      '@langchain/community/chat_models/ollama': path.resolve(__dirname, 'src/lib/langchain/chat-ollama-shim.ts'),
      'langchain/agents': path.resolve(__dirname, 'src/lib/langchain/langchain-agents-shim.ts'),
      '@langchain/core/prompts': path.resolve(__dirname, 'src/lib/langchain/core-prompts-shim.ts'),
      '@langchain/core/tools': path.resolve(__dirname, 'src/lib/langchain/core-tools-shim.ts'),
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