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
  // Note: CSP headers are now handled by middleware.ts for better control
  // This ensures headers are set at runtime and can override any defaults
};

export default nextConfig;

