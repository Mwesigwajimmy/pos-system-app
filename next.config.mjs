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
  webpack: (config) => {
    config.resolve.alias['@'] = path.resolve(__dirname, 'src');
    return config;
  },
  // other config...
};

const pwaConfig = withPWA({
  // ... your PWA config
});

// Chain the plugins together.
export default withNextIntl(pwaConfig(nextConfig));