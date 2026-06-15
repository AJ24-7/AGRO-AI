import { useEffect, useState } from "react";
import api from "../api/axios";

export default function Plots() {
  const [plots, setPlots] = useState([]);
  const [farms, setFarms] = useState([]);
  const [form, setForm] = useState({ farm_id: "", plot_name: "", plot_area: "", soil_type: "" });
  const [editId, setEditId] = useState(null);

  const load = () => {
    api.get("/api/plots").then((r) => setPlots(r.data));
    api.get("/api/farms").then((r) => setFarms(r.data));
  };
  useEffect(() => { load(); }, []);

  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const submit = async (e) => {
    e.preventDefault();
    const payload = { ...form, farm_id: Number(form.farm_id) };
    if (editId) await api.put(`/api/plots/${editId}`, payload);
    else await api.post("/api/plots", payload);
    setForm({ farm_id: "", plot_name: "", plot_area: "", soil_type: "" });
    setEditId(null); load();
  };
  const edit = (p) => { setForm(p); setEditId(p.id); };
  const remove = async (id) => { await api.delete(`/api/plots/${id}`); load(); };

  return (
    <div className="space-y-6">
      <div className="card max-w-3xl">
        <h2 className="text-xl font-bold text-agro-dark mb-4">🌾 {editId ? "Edit" : "Add"} Plot</h2>
        <form onSubmit={submit} className="grid grid-cols-4 gap-3">
          <select className="input" name="farm_id" value={form.farm_id} onChange={change} required>
            <option value="">Select Farm</option>
            {farms.map((f) => <option key={f.id} value={f.id}>{f.farm_name}</option>)}
          </select>
          <input className="input" name="plot_name" placeholder="Plot Name" value={form.plot_name} onChange={change} required />
          <input className="input" name="plot_area" type="number" placeholder="Area" value={form.plot_area} onChange={change} />
          <input className="input" name="soil_type" placeholder="Soil Type" value={form.soil_type} onChange={change} />
          <button className="btn col-span-4">{editId ? "Update" : "Add"} Plot</button>
        </form>
      </div>

      <div className="card">
        <table className="w-full text-sm">
          <thead><tr>
            <th className="table-th">Plot</th><th className="table-th">Area</th>
            <th className="table-th">Soil Type</th><th className="table-th">Actions</th>
          </tr></thead>
          <tbody>
            {plots.map((p) => (
              <tr key={p.id}>
                <td className="table-td">{p.plot_name}</td>
                <td className="table-td">{p.plot_area}</td>
                <td className="table-td">{p.soil_type}</td>
                <td className="table-td space-x-2">
                  <button onClick={() => edit(p)} className="text-blue-600">Edit</button>
                  <button onClick={() => remove(p.id)} className="text-red-600">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
