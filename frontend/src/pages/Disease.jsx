import { useState, useEffect, useRef } from "react";
import api from "../api/axios";
import {
  ShieldAlert, Upload, ImagePlus, X, RefreshCw,
  CheckCircle2, AlertTriangle, Clock, Trash2,
} from "lucide-react";

const severityLevel = (confidence) => {
  if (confidence >= 80) return { label: "High confidence", color: "badge-danger" };
  if (confidence >= 50) return { label: "Moderate confidence", color: "badge-warning" };
  return { label: "Low confidence", color: "badge-neutral" };
};

export default function Disease() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);

  const loadHistory = () =>
    api.get("/api/disease/history").then((r) => setHistory(r.data)).catch(() => {});

  useEffect(() => { loadHistory(); }, []);

  useEffect(() => {
    if (!file) { setPreview(null); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f && f.type.startsWith("image/")) { setFile(f); setResult(null); }
  };

  const onSelectFile = (e) => {
    const f = e.target.files?.[0];
    if (f && f.type.startsWith("image/")) { setFile(f); setResult(null); }
  };

  const removeFile = () => { setFile(null); setResult(null); if (inputRef.current) inputRef.current.value = ""; };

  const submit = async (e) => {
    e?.preventDefault();
    if (!file) return;
    setLoading(true);
    setResult(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { data } = await api.post("/api/disease/detect", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setResult(data);
      loadHistory();
    } catch {
      setResult({ error: "Detection failed. Please try a clearer image." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <div className="flex items-center gap-3">
          <div className="stat-icon bg-rose-500 w-10 h-10">
            <ShieldAlert className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="page-title">Disease Detection</h2>
            <p className="page-subtitle">Upload leaf images for AI-powered disease analysis.</p>
          </div>
        </div>
        <button onClick={loadHistory} className="btn-outline">
          <RefreshCw className="w-4 h-4" /> Refresh history
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        {/* Upload & Detection */}
        <div className="card space-y-4">
          <div className="card-header">
            <div className="flex items-center gap-2">
              <Upload className="w-4 h-4 text-agro" />
              <h3 className="section-title">Upload image</h3>
            </div>
            <p className="section-subtitle">Drag & drop or select a leaf photo for quick analysis.</p>
          </div>

          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => !preview && inputRef.current.click()}
            className={`drop-zone p-6 flex flex-col items-center justify-center text-center min-h-44 ${
              dragging ? "drop-zone-active" : ""
            } ${!preview ? "cursor-pointer" : ""}`}
          >
            <input ref={inputRef} type="file" accept="image/*" onChange={onSelectFile} className="hidden" />

            {preview ? (
              <div className="w-full flex flex-col items-center gap-3">
                <img src={preview} alt="preview" className="max-h-52 rounded-2xl object-contain shadow-sm" />
                <p className="text-xs text-slate-500 truncate max-w-full px-2">{file?.name}</p>
                <div className="flex gap-2">
                  <button type="button" onClick={(e) => { e.stopPropagation(); inputRef.current.click(); }} className="btn-outline">
                    <ImagePlus className="w-4 h-4" /> Change
                  </button>
                  <button type="button" onClick={(e) => { e.stopPropagation(); removeFile(); }} className="btn-danger">
                    <X className="w-4 h-4" /> Remove
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="w-14 h-14 rounded-2xl bg-agro-light flex items-center justify-center mb-3">
                  <ImagePlus className="w-7 h-7 text-agro" />
                </div>
                <p className="text-sm font-medium text-slate-700">Drop your leaf image here</p>
                <p className="text-xs text-slate-400 mt-1">or click to browse · JPG, PNG supported</p>
              </>
            )}
          </div>

          {/* Action */}
          <button
            className="btn w-full"
            disabled={loading || !file}
            onClick={submit}
          >
            {loading ? (
              <><RefreshCw className="w-4 h-4 animate-spin" /> Detecting disease…</>
            ) : (
              <><ShieldAlert className="w-4 h-4" /> Detect Disease</>
            )}
          </button>

          {/* Result panel */}
          {result && (
            <div className={`rounded-2xl border p-4 ${result.error ? "border-rose-200 bg-rose-50" : "border-emerald-100 bg-emerald-50/40"}`}>
              {result.error ? (
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-rose-500 mt-0.5 shrink-0" />
                  <p className="text-sm text-rose-700">{result.error}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-500 uppercase tracking-wide">Detected disease</p>
                      <p className="text-lg font-bold text-slate-900 mt-0.5">{result.disease}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className={`badge ${severityLevel(result.confidence).color}`}>
                          {severityLevel(result.confidence).label}
                        </span>
                        <span className="text-xs text-slate-500">{result.confidence}% confidence</span>
                      </div>
                    </div>
                  </div>

                  {/* Confidence bar */}
                  <div className="space-y-1">
                    <div className="confidence-bar">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-agro to-agro-accent"
                        style={{ width: `${result.confidence}%` }}
                      />
                    </div>
                  </div>

                  {result.treatment && (
                    <div className="bg-white rounded-xl border border-emerald-100 p-3 text-sm">
                      <p className="font-semibold text-slate-700 text-xs uppercase tracking-wide mb-1">Recommended treatment</p>
                      <p className="text-slate-600 leading-relaxed">{result.treatment}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* History table */}
        <div className="card">
          <div className="card-header">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-400" />
              <h3 className="section-title">Detection history</h3>
            </div>
            <p className="section-subtitle">Recent detections with confidence levels.</p>
          </div>

          <div className="overflow-x-auto -mx-5 px-5">
            <table className="w-full text-sm min-w-[440px]">
              <thead>
                <tr>
                  <th className="table-th rounded-tl-xl">Image</th>
                  <th className="table-th">Disease</th>
                  <th className="table-th">Confidence</th>
                  <th className="table-th rounded-tr-xl">Date</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id} className="table-row-hover">
                    <td className="table-td w-16">
                      {h.image_url ? (
                        <img src={h.image_url} alt="thumb" className="h-10 w-10 object-cover rounded-xl border border-slate-100" />
                      ) : (
                        <div className="h-10 w-10 bg-slate-100 rounded-xl flex items-center justify-center">
                          <ImagePlus className="w-4 h-4 text-slate-300" />
                        </div>
                      )}
                    </td>
                    <td className="table-td font-medium text-slate-800">{h.disease_name}</td>
                    <td className="table-td">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-agro"
                            style={{ width: `${h.confidence}%` }}
                          />
                        </div>
                        <span className="text-xs text-slate-500">{h.confidence}%</span>
                      </div>
                    </td>
                    <td className="table-td text-slate-400 text-xs whitespace-nowrap">
                      {new Date(h.created_at).toLocaleDateString()}{" "}
                      <span className="block text-slate-300">{new Date(h.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                    </td>
                  </tr>
                ))}
                {history.length === 0 && (
                  <tr>
                    <td colSpan="4">
                      <div className="empty-state py-10">
                        <Trash2 className="w-8 h-8 mb-2 text-slate-200" />
                        <p className="text-sm">No detections recorded yet</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
