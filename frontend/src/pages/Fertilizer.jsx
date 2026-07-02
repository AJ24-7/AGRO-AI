import { useState } from "react";
import api from "../api/axios";
import { useLanguage } from "../context/LanguageContext";
import { Sprout, FlaskConical, Loader2, CheckCircle2, Info, ChevronRight } from "lucide-react";

const NUTRIENT_COLORS = {
  nitrogen: { bg: "bg-blue-50", border: "border-blue-100", text: "text-blue-700", bar: "bg-blue-400", label: "N" },
  phosphorus: { bg: "bg-orange-50", border: "border-orange-100", text: "text-orange-700", bar: "bg-orange-400", label: "P" },
  potassium: { bg: "bg-purple-50", border: "border-purple-100", text: "text-purple-700", bar: "bg-purple-400", label: "K" },
};

export default function Fertilizer() {
  const { t } = useLanguage();
  const [form, setForm] = useState({ nitrogen: "", phosphorus: "", potassium: "", crop: "Wheat" });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const payload = {
        nitrogen: Number(form.nitrogen),
        phosphorus: Number(form.phosphorus),
        potassium: Number(form.potassium),
        crop: form.crop,
      };
      const { data } = await api.post("/api/fertilizer/recommend", payload);
      setResult(data);
    } catch {
      setError(t("fertilizer.recommendationFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <div className="flex items-center gap-3">
          <div className="stat-icon bg-amber-500 w-10 h-10">
            <Sprout className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="page-title">{t("fertilizer.title")}</h2>
            <p className="page-subtitle">{t("fertilizer.subtitle")}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Input form */}
        <div className="card">
          <div className="card-header">
            <div className="flex items-center gap-2">
              <FlaskConical className="w-4 h-4 text-amber-500" />
              <h3 className="section-title">{t("fertilizer.inputs")}</h3>
            </div>
            <p className="section-subtitle">{t("fertilizer.inputsSub")}</p>
          </div>

          {error && (
            <div className="error-box mb-4">
              <Info className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={submit} className="grid grid-cols-1 gap-4">
            {/* NPK inputs */}
            <div className="grid grid-cols-3 gap-3">
              {["nitrogen", "phosphorus", "potassium"].map((key) => {
                const c = NUTRIENT_COLORS[key];
                return (
                  <div key={key} className={`${c.bg} border ${c.border} rounded-2xl p-3`}>
                    <p className={`text-xs font-bold uppercase tracking-wide ${c.text} mb-2`}>{c.label}</p>
                    <input
                      className="w-full bg-transparent border-none text-lg font-semibold text-slate-900 focus:outline-none placeholder:text-slate-300"
                      name={key}
                      type="number"
                      min="0"
                      placeholder="0"
                      value={form[key]}
                      onChange={change}
                      required
                    />
                    <p className="text-xs text-slate-400 mt-1">kg/ha</p>
                  </div>
                );
              })}
            </div>

            <div className="form-field">
              <label className="label">{t("fertilizer.targetCrop")}</label>
              <select className="input" name="crop" value={form.crop} onChange={change}>
                {t("fertilizer.crops").map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>

            <button className="btn w-full" disabled={loading}>
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> {t("fertilizer.generating")}</>
              ) : (
                <><Sprout className="w-4 h-4" /> {t("fertilizer.getPlan")}</>
              )}
            </button>
          </form>
        </div>

        {/* Result */}
        {result ? (
          <div className="card">
            <div className="card-header">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-agro" />
                  <h3 className="section-title">{t("fertilizer.recommendedPlan")}</h3>
                </div>
                <span className="badge badge-success">{result.crop}</span>
              </div>
              <p className="section-subtitle">{t("fertilizer.planSub", { crop: result.crop })}</p>
            </div>

            <div className="divide-y divide-slate-50">
              {result.recommendations.map((r, i) => (
                <div key={i} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 py-3.5">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 w-7 h-7 rounded-lg bg-agro-light flex items-center justify-center shrink-0">
                      <Sprout className="w-3.5 h-3.5 text-agro" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900 text-sm">{r.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{r.reason}</p>
                    </div>
                  </div>
                  <span className="shrink-0 font-bold text-agro-dark bg-agro-light rounded-xl px-3 py-1 text-sm self-start sm:self-auto">
                    {r.quantity}
                  </span>
                </div>
              ))}
            </div>

            <button
              onClick={() => { setResult(null); setForm({ nitrogen: "", phosphorus: "", potassium: "", crop: "Wheat" }); }}
              className="btn-ghost w-full justify-center mt-4"
            >
                <ChevronRight className="w-4 h-4" /> {t("fertilizer.newRecommendation")}
            </button>
          </div>
        ) : (
          <div className="card flex flex-col items-center justify-center py-16 text-center border-dashed border-2 border-slate-100">
            <Sprout className="w-12 h-12 text-slate-200 mb-3" />
            <p className="text-sm font-medium text-slate-400">{t("fertilizer.emptyTitle")}</p>
            <p className="text-xs text-slate-300 mt-1">{t("fertilizer.emptySub")}</p>
          </div>
        )}
      </div>
    </div>
  );
}
