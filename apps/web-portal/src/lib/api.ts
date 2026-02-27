import axios from "axios";
import Cookies from "js-cookie";

const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000",
    headers: {
        "Content-Type": "application/json",
    },
});

// Request Interceptor: Attach Token from Cookies (Helper) or LocalStorage (Legacy)
api.interceptors.request.use(
    (config) => {
        // Priority: Cookie > LocalStorage
        const token = Cookies.get("student_accessToken") || (typeof window !== "undefined" ? localStorage.getItem("student_accessToken") : null);

        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response Interceptor: Handle 401
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            if (typeof window !== "undefined") {
                Cookies.remove("student_accessToken");
                Cookies.remove("student_role");
                Cookies.remove("student_user");
                localStorage.removeItem("student_accessToken");
                localStorage.removeItem("student_user");
                window.location.href = "/login";
            }
        }
        return Promise.reject(error);
    }
);

export default api;
export { api }; // Named export for flexibility
