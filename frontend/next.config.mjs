/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Disable webpack persistent filesystem cache in development on Windows.
  // This completely eliminates "Cannot find module './<chunk>.js'" caused by stale chunk manifests on disk.
  webpack: (config, { dev }) => {
    if (dev) {
      config.cache = false;
    }
    return config;
  },
  onDemandEntries: {
    maxInactiveAge: 120 * 1000,
    pagesBufferLength: 5,
  },
};

export default nextConfig;
