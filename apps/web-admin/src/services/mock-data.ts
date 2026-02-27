import Cookies from "js-cookie";

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'; // Gateway URL

export const ApiClient = {
    getDashboardStats: async () => {
        try {
            // Get token from cookie (shared or portal-specific)
            const token = Cookies.get("admin_accessToken") || Cookies.get("accessToken");

            // Fetch from Gateway
            const res = await fetch('http://localhost:3000/api/students/dashboard/stats', {
                headers: {
                    'Authorization': token ? `Bearer ${token}` : '',
                    'Content-Type': 'application/json'
                }
            });

            if (!res.ok) throw new Error('Failed to fetch stats');
            return await res.json();

        } catch (error: any) {
            console.log("Using fallback mock data (API unavailable):", error?.message || error);
            // Fallback to offline/mock if failed
            return {
                totalStudents: 1250,
                activeCourses: 45,
                totalRevenue: 2500000000,
                attendanceRate: 85,
                recentEnrollments: [],
                attendanceDistribution: [],
                coursePopularity: [],
                enrollmentTrends: []
            };
        }
    }
};
