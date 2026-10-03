import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Enables instrumentation.ts so the node-cron scheduler starts with the server
    instrumentationHook: true,
  },
  webpack: (config) => {
    // Explicit alias so '@/...' imports resolve on Linux CI (Render) too
    config.resolve.alias['@'] = path.resolve(__dirname, 'src');
    return config;
  },
};

export default nextConfig;
