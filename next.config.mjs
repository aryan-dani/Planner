import withPWAInit from '@ducanh2912/next-pwa';
import bundleAnalyzer from '@next/bundle-analyzer';

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  bundlePagesRouterDependencies: true,
  experimental: {
    // lucide-react is already optimized by default
    optimizePackageImports: ["framer-motion"],
  },
  // Keep heavy Node-only libs out of the serverless bundle where possible.
  serverExternalPackages: [
    "googleapis",
    "firebase-admin",
    "pdf-parse",
    "pdfjs-dist",
    "officeparser",
  ],
};

const isDev = process.env.NODE_ENV === 'development';

const config = isDev
  ? nextConfig
  : withPWAInit({
      dest: 'public',
      disable: false,
      register: true,
      skipWaiting: true,
      cacheOnFrontEndNav: false,
      aggressiveFrontEndNavCaching: false,
      workboxOptions: {
        skipWaiting: true,
        navigateFallbackDenylist: [
          /^\/resources/,
          /^\/ask/,
          /^\/admin/,
          /^\/api/,
        ],
        runtimeCaching: [
          {
            urlPattern: ({ url }) =>
              url.pathname.startsWith("/api/resources/preview"),
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "utility-pdf-preview",
              expiration: {
                maxEntries: 48,
                maxAgeSeconds: 7 * 24 * 60 * 60,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
      fallback: {
        document: '/~offline',
      },
    })(nextConfig);

export default withBundleAnalyzer(config);
