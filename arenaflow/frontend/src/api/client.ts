import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000/api/v1";

const apiClient = axios.create({
    baseURL: BASE_URL,
    timeout: 15000,
    headers: { "Content-Type": "application/json" }
});

apiClient.interceptors.request.use((config) => {
    const token = localStorage.getItem("arenaflow_token");
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    if (import.meta.env.DEV) {
        console.debug("[API]", config.method?.toUpperCase(), config.url);
    }
    return config;
});

apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem("arenaflow_token");
            localStorage.removeItem("arenaflow_venue_id");
            window.location.href = "/dashboard";
        } else if (error.response?.status === 422) {
            console.error("[API] Validation error:", error.response.data.detail);
        } else if (!error.response) {
            console.error("[API] Network error or timeout:", error.message);
        }
        return Promise.reject(error);
    }
);

export default apiClient;
export const getToken = () => localStorage.getItem("arenaflow_token");
export const setToken = (token: string) => localStorage.setItem("arenaflow_token", token);
export const clearToken = () => localStorage.removeItem("arenaflow_token");
