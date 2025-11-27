
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'export',
  transpilePackages: ['@mui/material', '@mui/system', '@mui/x-date-pickers'], // Add this line
  
};

export default nextConfig;
