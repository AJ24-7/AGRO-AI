import { useState, useEffect } from "react";
import api from "../api/axios";

export default function Disease() {
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadHistory = () => api.get("/api/disease/history").then((r) => setHistory(r.data));
  useEffect(() => { loadHistory(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!file) return;
    setLoading(true);
    const fd = new FormData(); fd.append("file", file);
    const { data } = await api.post("/api/disease/detect", fd);
    setResult(data); setLoading(false); loadHistory();
  };

  return (
    <div className="space-y-6">
      <div className="card max-w-xl">
        <h2 className="text-xl font-bold text-agro-dark mb-4">🦠 Disease Detection</h2>
        <form onSubmit={submit} className="space-y-3">
          <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files[0])} className="input" />
          <button className="btn" disabled={loading}>{loading ? "Detecting..." : "Detect Disease"}</button>
        </form>
        {result && (
          <div className="mt-4 bg-agro-light p-4 rounded-lg">
            <p className="font-bold text-agro-dark text-lg">{result.disease}</p>
            <p className="text-sm">Confidence: {result.confidence}%</p>
            <p className="text-sm mt-2"><b>Treatment:</b> {result.treatment}</p>
          </div>
        )}
      </div>

      <div className="card">
        <h3 className="font-semibold mb-3 text-agro-dark">Detection History</h3>
        <table className="w-full text-sm">
          <thead><tr>
            <th className="table-th">Disease</th><th className="table-th">Confidence</th><th className="table-th">Date</th>
          </tr></thead>
          <tbody>
            {history.map((h) => (
              <tr key={h.id}>
                <td className="table-td">{h.disease_name}</td>
                <td className="table-td">{h.confidence}%</td>
                <td className="table-td">{new Date(h.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
