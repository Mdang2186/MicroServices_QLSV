import { create } from 'zustand';
import Cookies from 'js-cookie';

interface User {
    id: string;
    email: string;
    role: 'ADMIN' | 'STUDENT';
    name?: string;
}

interface AuthState {
    user: User | null;
    setUser: (user: User | null) => void;
    logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    setUser: (user) => set({ user }),
    logout: () => {
        if (typeof window !== 'undefined') {
            Cookies.remove("student_accessToken");
            Cookies.remove("student_role");
            Cookies.remove("student_user");
            localStorage.removeItem("student_accessToken");
            localStorage.removeItem("student_user");
        }
        set({ user: null })
    },
}));
