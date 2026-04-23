"use client";

import Cookies from "js-cookie";

export interface StudentSessionUser {
    id?: string;
    profileId?: string;
    role?: string;
    username?: string;
    email?: string;
    fullName?: string;
    studentCode?: string;
    student?: {
        id?: string;
        fullName?: string;
        studentCode?: string;
    };
}

const STUDENT_TOKEN_KEY = "student_accessToken";
const STUDENT_ROLE_KEY = "student_role";
const STUDENT_USER_KEY = "student_user";
const LEGACY_TOKEN_KEY = "accessToken";
const LEGACY_USER_KEY = "user";

function safeParseUser(value?: string | null): StudentSessionUser | null {
    if (!value) return null;
    try {
        return JSON.parse(value) as StudentSessionUser;
    } catch {
        return null;
    }
}

export function readStudentSessionUser(): StudentSessionUser | null {
    if (typeof window === "undefined") return null;

    return (
        safeParseUser(Cookies.get(STUDENT_USER_KEY)) ||
        safeParseUser(localStorage.getItem(STUDENT_USER_KEY)) ||
        safeParseUser(Cookies.get(LEGACY_USER_KEY)) ||
        safeParseUser(localStorage.getItem(LEGACY_USER_KEY))
    );
}

export function getStudentUserId(user: StudentSessionUser | null): string | null {
    return user?.id || null;
}

export function getStudentProfileId(user: StudentSessionUser | null): string | null {
    return user?.profileId || user?.student?.id || null;
}

export function getStudentDisplayName(user: StudentSessionUser | null): string {
    return user?.student?.fullName || user?.fullName || user?.username || "Sinh viên";
}

export function getStudentDisplayCode(user: StudentSessionUser | null): string {
    return user?.studentCode || user?.student?.studentCode || "MSSV";
}

export function persistStudentSession(accessToken: string, user: StudentSessionUser) {
    Cookies.set(STUDENT_TOKEN_KEY, accessToken, { expires: 1, path: "/" });
    Cookies.set(STUDENT_ROLE_KEY, user.role || "STUDENT", { expires: 1, path: "/" });
    Cookies.set(STUDENT_USER_KEY, JSON.stringify(user), { expires: 1, path: "/" });

    if (typeof window !== "undefined") {
        localStorage.setItem(STUDENT_TOKEN_KEY, accessToken);
        localStorage.setItem(STUDENT_USER_KEY, JSON.stringify(user));
        localStorage.setItem(LEGACY_TOKEN_KEY, accessToken);
        localStorage.setItem(LEGACY_USER_KEY, JSON.stringify(user));
    }
}

export function readStudentAccessToken(): string | null {
    if (typeof window === "undefined") return null;

    return (
        Cookies.get(STUDENT_TOKEN_KEY) ||
        localStorage.getItem(STUDENT_TOKEN_KEY) ||
        Cookies.get(LEGACY_TOKEN_KEY) ||
        localStorage.getItem(LEGACY_TOKEN_KEY)
    );
}

export function updateStudentSessionUser(patch: Partial<StudentSessionUser>) {
    const currentUser = readStudentSessionUser();
    const accessToken = readStudentAccessToken();

    if (!currentUser || !accessToken) {
        return;
    }

    persistStudentSession(accessToken, {
        ...currentUser,
        ...patch,
    });
}

export function clearStudentSession() {
    Cookies.remove(STUDENT_TOKEN_KEY);
    Cookies.remove(STUDENT_ROLE_KEY);
    Cookies.remove(STUDENT_USER_KEY);
    Cookies.remove(LEGACY_TOKEN_KEY);
    Cookies.remove(LEGACY_USER_KEY);

    if (typeof window !== "undefined") {
        localStorage.removeItem(STUDENT_TOKEN_KEY);
        localStorage.removeItem(STUDENT_USER_KEY);
        localStorage.removeItem(LEGACY_TOKEN_KEY);
        localStorage.removeItem(LEGACY_USER_KEY);
    }
}
