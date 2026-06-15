import { useState } from "react";
import api from "../api/axios";

export default function SoilAnalysis() {
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const upload = async (e) => {
    e.preventDefault();
    if (!file) return;
    setLoading(true);
    const fd = new FormData();
    fd.append("file", file);
    const { data } = await api.post("/api/soil/analyze", fd);
    setResult(data); setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div className="card max-w-xl">
        <h2 className="text-xl font-bold text-agro-dark mb-4">🧪 Soil Report OCR</h2>
        <form onSubmit={upload} className="space-y-3">
          <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files[0])} className="input" />
          <button className="btn" disabled={loading}>{loading ? "Analyzing..." : "Upload & Analyze"}</button>
        </form>
      </div>

      {result && (
        <div className="card max-w-xl">
          <h3 className="font-semibold mb-3 text-agro-dark">Extracted Values</h3>
          <table className="w-full text-sm">
            <tbody>
              <tr><td className="table-td font-medium">Nitrogen (N)</td><td className="table-td">{result.values.nitrogen}</td></tr>
              <tr><td className="table-td font-medium">Phosphorus (P)</td><td className="table-td">{result.values.phosphorus}</td></tr>
              <tr><td className="table-td font-medium">Potassium (K)</td><td className="table-td">{result.values.potassium}</td></tr>
              <tr><td className="table-td font-medium">pH</td><td className="table-td">{result.values.ph}</td></tr>
            </tbody>
          </table>
          <details className="mt-3 text-xs text-gray-500">
            <summary>Raw OCR text</summary>
            <pre className="whitespace-pre-wrap">{result.raw_text}</pre>
          </details>
        </div>
      )}
    </div>
  );
}
