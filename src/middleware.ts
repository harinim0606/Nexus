import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyTokenEdge } from '@/lib/jwt-edge';
import { isCoordinatorRole, isParticipantRole } from '@/lib/roles';

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const token = request.cookies.get('token')?.value;
  const user = token ? await verifyTokenEdge(token) : null;

  if (path.startsWith('/dashboard') && !user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (path.startsWith('/event-management') && !user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (path === '/dashboard' && user?.role === 'ADMIN') {
    return NextResponse.redirect(new URL('/event-management', request.url));
  }

  if (path.startsWith('/event-management') && user && user.role !== 'ADMIN') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  if (user) {
    if (path.startsWith('/dashboard/student')) {
      if (user.role === 'ADMIN') {
        return NextResponse.redirect(new URL('/event-management', request.url));
      }
      if (isCoordinatorRole(user.role)) {
        return NextResponse.redirect(new URL('/dashboard/coordinator', request.url));
      }
    }

    if (path.startsWith('/dashboard/coordinator')) {
      if (user.role === 'ADMIN') {
        return NextResponse.redirect(new URL('/event-management', request.url));
      }
      if (isParticipantRole(user.role)) {
        return NextResponse.redirect(new URL('/dashboard/student', request.url));
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard',
    '/dashboard/:path*',
    '/event-management',
    '/event-management/:path*',
  ],
};
