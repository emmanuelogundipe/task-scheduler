/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Enables instrumentation.ts so the node-cron scheduler starts with the server
    instrumentationHook: true,
  },
};

export default nextConfig;
