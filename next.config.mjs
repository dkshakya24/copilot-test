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
};

export default nextConfig;

