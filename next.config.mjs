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
            value: "frame-ancestors *;", // Allows embedding from any origin
          },
        ],
      },
    ];
  },
};

export default nextConfig;

