import { createContext, useContext, useEffect, useState } from "react";
import api from "../api/axios";

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [authReady, setAuthReady] = useState(false);
  const [user, setUser] = useState(
    JSON.parse(localStorage.getItem("user") || "null")
  );

  const clearAuthState = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  };

  useEffect(() => {
    const onAuthExpired = () => {
      clearAuthState();
    };

    window.addEventListener("auth:expired", onAuthExpired);
    return () => window.removeEventListener("auth:expired", onAuthExpired);
  }, []);

  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem("token");
      const cachedUser = JSON.parse(localStorage.getItem("user") || "null");

      if (!token || !cachedUser) {
        clearAuthState();
        setAuthReady(true);
        return;
      }

      try {
        const { data } = await api.get("/api/auth/me");
        localStorage.setItem("user", JSON.stringify(data));
        setUser(data);
      } catch {
        clearAuthState();
      } finally {
        setAuthReady(true);
      }
    };

    initializeAuth();
  }, []);

  // Login uses OAuth2 form encoding (username = email)
  const login = async (email, password) => {
    const normalizedEmail = email.trim().toLowerCase();
    const form = new URLSearchParams();
    form.append("username", normalizedEmail);
    form.append("password", password);
    const { data } = await api.post("/api/auth/login", form);
    localStorage.setItem("token", data.access_token);
    localStorage.setItem("user", JSON.stringify(data.user));
    setUser(data.user);
  };

  const register = async (payload) => {
    const normalizedPayload = {
      ...payload,
      email: payload.email.trim().toLowerCase(),
      password: payload.password,
      phone: payload.phone?.trim() || "",
    };
    await api.post("/api/auth/register", normalizedPayload);
  };

  const logout = () => {
    clearAuthState();
  };

  if (!authReady) {
    return null;
  }

  return (
    <AuthContext.Provider value={{ user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
