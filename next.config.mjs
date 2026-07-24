import withPWAInit from '@ducanh2912/next-pwa';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Bundle optimization
  bundlePagesRouterDependencies: true,
  reactCompiler: true,
  // Keep heavy Node-only libs out of the serverless bundle (Drive sync / indexing).
  serverExternalPackages: [
    "googleapis",
    "firebase-admin",
    "pdf-parse",
    "pdfjs-dist",
    "officeparser",
  ],
  // Ensure runtime CLI + deps are present when the webhook spawns node scripts.
  outputFileTracingIncludes: {
    "/api/webhooks/storage-sync": [
      "./runtime/**/*",
      "./node_modules/googleapis/**/*",
      "./node_modules/google-auth-library/**/*",
      "./node_modules/gaxios/**/*",
      "./node_modules/gcp-metadata/**/*",
      "./node_modules/gtoken/**/*",
      "./node_modules/firebase-admin/**/*",
      "./node_modules/@google-cloud/**/*",
      "./node_modules/pdf-parse/**/*",
      "./node_modules/pdfjs-dist/**/*",
      "./node_modules/officeparser/**/*",
    ],
  },
};

const isDev = process.env.NODE_ENV === 'development';

export default isDev
  ? nextConfig
  : withPWAInit({
      dest: 'public',
      disable: false,
      register: true,
      skipWaiting: true,
      workboxOptions: {
        skipWaiting: true,
      },
      fallback: {
        document: '/~offline',
      },
    })(nextConfig);


