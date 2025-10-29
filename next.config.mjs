// next.config.mjs

import withPWA from 'next-pwa';
import createNextIntlPlugin from 'next-intl/plugin';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// THE FIX: Point to the i18n.ts file in the root directory.
const withNextIntl = createNextIntlPlugin('./i18n.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => { // FIX: Destructure isServer here

    // FIX 1: Add the externals configuration for vm2 to prevent the coffee-script error
    if (isServer) {
        config.externals.push({
            'vm2': 'commonjs vm2',
            'coffee-script': 'commonjs coffee-script' // Added explicit coffee-script external for safety
        });
    }

    // preserve existing aliases and add project aliases + shims for langchain subpaths
    config.resolve.alias = {
      ...(config.resolve.alias || {}),

      // your project alias
      '@': path.resolve(__dirname, 'src'),

      // FIX 2: Vercel AI SDK import fix.
      // Use the actual package path for the new SDK, which Next.js should resolve correctly.
      // We explicitly remove the old, problematic 'ai/react' alias.
      // 'ai/react': path.resolve(__dirname, 'node_modules/ai/dist/index.mjs'), // REMOVED

      // Ollama shim (you already created src/lib/langchain/chat-ollama-shim.ts)
      '@langchain/community/chat_models/ollama': path.resolve(__dirname, 'src/lib/langchain/chat-ollama-shim.ts'),

      // Map missing langchain subpath imports to the local shims you added
      'langchain/agents': path.resolve(__dirname, 'src/lib/langchain/langchain-agents-shim.ts'),
      '@langchain/core/prompts': path.resolve(__dirname, 'src/lib/langchain/core-prompts-shim.ts'),
      '@langchain/core/tools': path.resolve(__dirname, 'src/lib/langchain/core-tools-shim.ts'),
    };

    return config;
  },
  // other config...
};

const pwaConfig = withPWA({
  // ... your PWA config
});

// Chain the plugins together.
export default withNextIntl(pwaConfig(nextConfig));