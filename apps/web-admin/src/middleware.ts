import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const token = request.cookies.get('admin_accessToken')?.value;
    const role = request.cookies.get('admin_role')?.value;
    const { pathname } = request.nextUrl;

    // Cho qua các public paths
    if (pathname.startsWith('/login') || pathname.startsWith('/_next') || pathname === '/favicon.ico') {
        return NextResponse.next();
    }

    // Chưa đăng nhập -> login
    if (!token) {
        return NextResponse.redirect(new URL('/login', request.url));
    }

    // Chỉ cho phép: SUPER_ADMIN, ACADEMIC_STAFF, LECTURER vào web-admin
    const allowedRoles = ['SUPER_ADMIN', 'ACADEMIC_STAFF', 'LECTURER'];
    if (!role || !allowedRoles.includes(role)) {
        const url = new URL('/login', request.url);
        url.searchParams.set('error', 'unauthorized');
        return NextResponse.redirect(url);
    }

    // Phân quyền chuyên sâu: ngăn chặn User vào nhầm thư mục của Role khác
    if (pathname.startsWith('/admin') && role !== 'SUPER_ADMIN') {
        return NextResponse.redirect(new URL(getDashboardPath(role), request.url));
    }
    if (pathname.startsWith('/staff') && role !== 'ACADEMIC_STAFF') {
        return NextResponse.redirect(new URL(getDashboardPath(role), request.url));
    }
    if (pathname.startsWith('/lecturer') && role !== 'LECTURER') {
        return NextResponse.redirect(new URL(getDashboardPath(role), request.url));
    }

    // Redirect / và trang /dashboard cũ về đúng dashboard mới của từng role
    if (pathname === '/' || pathname === '/dashboard') {
        return NextResponse.redirect(new URL(getDashboardPath(role), request.url));
    }

    // Phân quyền cho Giảng viên (nếu Giảng viên đi vào URL không cho phép trong /lecturer)
    const lecturerAllowedPaths = ['/lecturer/dashboard', '/lecturer/courses', '/lecturer/grades', '/lecturer/schedule', '/lecturer/attendance'];
    if (role === 'LECTURER' && pathname.startsWith('/lecturer')) {
        const isAllowed = lecturerAllowedPaths.some(p => pathname === p || pathname.startsWith(p + '/'));
        if (!isAllowed) {
            return NextResponse.redirect(new URL('/lecturer/dashboard', request.url));
        }
    }

    return NextResponse.next();
}

function getDashboardPath(role: string) {
    switch (role) {
        case 'SUPER_ADMIN': return '/admin/dashboard';
        case 'ACADEMIC_STAFF': return '/staff/dashboard';
        case 'LECTURER': return '/lecturer/dashboard';
        default: return '/login';
    }
}

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
