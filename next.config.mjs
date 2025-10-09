import withPWA from 'next-pwa';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // You can add other Next.js configurations here if you need them.
};

// PWA configuration
const pwaConfig = withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development', 
  runtimeCaching: [
    {
      urlPattern: ({ url }) => /\.(?:woff2|js|css|png|jpg|jpeg|svg)$/.test(url.pathname),
      handler: 'CacheFirst',
      options: {
        cacheName: 'static-assets-cache',
        expiration: {
          maxEntries: 150,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 Days
        },
      },
    },
    {
      urlPattern: ({ request }) => request.mode === 'navigate' || request.destination === 'document',
      handler: 'NetworkFirst',
      options: {
        cacheName: 'pages-cache',
        networkTimeoutSeconds: 4, 
        expiration: {
          maxEntries: 60,
          maxAgeSeconds: 24 * 60 * 60, // 1 Day
        },
      },
    },
  ],
});

export default pwaConfig(nextConfig);