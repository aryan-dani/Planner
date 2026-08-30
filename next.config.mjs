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
      workboxOptions: {
        skipWaiting: true,
      },
      fallback: {
        document: '/~offline',
      },
    })(nextConfig);

export default withBundleAnalyzer(config);
