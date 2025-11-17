import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Only apply to embed routes
  if (request.nextUrl.pathname.startsWith('/embed')) {
    const response = NextResponse.next();
    
    // Set CSP with explicit scheme matching as the error message suggests
    // This format explicitly allows https: and http: schemes
    response.headers.set(
      'Content-Security-Policy',
      "frame-ancestors https: http:"
    );
    
    // Explicitly remove X-Frame-Options to avoid conflicts
    response.headers.delete('X-Frame-Options');
    
    // Debug header to verify middleware is running
    response.headers.set('X-Copilot-Embed', 'enabled');
    
    return response;
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: '/embed/:path*',
};

