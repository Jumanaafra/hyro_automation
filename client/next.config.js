const rawApiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
const derivedSocketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || rawApiUrl.replace(/\/api\/?$/, '');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,

  // Required for Vercel deployment: provide fallback values at build time
  env: {
    NEXT_PUBLIC_API_URL: rawApiUrl,
    NEXT_PUBLIC_SOCKET_URL: derivedSocketUrl
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
