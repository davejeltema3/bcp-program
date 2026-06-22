import { NextRequest, NextResponse } from 'next/server';

/**
 * Serve the combined application at apply.boundlesscreator.com.
 *
 * The subdomain is pointed at this Vercel project (Phase 4). We rewrite its
 * root to the /apply page so the application lives at apply.boundlesscreator.com
 * with a clean host — no visible /apply path, no redirect bounce. Every other
 * host (bcp.boundlesscreator.com) and path is untouched.
 */
export function middleware(req: NextRequest) {
  const host = (req.headers.get('host') || '').toLowerCase();
  if (host === 'apply.boundlesscreator.com' && req.nextUrl.pathname === '/') {
    const url = req.nextUrl.clone();
    url.pathname = '/apply';
    return NextResponse.rewrite(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/'],
};
