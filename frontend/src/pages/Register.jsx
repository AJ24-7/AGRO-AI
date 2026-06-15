import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Link, useNavigate } from "react-router-dom";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", phone: "" });
  const [error, setError] = useState("");

  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const submit = async (e) => {
    e.preventDefault();
    try { await register(form); navigate("/login"); }
    catch (err) { setError(err.response?.data?.detail || "Registration failed"); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-agro-light">
      <form onSubmit={submit} className="card w-96 space-y-3">
        <h2 className="text-2xl font-bold text-agro-dark text-center">Create Account</h2>
        {error && <p className="text-red-500 text-sm text-center">{error}</p>}
        <input className="input" name="name" placeholder="Full Name" onChange={change} />
        <input className="input" name="email" placeholder="Email" onChange={change} />
        <input className="input" name="phone" placeholder="Phone Number" onChange={change} />
        <input className="input" name="password" type="password" placeholder="Password" onChange={change} />
        <button className="btn w-full">Register</button>
        <p className="text-center text-sm">Have an account?{" "}
          <Link to="/login" className="text-agro font-semibold">Login</Link>
        </p>
      </form>
    </div>
  );
}
