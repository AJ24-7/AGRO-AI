import { useState, useRef } from "react";
import api from "../api/axios";
import {
  FlaskConical, Upload, ImagePlus, FileText,
  Loader2, AlertCircle, CheckCircle2, ChevronDown,
} from "lucide-react";

const NUTRIENTS = [
  { key: "nitrogen", label: "Nitrogen (N)", color: "bg-blue-400", textColor: "text-blue-700", bg: "bg-blue-50", max: 140 },
  { key: "phosphorus", label: "Phosphorus (P)", color: "bg-orange-400", textColor: "text-orange-700", bg: "bg-orange-50", max: 145 },
  { key: "potassium", label: "Potassium (K)", color: "bg-purple-400", textColor: "text-purple-700", bg: "bg-purple-50", max: 205 },
  { key: "ph", label: "pH", color: "bg-teal-400", textColor: "text-teal-700", bg: "bg-teal-50", max: 14 },
];

export default function SoilAnalysis() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);

  const handleFile = (f) => {
    if (!f) return;
    setFile(f);
    setResult(null);
    setError(null);
    const url = URL.createObjectURL(f);
    setPreview(url);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f && f.type.startsWith("image/")) handleFile(f);
  };

  const upload = async (e) => {
    e.preventDefault();
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { data } = await api.post("/api/soil/analyze", fd);
      setResult(data);
    } catch {
      setError("Analysis failed. Ensure the image is a clear soil report and try again.");
    } finally {
      setLoading(false);
    }
  };

  const getBarWidth = (key, value) => {
    const nutrient = NUTRIENTS.find((n) => n.key === key);
    if (!nutrient || !value) return "0%";
    return `${Math.min(100, (Number(value) / nutrient.max) * 100).toFixed(1)}%`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <div className="flex items-center gap-3">
          <div className="stat-icon bg-teal-600 w-10 h-10">
            <FlaskConical className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="page-title">Soil Analysis</h2>
            <p className="page-subtitle">Extract nutrient values from soil report images using OCR.</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Upload form */}
        <div className="card space-y-4">
          <div className="card-header">
            <div className="flex items-center gap-2">
              <Upload className="w-4 h-4 text-teal-600" />
              <h3 className="section-title">Upload soil report</h3>
            </div>
            <p className="section-subtitle">Upload a soil test report image to parse nutrient data via OCR.</p>
          </div>

          {error && (
            <div className="error-box">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => !preview && inputRef.current.click()}
            className={`drop-zone p-6 flex flex-col items-center justify-center text-center min-h-36 ${dragging ? "drop-zone-active" : ""} ${!preview ? "cursor-pointer" : ""}`}
          >
            <input ref={inputRef} type="file" accept="image/*" onChange={(e) => handleFile(e.target.files?.[0])} className="hidden" />

            {preview ? (
              <div className="flex flex-col items-center gap-3 w-full">
                <img src={preview} alt="preview" className="max-h-40 rounded-2xl object-contain shadow-sm" />
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <FileText className="w-3.5 h-3.5" />
                  <span className="truncate max-w-xs">{file?.name}</span>
                </div>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); inputRef.current.click(); }}
                  className="btn-outline text-xs px-3 py-1.5"
                >
                  <ImagePlus className="w-3.5 h-3.5" /> Change image
                </button>
              </div>
            ) : (
              <>
                <div className="w-14 h-14 rounded-2xl bg-teal-50 flex items-center justify-center mb-3">
                  <ImagePlus className="w-7 h-7 text-teal-500" />
                </div>
                <p className="text-sm font-medium text-slate-700">Drop soil report image here</p>
                <p className="text-xs text-slate-400 mt-1">or click to browse · JPG, PNG supported</p>
              </>
            )}
          </div>

          <button className="btn w-full" disabled={loading || !file} onClick={upload}>
            {loading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing report…</>
            ) : (
              <><FlaskConical className="w-4 h-4" /> Upload & Analyze</>
            )}
          </button>
        </div>

        {/* Results */}
        {result ? (
          <div className="card space-y-5">
            <div className="card-header">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-teal-600" />
                <h3 className="section-title">Extracted nutrient values</h3>
              </div>
              <p className="section-subtitle">Parsed metrics from the uploaded soil report.</p>
            </div>

            {/* Nutrient meters */}
            <div className="grid grid-cols-1 gap-4">
              {NUTRIENTS.map(({ key, label, color, textColor, bg, max }) => {
                const val = result.values?.[key];
                const pct = val != null ? Math.min(100, (Number(val) / max) * 100).toFixed(0) : 0;
                return (
                  <div key={key} className={`${bg} rounded-2xl p-4`}>
                    <div className="flex justify-between items-center mb-2">
                      <span className={`text-sm font-semibold ${textColor}`}>{label}</span>
                      <span className={`text-lg font-bold ${textColor}`}>{val ?? "—"}</span>
                    </div>
                    <div className="h-2 bg-white/60 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${color} transition-all duration-700`} style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-xs text-slate-400 mt-1">{pct}% of typical max ({max})</p>
                  </div>
                );
              })}
            </div>

            {/* Raw OCR */}
            {result.raw_text && (
              <details className="rounded-2xl border border-slate-100 bg-slate-50 overflow-hidden group">
                <summary className="flex items-center justify-between cursor-pointer px-4 py-3 text-sm font-medium text-slate-600 hover:text-slate-900 select-none">
                  <span className="flex items-center gap-2"><FileText className="w-4 h-4" /> Raw OCR text</span>
                  <ChevronDown className="w-4 h-4 transition-transform group-open:rotate-180" />
                </summary>
                <pre className="px-4 pb-4 whitespace-pre-wrap text-xs text-slate-500 leading-relaxed">{result.raw_text}</pre>
              </details>
            )}
          </div>
        ) : (
          <div className="card flex flex-col items-center justify-center py-16 text-center border-dashed border-2 border-slate-100">
            <FlaskConical className="w-12 h-12 text-slate-200 mb-3" />
            <p className="text-sm font-medium text-slate-400">Extracted values appear here</p>
            <p className="text-xs text-slate-300 mt-1">Upload a soil report to begin analysis</p>
          </div>
        )}
      </div>
    </div>
  );
}
