import api from "@/lib/api";

export const StudentService = {
    getProfile: async (userId: string) => {
        const response = await api.get(`/api/students/user/${userId}`);
        return response.data;
    },

    // Helper to get current logged in student's profile if ID is not known but stored in token/state
    // However, usually we store user ID in state. 
    // Let's assume we pass the ID.

    getEnrollments: async (studentId: string) => {
        const response = await api.get(`/api/enrollments/student/${studentId}`);
        return response.data;
    },

    getGrades: async (studentId: string) => {
        const response = await api.get(`/api/grades/student/${studentId}`);
        return response.data;
    }
};
