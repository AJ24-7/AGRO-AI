import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Link, useNavigate } from "react-router-dom";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    try { await login(email, password); navigate("/"); }
    catch { setError("Invalid email or password"); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-agro-light">
      <form onSubmit={submit} className="card w-96 space-y-4">
        <h2 className="text-2xl font-bold text-agro-dark text-center">🌱 AgroPilot AI</h2>
        <p className="text-center text-gray-500">Login to your account</p>
        {error && <p className="text-red-500 text-sm text-center">{error}</p>}
        <input className="input" placeholder="Email" value={email}
               onChange={(e) => setEmail(e.target.value)} />
        <input className="input" type="password" placeholder="Password" value={password}
               onChange={(e) => setPassword(e.target.value)} />
        <button className="btn w-full">Login</button>
        <p className="text-center text-sm">No account?{" "}
          <Link to="/register" className="text-agro font-semibold">Register</Link>
        </p>
      </form>
    </div>
  );
}
