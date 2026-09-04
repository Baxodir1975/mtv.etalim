import { NextRequest, NextResponse } from 'next/server';

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  "script-src 'self' 'unsafe-inline'",
  "connect-src 'self'",
  'upgrade-insecure-requests',
].join('; ');

export function proxy(request: NextRequest) {
  const forwardedProtocol = request.headers.get('x-forwarded-proto');
  const protocol =
    forwardedProtocol || request.nextUrl.protocol.replace(':', '');
  const isLocal =
    request.nextUrl.hostname === 'localhost' ||
    request.nextUrl.hostname === '127.0.0.1';

  if (!isLocal && protocol !== 'https') {
    const secureUrl = request.nextUrl.clone();
    secureUrl.protocol = 'https:';
    return NextResponse.redirect(secureUrl, 308);
  }

  const response = NextResponse.next();
  response.headers.set('Content-Security-Policy', contentSecurityPolicy);
  response.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  response.headers.set('Cross-Origin-Resource-Policy', 'same-origin');
  response.headers.set(
    'Permissions-Policy',
    'camera=(), geolocation=(), microphone=()',
  );
  response.headers.set('Referrer-Policy', 'no-referrer');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  if (!isLocal) {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=63072000; includeSubDomains; preload',
    );
  }
  return response;
}

export const config = {
  matcher: '/:path*',
};
