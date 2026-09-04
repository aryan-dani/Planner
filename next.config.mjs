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
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://va.vercel-scripts.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://*.firebase.com https://firestore.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://drive.usercontent.google.com https://vitals.vercel-insights.com https://*.google.com wss://*.firebaseio.com",
      "frame-src https://drive.google.com https://*.google.com https://view.officeapps.live.com",
      "worker-src 'self' blob:",
      "object-src 'none'",
      "base-uri 'self'",
    ].join("; ");

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
          {
            key: "Content-Security-Policy-Report-Only",
            value: csp,
          },
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin-allow-popups",
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
      // Activate updated SW immediately so clients are not stuck on a broken waiting worker.
      skipWaiting: true,
      cacheOnFrontEndNav: false,
      aggressiveFrontEndNavCaching: false,
      // Keep heavy assets out of the install-time precache (fetch on demand).
      publicExcludes: [
        "!pdf.worker.min.mjs",
        "!utility-logo.png",
        "!utility-logo-og.png",
      ],
      // Offline document only via NetworkFirst handlerDidError — never App Shell navigateFallback
      // (that serves /~offline for every navigation and causes React hydration #418).
      fallbacks: {
        document: '/~offline',
      },
      // Keep default Workbox page/asset caching, but do not CacheFirst/NetworkFirst third-party
      // origins (Drive PDFs must stay on the app Cache API, not Workbox).
      extendDefaultRuntimeCaching: true,
      workboxOptions: {
        skipWaiting: true,
        clientsClaim: true,
        exclude: [/\.map$/, /^manifest.*\.js$/],
        runtimeCaching: [
          {
            urlPattern: ({ sameOrigin }) => !sameOrigin,
            handler: 'NetworkOnly',
            options: {
              cacheName: 'cross-origin',
            },
          },
        ],
      },
    })(nextConfig);

export default withBundleAnalyzer(config);
