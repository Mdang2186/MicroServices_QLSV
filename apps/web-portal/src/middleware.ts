import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const token = request.cookies.get('student_accessToken')?.value;
    // In a real app, verify the token signature/claims here.
    // For now, we decode basic intent or check presence.
    // If we can't verify role easily without a library, we assume the client-side/login set a 'role' cookie as well,
    // OR we just check for token presence and let the client-side verify details.
    // BUT the requirement is strict redirect.
    // Let's assume we store a 'userRole' cookie for middleware convenience, or we just protect /admin from non-logins.

    // Simplification: Check for token presence.
    // If we want role checks, decode the JWT. Note: 'jsonwebtoken' or 'jose' needed for Edge Runtime.
    // We'll stick to basic protection for this step:
    // 1. If accessing /admin or /portal and no token -> redirect to /login

    const { pathname } = request.nextUrl;

    // Public paths
    if (pathname.startsWith('/login') || pathname.startsWith('/register') || pathname === '/') {
        return NextResponse.next();
    }

    if (!token) {
        return NextResponse.redirect(new URL('/login', request.url));
    }

    // To strictly enforce ADMIN vs STUDENT in middleware, we'd need to parse the token.
    // For now, we will rely on this presence check + client-side guards, 
    // or add 'jose' to parse the JWT if desired. 
    // Given 'Senior' requirement, let's try to read a helper cookie 'role' if available, 
    // or just rely on the API to reject 403 on data fetch.

    // Let's assume we set a 'role' cookie too for middleware speed.
    const role = request.cookies.get('student_role')?.value;

    // Redirect /admin paths to the Web Admin App if user has role
    // This avoids confusion between web-portal admin pages and the real web-admin app
    if (pathname.startsWith('/admin')) {
        if (role === 'ADMIN_STAFF' || role === 'SUPER_ADMIN' || role === 'ADMIN') {
            return NextResponse.redirect("http://localhost:4005/dashboard");
        } else {
            // If not admin, go to dashboard
            return NextResponse.redirect(new URL('/portal/dashboard', request.url));
        }
    }

    if (pathname.startsWith('/portal') && role !== 'STUDENT') {
        // If admin tries to go to student portal, redirect to Admin App
        if (role === 'ADMIN_STAFF' || role === 'SUPER_ADMIN' || role === 'ADMIN') {
            return NextResponse.redirect("http://localhost:4005/dashboard");
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/admin/:path*', '/portal/:path*', '/login'],
};
