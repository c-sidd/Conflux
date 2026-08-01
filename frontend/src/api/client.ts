import axios from "axios";

export const API_BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Attach Authorization Bearer token to outgoing requests (except public auth endpoints)
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("conflux_access_token");
  const isAuthEndpoint = config.url?.includes("/auth/login") ||
                         config.url?.includes("/auth/register") ||
                         config.url?.includes("/auth/forgot-password") ||
                         config.url?.includes("/auth/reset-password") ||
                         config.url?.includes("/auth/verify-email");

  if (token && config.headers && !isAuthEndpoint) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => Promise.reject(error));

// Unified response error extractor
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const errorMsg =
      error.response?.data?.message ||
      error.response?.data?.detail ||
      error.response?.data?.error ||
      "An unexpected error occurred.";
    
    // If 401 Unauthorized, clear stale tokens
    if (error.response?.status === 401) {
      localStorage.removeItem("conflux_access_token");
      localStorage.removeItem("conflux_refresh_token");
      localStorage.removeItem("conflux_user");
    }

    return Promise.reject(new Error(errorMsg));
  }
);
