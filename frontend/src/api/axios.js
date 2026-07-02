import axios from "axios";

// Read backend URL from Vite environment variables (VITE_API_URL)
const BASE_URL = import.meta.env.VITE_API_URL || "";

const AUTH_EXPIRED_EVENT = "auth:expired";
let handlingAuthExpiry = false;

// Central axios instance pointing to FastAPI
const api = axios.create({ baseURL: BASE_URL });

// Attach JWT token automatically to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401 && !handlingAuthExpiry) {
      handlingAuthExpiry = true;
      window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));

      // Avoid hard loops when already on login/register routes.
      const path = window.location.pathname;
      if (path !== "/login" && path !== "/register") {
        window.location.replace("/login");
      }

      setTimeout(() => {
        handlingAuthExpiry = false;
      }, 500);
    }

    return Promise.reject(error);
  }
);

export default api;
