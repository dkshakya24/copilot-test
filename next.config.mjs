/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // Enable static export for micro-frontend
  // Uncomment the line below and run 'next build' to generate static HTML
  // output: 'export',
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  // Optimize images if needed
  images: {
    unoptimized: true, // Required for static export
  },
  // Allow iframe embedding for widget functionality
  async headers() {
    return [
      {
        // Apply headers to embed page only
        source: '/embed',
        headers: [
          {
            key: 'Content-Security-Policy',
            // Explicitly allow all network schemes for frame-ancestors
            // This format works better with Vercel and modern browsers
            value: "frame-ancestors 'self' https: http: data: blob:;",
          },
        ],
      },
      {
        // Also apply to embed page with any path
        source: '/embed/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors 'self' https: http: data: blob:;",
          },
        ],
      },
    ];
  },
};

export default nextConfig;

