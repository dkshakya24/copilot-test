import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Only apply to embed routes
  if (request.nextUrl.pathname.startsWith('/embed')) {
    const response = NextResponse.next();
    
    // Override any existing CSP with our permissive frame-ancestors
    // This ensures iframe embedding works from any origin
    response.headers.set(
      'Content-Security-Policy',
      'frame-ancestors *'
    );
    
    // Explicitly remove X-Frame-Options to avoid conflicts
    response.headers.delete('X-Frame-Options');
    
    return response;
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: '/embed/:path*',
};

