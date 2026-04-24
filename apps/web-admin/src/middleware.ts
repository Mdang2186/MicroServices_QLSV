import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getDashboardPath, isWebAdminRole, normalizeRole } from "@/lib/roles";

export function middleware(request: NextRequest) {
  const token = request.cookies.get("admin_accessToken")?.value;
  const role = normalizeRole(request.cookies.get("admin_role")?.value);
  const { pathname } = request.nextUrl;
  const isPublicAuthPage =
    pathname === "/login" ||
    pathname === "/forgot-password" ||
    pathname === "/reset-password";

  if (pathname.startsWith("/_next") || pathname === "/favicon.ico") {
    return NextResponse.next();
  }

  if (pathname.startsWith("/login")) {
    if (token && isWebAdminRole(role)) {
      return NextResponse.redirect(
        new URL(getDashboardPath(role), request.url),
      );
    }

    return NextResponse.next();
  }

  if (isPublicAuthPage) {
    return NextResponse.next();
  }

  // Chưa đăng nhập -> login
  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Chỉ cho phép: SUPER_ADMIN, ACADEMIC_STAFF, LECTURER vào web-admin
  if (!isWebAdminRole(role)) {
    const url = new URL("/login", request.url);
    url.searchParams.set("error", "unauthorized");
    return NextResponse.redirect(url);
  }

  // Phân quyền chuyên sâu: ngăn chặn User vào nhầm thư mục của Role khác
  if (pathname.startsWith("/admin") && role !== "SUPER_ADMIN") {
    return NextResponse.redirect(new URL(getDashboardPath(role), request.url));
  }
  if (pathname.startsWith("/staff") && role !== "ACADEMIC_STAFF") {
    return NextResponse.redirect(new URL(getDashboardPath(role), request.url));
  }
  if (pathname.startsWith("/lecturer") && role !== "LECTURER") {
    return NextResponse.redirect(new URL(getDashboardPath(role), request.url));
  }

  // Redirect / và trang /dashboard cũ về đúng dashboard mới của từng role
  if (pathname === "/" || pathname === "/dashboard") {
    return NextResponse.redirect(new URL(getDashboardPath(role), request.url));
  }

  // Phân quyền cho Giảng viên (nếu Giảng viên đi vào URL không cho phép trong /lecturer)
  const lecturerAllowedPaths = [
    "/lecturer/dashboard",
    "/lecturer/courses",
    "/lecturer/schedule",
    "/lecturer/attendance",
  ];
  if (role === "LECTURER" && pathname.startsWith("/lecturer")) {
    const isAllowed = lecturerAllowedPaths.some(
      (p) => pathname === p || pathname.startsWith(p + "/"),
    );
    if (!isAllowed) {
      return NextResponse.redirect(new URL("/lecturer/dashboard", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg)$).*)"],
};
