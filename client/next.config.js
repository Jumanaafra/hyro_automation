/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,

  // Required for Vercel deployment: allow any NEXT_PUBLIC_API_URL to be set at build time
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api',
    NEXT_PUBLIC_SOCKET_URL: process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000'
  },

  // Ignore ESLint errors during build (existing code may have warnings)
  eslint: {
    ignoreDuringBuilds: true
  },

  // Ignore TypeScript errors during build (project is JSX-only)
  typescript: {
    ignoreBuildErrors: true
  }
};

module.exports = nextConfig;
