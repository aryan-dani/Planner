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
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },
};

const isDev = process.env.NODE_ENV === 'development';

const config = isDev
  ? nextConfig
  : withPWAInit({
      dest: 'public',
      disable: false,
      register: true,
      skipWaiting: false,
      cacheOnFrontEndNav: false,
      aggressiveFrontEndNavCaching: false,
      // Keep heavy assets out of the install-time precache (fetch on demand).
      publicExcludes: [
        "!pdf.worker.min.mjs",
        "!utility-logo.png",
        "!utility-logo-og.png",
      ],
      workboxOptions: {
        skipWaiting: false,
        navigateFallback: '/~offline',
        navigateFallbackDenylist: [
          /^\/resources/,
          /^\/ask/,
          /^\/admin/,
          /^\/api/,
        ],
        exclude: [/\.map$/, /^manifest.*\.js$/],
        // No runtimeCaching for Drive/PDF — app Cache API owns that (avoids SWR re-downloads).
        runtimeCaching: [],
      },
      fallback: {
        document: '/~offline',
      },
    })(nextConfig);

export default withBundleAnalyzer(config);
