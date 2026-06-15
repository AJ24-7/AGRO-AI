import { useState } from "react";
import api from "../api/axios";

export default function Fertilizer() {
  const [form, setForm] = useState({ nitrogen: "", phosphorus: "", potassium: "", crop: "Wheat" });
  const [result, setResult] = useState(null);

  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const submit = async (e) => {
    e.preventDefault();
    const payload = {
      nitrogen: Number(form.nitrogen), phosphorus: Number(form.phosphorus),
      potassium: Number(form.potassium), crop: form.crop,
    };
    const { data } = await api.post("/api/fertilizer/recommend", payload);
    setResult(data);
  };

  return (
    <div className="space-y-6">
      <div className="card max-w-xl">
        <h2 className="text-xl font-bold text-agro-dark mb-4">💊 Fertilizer Recommendation</h2>
        <form onSubmit={submit} className="grid grid-cols-2 gap-3">
          <input className="input" name="nitrogen" type="number" placeholder="Nitrogen" onChange={change} required />
          <input className="input" name="phosphorus" type="number" placeholder="Phosphorus" onChange={change} required />
          <input className="input" name="potassium" type="number" placeholder="Potassium" onChange={change} required />
          <select className="input" name="crop" value={form.crop} onChange={change}>
            {["Wheat", "Rice", "Maize", "Cotton", "Sugarcane"].map((c) => <option key={c}>{c}</option>)}
          </select>
          <button className="btn col-span-2">Recommend</button>
        </form>
      </div>

      {result && (
        <div className="card max-w-xl">
          <h3 className="font-semibold mb-3 text-agro-dark">For {result.crop}</h3>
          {result.recommendations.map((r, i) => (
            <div key={i} className="flex justify-between border-b py-2">
              <span className="font-medium">{r.name}</span>
              <span className="text-agro">{r.quantity}</span>
              <span className="text-xs text-gray-500">{r.reason}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
