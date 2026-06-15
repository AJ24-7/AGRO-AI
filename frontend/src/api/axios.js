import axios from "axios";

// Central axios instance pointing to FastAPI
const api = axios.create({ baseURL: "http://localhost:8000" });

// Attach JWT token automatically to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
