import { useState } from "react";
import api from "../api/axios";

export default function CropRecommend() {
  const [form, setForm] = useState({ nitrogen: "", phosphorus: "", potassium: "", ph: "" });
  const [result, setResult] = useState(null);

  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const submit = async (e) => {
    e.preventDefault();
    const payload = Object.fromEntries(
      Object.entries(form).map(([k, v]) => [k, Number(v)]));
    const { data } = await api.post("/api/crop/recommend", payload);
    setResult(data);
  };

  return (
    <div className="space-y-6">
      <div className="card max-w-xl">
        <h2 className="text-xl font-bold text-agro-dark mb-4">🌱 Crop Recommendation AI</h2>
        <form onSubmit={submit} className="grid grid-cols-2 gap-3">
          <input className="input" name="nitrogen" type="number" placeholder="Nitrogen (N)" onChange={change} required />
          <input className="input" name="phosphorus" type="number" placeholder="Phosphorus (P)" onChange={change} required />
          <input className="input" name="potassium" type="number" placeholder="Potassium (K)" onChange={change} required />
          <input className="input" name="ph" type="number" step="0.1" placeholder="pH" onChange={change} required />
          <button className="btn col-span-2">Get Recommendation</button>
        </form>
      </div>

      {result && (
        <div className="card max-w-xl text-center">
          <p className="text-gray-500">Recommended Crop</p>
          <h3 className="text-3xl font-bold text-agro-dark my-2">🌾 {result.recommended_crop}</h3>
          <div className="bg-gray-100 rounded-full h-4 w-full mt-3">
            <div className="bg-agro h-4 rounded-full" style={{ width: `${result.confidence}%` }} />
          </div>
          <p className="text-sm mt-1">Confidence: {result.confidence}%</p>
        </div>
      )}
    </div>
  );
}
