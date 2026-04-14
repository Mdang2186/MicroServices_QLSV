"use client";

import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/lib/store';
import { readStudentSessionUser } from '@/lib/student-session';

export default function AuthInitializer() {
    const initialized = useRef(false);

    useEffect(() => {
        if (initialized.current) return;
        initialized.current = true;

        const user = readStudentSessionUser();

        if (user) {
            useAuthStore.getState().setUser(user as any);
            console.log("Session hydrated from student session:", user.email || user.username);
        }
    }, []);

    return null; // This component renders nothing
}
