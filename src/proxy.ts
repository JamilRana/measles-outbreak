import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const method = request.method;

  // 1. CSRF Protection for state-changing API mutations
  if (pathname.startsWith('/api/') && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
    // Exempt cron endpoint
    if (!pathname.startsWith('/api/admin/cron/')) {
      const origin = request.headers.get('origin');
      const host = request.headers.get('host');
      const fetchSite = request.headers.get('sec-fetch-site');

      // Block cross-site mutations
      if (fetchSite === 'cross-site') {
        return new NextResponse(JSON.stringify({ error: 'Forbidden: Cross-site request rejected (CSRF)' }), {
          status: 403,
          headers: { 'content-type': 'application/json' },
        });
      }

      if (origin) {
        try {
          const originHost = new URL(origin).host;
          if (originHost !== host && !originHost.endsWith('.dghs.gov.bd') && !originHost.includes('localhost')) {
            return new NextResponse(JSON.stringify({ error: 'Forbidden: Invalid origin (CSRF)' }), {
              status: 403,
              headers: { 'content-type': 'application/json' },
            });
          }
        } catch {
          return new NextResponse(JSON.stringify({ error: 'Forbidden: Malformed origin' }), {
            status: 403,
            headers: { 'content-type': 'application/json' },
          });
        }
      }
    }
  }

  // 2. Protect Admin Web Pages
  if (pathname.startsWith('/admin')) {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
      cookieName: request.cookies.get('__Secure-next-auth.session-token')
        ? '__Secure-next-auth.session-token'
        : request.cookies.get('next-auth.session-token')
        ? 'next-auth.session-token'
        : request.cookies.get('__Secure-next-auth.session-token.v2')
        ? '__Secure-next-auth.session-token.v2'
        : 'next-auth.session-token.v2',
    });

    if (!token || !token.id) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (token.role !== 'ADMIN' && token.role !== 'EDITOR') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|public).*)'],
};
