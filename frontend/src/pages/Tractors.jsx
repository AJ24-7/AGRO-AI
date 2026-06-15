import { useEffect, useState } from "react";
import api from "../api/axios";

export default function Tractors() {
  const [tractors, setTractors] = useState([]);
  const [form, setForm] = useState({ registration_number: "", brand: "", model: "", purchase_year: "" });
  const [editId, setEditId] = useState(null);

  const load = () => api.get("/api/tractors").then((r) => setTractors(r.data));
  useEffect(() => { load(); }, []);

  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const submit = async (e) => {
    e.preventDefault();
    const payload = { ...form, purchase_year: Number(form.purchase_year) };
    if (editId) await api.put(`/api/tractors/${editId}`, payload);
    else await api.post("/api/tractors", payload);
    setForm({ registration_number: "", brand: "", model: "", purchase_year: "" });
    setEditId(null); load();
  };
  const edit = (t) => { setForm(t); setEditId(t.id); };
  const remove = async (id) => { await api.delete(`/api/tractors/${id}`); load(); };

  return (
    <div className="space-y-6">
      <div className="card max-w-3xl">
        <h2 className="text-xl font-bold text-agro-dark mb-4">🛻 {editId ? "Edit" : "Register"} Tractor</h2>
        <form onSubmit={submit} className="grid grid-cols-4 gap-3">
          <input className="input" name="registration_number" placeholder="Reg. No." value={form.registration_number} onChange={change} required />
          <input className="input" name="brand" placeholder="Brand" value={form.brand} onChange={change} />
          <input className="input" name="model" placeholder="Model" value={form.model} onChange={change} />
          <input className="input" name="purchase_year" type="number" placeholder="Year" value={form.purchase_year} onChange={change} />
          <button className="btn col-span-4">{editId ? "Update" : "Register"} Tractor</button>
        </form>
      </div>

      <div className="card">
        <table className="w-full text-sm">
          <thead><tr>
            <th className="table-th">Reg. No.</th><th className="table-th">Brand</th>
            <th className="table-th">Model</th><th className="table-th">Year</th><th className="table-th">Actions</th>
          </tr></thead>
          <tbody>
            {tractors.map((t) => (
              <tr key={t.id}>
                <td className="table-td">{t.registration_number}</td>
                <td className="table-td">{t.brand}</td>
                <td className="table-td">{t.model}</td>
                <td className="table-td">{t.purchase_year}</td>
                <td className="table-td space-x-2">
                  <button onClick={() => edit(t)} className="text-blue-600">Edit</button>
                  <button onClick={() => remove(t.id)} className="text-red-600">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
