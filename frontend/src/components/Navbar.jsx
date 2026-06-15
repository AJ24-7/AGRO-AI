import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate("/login"); };

  return (
    <header className="h-16 bg-white border-b flex items-center justify-between px-6 shadow-sm">
      <h1 className="text-lg font-semibold text-agro-dark">Farm Management Dashboard</h1>
      <div className="flex items-center gap-4">
        <span className="text-gray-600">Hi, <b>{user?.name}</b> 👋</span>
        <button onClick={handleLogout} className="btn-outline text-sm">Logout</button>
      </div>
    </header>
  );
}
