import axios from "axios";

// Read backend URL from Vite environment variables (VITE_API_URL)
const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

// Central axios instance pointing to FastAPI
const api = axios.create({ baseURL: BASE_URL });

// Attach JWT token automatically to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
