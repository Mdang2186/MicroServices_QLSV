import api from "@/lib/api";

export const StudentService = {
    getProfileSummary: async (idOrCode: string) => {
        const response = await api.get(`/api/students/resolve/${encodeURIComponent(idOrCode)}`);
        return response.data;
    },

    getProfile: async (userId: string) => {
        const response = await api.get(`/api/students/user/${encodeURIComponent(userId)}`);
        return response.data;
    },

    getProfileByStudentId: async (studentId: string) => {
        const response = await api.get(`/api/students/${encodeURIComponent(studentId)}`);
        return response.data;
    },

    getLecturerProfile: async (userId: string) => {
        const response = await api.get(`/api/lecturers/user/${userId}`);
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
    },

    getTrainingResults: async (studentId: string) => {
        const response = await api.get(`/api/training-results/student/${studentId}`);
        return response.data;
    },

    getStudentFees: async (studentId: string) => {
        const response = await api.get(`/api/student-fees/student/${studentId}`);
        return response.data;
    },

    getStudentSemesterFees: async (studentId: string, semesterId: string) => {
        const response = await api.get(`/api/student-fees/student/${studentId}/semester/${semesterId}`);
        return response.data;
    },

    getFeeTransactions: async (studentId: string) => {
        const response = await api.get(`/api/student-fees/student/${studentId}/transactions`);
        return response.data;
    },

    getSemesterGPA: async (studentId: string, semesterId: string) => {
        const response = await api.get(`/api/grades/student/${studentId}/gpa/${semesterId}`);
        return response.data;
    },

    getCPA: async (studentId: string) => {
        const response = await api.get(`/api/grades/student/${studentId}/cpa`);
        return response.data;
    },

    getCurriculumProgress: async (studentId: string) => {
        const response = await api.get(`/api/students/${studentId}/curriculum-progress`);
        return response.data;
    },

    getSemesters: async () => {
        const response = await api.get("/api/semesters");
        return response.data;
    },

    getCohorts: async () => {
        const response = await api.get("/api/cohorts");
        return response.data;
    },

    getCohortSemesters: async (cohortCode: string) => {
        const response = await api.get(`/api/cohorts/${encodeURIComponent(cohortCode)}/semesters`);
        return response.data;
    },

    getAdminClasses: async (majorId?: string, cohort?: string) => {
        const query = new URLSearchParams();
        if (majorId) query.set("majorId", majorId);
        if (cohort) query.set("cohort", cohort);

        const response = await api.get(
            `/api/admin-classes${query.toString() ? `?${query.toString()}` : ""}`,
        );
        return response.data;
    },

    getAdminClassTrainingResults: async (adminClassId: string) => {
        const response = await api.get(`/api/training-results/admin-class/${adminClassId}`);
        return response.data;
    },
};
