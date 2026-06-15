import { useEffect, useState } from "react";
import api from "../api/axios";

export default function Profile() {
  const [form, setForm] = useState({
    name: "", village: "", district: "", state: "", total_land_area: 0,
  });
  const [msg, setMsg] = useState("");

  useEffect(() => {
    api.get("/api/farmer").then((r) => setForm(r.data));
  }, []);

  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const save = async (e) => {
    e.preventDefault();
    await api.put("/api/farmer", form);
    setMsg("Profile updated ✅");
    setTimeout(() => setMsg(""), 2000);
  };

  return (
    <div className="card max-w-xl">
      <h2 className="text-xl font-bold text-agro-dark mb-4">👨‍🌾 Farmer Profile</h2>
      {msg && <p className="text-green-600 mb-2">{msg}</p>}
      <form onSubmit={save} className="space-y-3">
        <input className="input" name="name" placeholder="Name" value={form.name || ""} onChange={change} />
        <input className="input" name="village" placeholder="Village" value={form.village || ""} onChange={change} />
        <input className="input" name="district" placeholder="District" value={form.district || ""} onChange={change} />
        <input className="input" name="state" placeholder="State" value={form.state || ""} onChange={change} />
        <input className="input" name="total_land_area" type="number" placeholder="Total Land Area (acres)"
               value={form.total_land_area || ""} onChange={change} />
        <button className="btn">Save Profile</button>
      </form>
    </div>
  );
}
