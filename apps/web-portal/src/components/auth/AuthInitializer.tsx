"use client";

import { useEffect, useRef } from 'react';
import Cookies from 'js-cookie';
import { useAuthStore } from '@/lib/store';

export default function AuthInitializer() {
    const initialized = useRef(false);

    useEffect(() => {
        if (initialized.current) return;
        initialized.current = true;

        const userCookie = Cookies.get('user');
        const tokenCookie = Cookies.get('accessToken');

        if (tokenCookie && userCookie) {
            try {
                const user = JSON.parse(userCookie);
                // Hydrate Store
                useAuthStore.getState().setUser(user);
                console.log("Session hydrated from cookies:", user.email);
            } catch (e) {
                console.error("Failed to parse user cookie", e);
            }
        }
    }, []);

    return null; // This component renders nothing
}
