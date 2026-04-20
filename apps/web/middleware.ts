import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Auth is handled client-side in (dashboard)/layout.tsx via localStorage.
// Middleware only handles static redirects.
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Redirect root to dashboard
  if (pathname === '/') {
    return NextResponse.redirect(new URL('/dashboard/overview', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'],
}
