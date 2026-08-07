import withPWAInit from '@ducanh2912/next-pwa';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Bundle optimization
  bundlePagesRouterDependencies: true,
  reactCompiler: true,
  optimizePackageImports: ["lucide-react", "framer-motion"],
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


