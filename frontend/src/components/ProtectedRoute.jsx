import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// Redirect to login if not authenticated
export default function ProtectedRoute() {
  const { user } = useAuth();
  return user ? <Outlet /> : <Navigate to="/login" />;
}
