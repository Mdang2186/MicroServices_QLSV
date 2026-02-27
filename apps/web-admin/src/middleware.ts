import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const token = request.cookies.get('admin_accessToken')?.value;
    const role = request.cookies.get('admin_role')?.value;
    const { pathname } = request.nextUrl;

    // Public paths
    if (pathname.startsWith('/login') || pathname.startsWith('/_next') || pathname === '/favicon.ico') {
        return NextResponse.next();
    }

    if (!token) {
        return NextResponse.redirect(new URL('/login', request.url));
    }

    // Strict Role Check for Admin Portal
    if (role !== 'ADMIN_STAFF' && role !== 'SUPER_ADMIN' && role !== 'ADMIN') {
        // If logged in as student/other but trying to access admin, redirect to login or show error?
        // Better to redirect to login with a clear query param or just login.
        // For MVP, redirect to login.
        const url = new URL('/login', request.url);
        url.searchParams.set('error', 'unauthorized');
        return NextResponse.redirect(url);
    }

    // Additional protection: If accessing root '/', redirect to '/dashboard'
    if (pathname === '/') {
        return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
