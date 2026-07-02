import { useEffect, useState } from "react";
import api from "../api/axios";
import {
  Tractor, Plus, Pencil, Trash2, Hash, Tag,
  Loader2, CheckCircle2, AlertTriangle, X, Calendar,
} from "lucide-react";

const EMPTY_FORM = { registration_number: "", brand: "", model: "", purchase_year: "" };

export default function Tractors() {
  const [tractors, setTractors] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [toast, setToast] = useState(null);

  const load = () => api.get("/api/tractors").then((r) => setTractors(r.data));
  useEffect(() => { load(); }, []);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { ...form, purchase_year: Number(form.purchase_year) };
      if (editId) {
        await api.put(`/api/tractors/${editId}`, payload);
        showToast("Tractor updated successfully.");
      } else {
        await api.post("/api/tractors", payload);
        showToast("Tractor registered successfully.");
      }
      setForm(EMPTY_FORM);
      setEditId(null);
      load();
    } catch {
      showToast("Failed to save. Try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  const edit = (t) => {
    setForm({ registration_number: t.registration_number, brand: t.brand, model: t.model, purchase_year: t.purchase_year });
    setEditId(t.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelEdit = () => { setForm(EMPTY_FORM); setEditId(null); };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/api/tractors/${deleteId}`);
      showToast("Tractor removed.");
      load();
    } catch {
      showToast("Delete failed. Try again.", "error");
    } finally {
      setDeleteId(null);
    }
  };

  const tractorAge = (year) => {
    if (!year) return null;
    const age = new Date().getFullYear() - Number(year);
    return age === 0 ? "New" : `${age} yr${age !== 1 ? "s" : ""} old`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <div className="flex items-center gap-3">
          <div className="stat-icon bg-agro-dark w-10 h-10">
            <Tractor className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="page-title">Tractors</h2>
            <p className="page-subtitle">Register and manage tractor inventory.</p>
          </div>
        </div>
        <span className="badge badge-info">{tractors.length} tractor{tractors.length !== 1 ? "s" : ""}</span>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`${toast.type === "error" ? "error-box" : "success-box"}`}>
          {toast.type === "error" ? <AlertTriangle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
          {toast.msg}
        </div>
      )}

      {/* Form */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {editId ? <Pencil className="w-4 h-4 text-agro" /> : <Plus className="w-4 h-4 text-agro" />}
              <h3 className="section-title">{editId ? "Edit Tractor" : "Register New Tractor"}</h3>
            </div>
            {editId && (
              <button onClick={cancelEdit} className="btn-ghost text-slate-400">
                <X className="w-4 h-4" /> Cancel
              </button>
            )}
          </div>
          <p className="section-subtitle">Track equipment registration, brand, and purchase year.</p>
        </div>

        <form onSubmit={submit} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="form-field">
            <label className="label">Registration No.</label>
            <div className="relative">
              <span className="input-icon"><Hash className="w-4 h-4" /></span>
              <input className="input-with-icon" name="registration_number" placeholder="e.g. MH-12-AB-1234" value={form.registration_number} onChange={change} required />
            </div>
          </div>
          <div className="form-field">
            <label className="label">Brand</label>
            <div className="relative">
              <span className="input-icon"><Tag className="w-4 h-4" /></span>
              <input className="input-with-icon" name="brand" placeholder="e.g. Mahindra" value={form.brand} onChange={change} />
            </div>
          </div>
          <div className="form-field">
            <label className="label">Model</label>
            <div className="relative">
              <span className="input-icon"><Tractor className="w-4 h-4" /></span>
              <input className="input-with-icon" name="model" placeholder="e.g. JIVO 245 DI" value={form.model} onChange={change} />
            </div>
          </div>
          <div className="form-field">
            <label className="label">Purchase year</label>
            <div className="relative">
              <span className="input-icon"><Calendar className="w-4 h-4" /></span>
              <input className="input-with-icon" name="purchase_year" type="number" min="1970" max={new Date().getFullYear()} placeholder="e.g. 2020" value={form.purchase_year} onChange={change} />
            </div>
          </div>

          <div className="sm:col-span-2 lg:col-span-4 flex gap-3">
            <button className="btn" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : editId ? <CheckCircle2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {loading ? "Saving…" : editId ? "Update Tractor" : "Register Tractor"}
            </button>
            {editId && <button type="button" onClick={cancelEdit} className="btn-outline">Cancel</button>}
          </div>
        </form>
      </div>

      {/* Tractor cards */}
      {tractors.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {tractors.map((t) => (
            <div key={t.id} className="card-hover space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="stat-icon bg-agro-light w-10 h-10 shrink-0">
                    <Tractor className="w-5 h-5 text-agro" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 truncate">{t.brand || "—"} {t.model || ""}</p>
                    <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                      <Hash className="w-3 h-3" /> {t.registration_number}
                    </p>
                  </div>
                </div>
                {t.purchase_year && (
                  <span className="badge badge-neutral shrink-0">
                    <Calendar className="w-3 h-3" /> {t.purchase_year}
                  </span>
                )}
              </div>

              {t.purchase_year && (
                <div className="text-xs text-slate-400 bg-slate-50 rounded-xl px-3 py-2">
                  {tractorAge(t.purchase_year)}
                </div>
              )}

              <div className="flex gap-2 pt-1 border-t border-slate-50">
                <button onClick={() => edit(t)} className="btn-ghost flex-1 justify-center">
                  <Pencil className="w-3.5 h-3.5" /> Edit
                </button>
                <button onClick={() => setDeleteId(t.id)} className="btn-ghost flex-1 justify-center text-rose-500 hover:text-rose-600 hover:bg-rose-50">
                  <Trash2 className="w-3.5 h-3.5" /> Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card empty-state py-16">
          <Tractor className="w-12 h-12 mb-3 text-slate-200" />
          <p className="text-sm font-medium text-slate-400">No tractors registered yet</p>
          <p className="text-xs text-slate-300 mt-1">Use the form above to add your first tractor.</p>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-6 w-full max-w-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="stat-icon bg-rose-100 w-10 h-10">
                <Trash2 className="w-5 h-5 text-rose-500" />
              </div>
              <div>
                <p className="font-semibold text-slate-900">Remove tractor?</p>
                <p className="text-sm text-slate-500">This action cannot be undone.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={confirmDelete} className="btn-danger flex-1 justify-center">
                <Trash2 className="w-4 h-4" /> Remove
              </button>
              <button onClick={() => setDeleteId(null)} className="btn-outline flex-1 justify-center">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
