/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['localhost', 'via.placeholder.com'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: '**',
      },
    ],
    dangerouslyAllowSVG: process.env.NODE_ENV === 'development',
    unoptimized: process.env.NODE_ENV === 'development',
  },
  experimental: {
    // Disable experimental features in production
  },
  // Ensure we're not using middleware for now
  skipMiddlewareUrlNormalize: true,
  skipTrailingSlashRedirect: true,
  
  // Production optimizations
  compress: true,
  poweredByHeader: false,
  
  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
    ];
  },
  
  // Environment-specific settings
  env: {
    CUSTOM_KEY: process.env.NODE_ENV === 'production' ? 'production-value' : 'development-value',
  },
};

module.exports = nextConfig; 