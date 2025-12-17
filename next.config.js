/** @type {import('next').NextConfig} */
const nextConfig = {
  // Note: For Capacitor, we'll load from production URL instead of static export
  // This allows API routes and dynamic routes to work properly
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.firebasestorage.app',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.pexels.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  // Disable API routes for static export (they won't work in native app anyway)
  // API calls should point to your deployed server
  trailingSlash: true,
};

module.exports = nextConfig;
