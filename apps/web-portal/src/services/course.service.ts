import api from "@/lib/api";

export const CourseService = {
    getClassDetails: async (classId: string) => {
        const response = await api.get(`/api/courses/classes/${classId}`);
        return response.data;
    },

    getClassEnrollments: async (classId: string) => {
        const response = await api.get(`/api/enrollments/admin/classes/${classId}/enrollments`);
        return response.data;
    }
};
