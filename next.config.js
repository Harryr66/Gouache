/** @type {import('next').NextConfig} */
// Load .env.local manually to ensure variables are available
const fs = require('fs');
const path = require('path');

// Read .env.local file directly
const envLocalPath = path.join(__dirname, '.env.local');
let cloudflareVars = {};

if (fs.existsSync(envLocalPath)) {
  const envContent = fs.readFileSync(envLocalPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && key.startsWith('NEXT_PUBLIC_CLOUDFLARE')) {
        cloudflareVars[key] = valueParts.join('='); // Handle values with = in them
      }
    }
  });
}

console.log('🔍 Cloudflare vars loaded in next.config.js:', {
  accountId: cloudflareVars.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_ID ? 'SET' : 'MISSING',
  streamToken: cloudflareVars.NEXT_PUBLIC_CLOUDFLARE_STREAM_API_TOKEN ? 'SET' : 'MISSING',
  imagesHash: cloudflareVars.NEXT_PUBLIC_CLOUDFLARE_IMAGES_ACCOUNT_HASH ? 'SET' : 'MISSING',
  imagesToken: cloudflareVars.NEXT_PUBLIC_CLOUDFLARE_IMAGES_API_TOKEN ? 'SET' : 'MISSING',
});

const nextConfig = {
  // Note: For Capacitor, we'll load from production URL instead of static export
  // This allows API routes and dynamic routes to work properly
  
  // Increase body size limit for large video uploads
  experimental: {
    serverActions: {
      bodySizeLimit: '100mb',
    },
  },
  
  // Explicitly expose environment variables to client-side
  // Next.js automatically exposes NEXT_PUBLIC_ vars, but we're being explicit here
  env: {
    NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_ID: cloudflareVars.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_ID || process.env.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_ID || '',
    NEXT_PUBLIC_CLOUDFLARE_STREAM_API_TOKEN: cloudflareVars.NEXT_PUBLIC_CLOUDFLARE_STREAM_API_TOKEN || process.env.NEXT_PUBLIC_CLOUDFLARE_STREAM_API_TOKEN || '',
    NEXT_PUBLIC_CLOUDFLARE_IMAGES_ACCOUNT_HASH: cloudflareVars.NEXT_PUBLIC_CLOUDFLARE_IMAGES_ACCOUNT_HASH || process.env.NEXT_PUBLIC_CLOUDFLARE_IMAGES_ACCOUNT_HASH || '',
    NEXT_PUBLIC_CLOUDFLARE_IMAGES_API_TOKEN: cloudflareVars.NEXT_PUBLIC_CLOUDFLARE_IMAGES_API_TOKEN || process.env.NEXT_PUBLIC_CLOUDFLARE_IMAGES_API_TOKEN || '',
  },
  
  // Also use webpack DefinePlugin as a backup
  webpack: (config, { webpack, isServer }) => {
    if (!isServer) {
      // Get the actual values
      const accountId = cloudflareVars.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_ID || process.env.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_ID || '';
      const streamToken = cloudflareVars.NEXT_PUBLIC_CLOUDFLARE_STREAM_API_TOKEN || process.env.NEXT_PUBLIC_CLOUDFLARE_STREAM_API_TOKEN || '';
      const imagesHash = cloudflareVars.NEXT_PUBLIC_CLOUDFLARE_IMAGES_ACCOUNT_HASH || process.env.NEXT_PUBLIC_CLOUDFLARE_IMAGES_ACCOUNT_HASH || '';
      const imagesToken = cloudflareVars.NEXT_PUBLIC_CLOUDFLARE_IMAGES_API_TOKEN || process.env.NEXT_PUBLIC_CLOUDFLARE_IMAGES_API_TOKEN || '';
      
      console.log('🔧 Webpack DefinePlugin - Injecting vars (client-side):', {
        accountId: accountId ? `${accountId.substring(0, 8)}...` : 'EMPTY',
        streamToken: streamToken ? `${streamToken.substring(0, 8)}...` : 'EMPTY',
        imagesHash: imagesHash ? `${imagesHash.substring(0, 8)}...` : 'EMPTY',
        imagesToken: imagesToken ? `${imagesToken.substring(0, 8)}...` : 'EMPTY',
      });
      
      // Only run on client-side builds
      config.plugins.push(
        new webpack.DefinePlugin({
          'process.env.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_ID': JSON.stringify(accountId),
          'process.env.NEXT_PUBLIC_CLOUDFLARE_STREAM_API_TOKEN': JSON.stringify(streamToken),
          'process.env.NEXT_PUBLIC_CLOUDFLARE_IMAGES_ACCOUNT_HASH': JSON.stringify(imagesHash),
          'process.env.NEXT_PUBLIC_CLOUDFLARE_IMAGES_API_TOKEN': JSON.stringify(imagesToken),
        })
      );
    }
    return config;
  },
  
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
      {
        protocol: 'https',
        hostname: 'imagedelivery.net',
        port: '',
        pathname: '/**',
      },
    ],
    // OPTIMIZED: Enable WebP/AVIF formats and better compression
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [240, 320, 480, 640, 750, 828, 1080, 1200], // Include 240px for thumbnails (critical for grid view)
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days cache
    dangerouslyAllowSVG: false,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  // Disable API routes for static export (they won't work in native app anyway)
  // API calls should point to your deployed server
  trailingSlash: true,
};

module.exports = nextConfig;
