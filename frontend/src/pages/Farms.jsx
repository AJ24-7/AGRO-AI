import { useEffect, useState } from "react";
import api from "../api/axios";

export default function Farms() {
  const [farms, setFarms] = useState([]);
  const [form, setForm] = useState({ farm_name: "", farm_area: "", location: "" });
  const [editId, setEditId] = useState(null);

  const load = () => api.get("/api/farms").then((r) => setFarms(r.data));
  useEffect(() => { load(); }, []);

  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    if (editId) await api.put(`/api/farms/${editId}`, form);
    else await api.post("/api/farms", form);
    setForm({ farm_name: "", farm_area: "", location: "" });
    setEditId(null); load();
  };

  const edit = (f) => { setForm(f); setEditId(f.id); };
  const remove = async (id) => { await api.delete(`/api/farms/${id}`); load(); };

  return (
    <div className="space-y-6">
      <div className="card max-w-2xl">
        <h2 className="text-xl font-bold text-agro-dark mb-4">🚜 {editId ? "Edit" : "Add"} Farm</h2>
        <form onSubmit={submit} className="grid grid-cols-3 gap-3">
          <input className="input" name="farm_name" placeholder="Farm Name" value={form.farm_name} onChange={change} required />
          <input className="input" name="farm_area" type="number" placeholder="Area (acres)" value={form.farm_area} onChange={change} />
          <input className="input" name="location" placeholder="Location" value={form.location} onChange={change} />
          <button className="btn col-span-3">{editId ? "Update" : "Add"} Farm</button>
        </form>
      </div>

      <div className="card">
        <h3 className="font-semibold mb-3 text-agro-dark">All Farms</h3>
        <table className="w-full text-sm">
          <thead><tr>
            <th className="table-th">Name</th><th className="table-th">Area</th>
            <th className="table-th">Location</th><th className="table-th">Actions</th>
          </tr></thead>
          <tbody>
            {farms.map((f) => (
              <tr key={f.id}>
                <td className="table-td">{f.farm_name}</td>
                <td className="table-td">{f.farm_area} acres</td>
                <td className="table-td">{f.location}</td>
                <td className="table-td space-x-2">
                  <button onClick={() => edit(f)} className="text-blue-600">Edit</button>
                  <button onClick={() => remove(f.id)} className="text-red-600">Delete</button>
                </td>
              </tr>
            ))}
            {farms.length === 0 && <tr><td className="table-td" colSpan="4">No farms yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
