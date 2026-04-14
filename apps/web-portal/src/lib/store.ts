import { create } from 'zustand';
import { clearStudentSession } from './student-session';

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
        clearStudentSession();
        set({ user: null })
    },
}));
