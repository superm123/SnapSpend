
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'export',
  transpilePackages: ['@mui/material', '@mui/system', '@mui/x-date-pickers'], // Add this line
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Enable verbose stats for Webpack in development
    if (dev) {
      config.stats = {
        all: true, // Show all stats
      };
    }
    return config;
  },
};

module.exports = nextConfig;
