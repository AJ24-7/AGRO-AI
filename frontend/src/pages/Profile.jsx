import { useEffect, useState } from "react";
import api from "../api/axios";
import {
  User, MapPin, Building, Map, Ruler, Pencil,
  CheckCircle2, X, Loader2, AlertCircle, Save,
} from "lucide-react";

export default function Profile() {
  const [form, setForm] = useState({ name: "", village: "", district: "", state: "", total_land_area: "" });
  const [orig, setOrig] = useState(null);
  const [msg, setMsg] = useState(null);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  useEffect(() => {
    api.get("/api/farmer").then((r) => {
      setForm({ ...r.data, total_land_area: r.data?.total_land_area ?? "" });
      setOrig(r.data);
    }).catch(() => {}).finally(() => setPageLoading(false));
  }, []);

  const initials = (name) => {
    if (!name) return "FP";
    return name.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();
  };

  const change = (e) => {
    const { name, value, type } = e.target;
    setForm((f) => ({ ...f, [name]: type === "number" ? (value === "" ? "" : Number(value)) : value }));
    setErrors((err) => ({ ...err, [name]: null }));
  };

  const validate = () => {
    const err = {};
    if (!form.name || form.name.trim().length < 2) err.name = "Please enter your full name.";
    if (form.total_land_area === "" || Number(form.total_land_area) <= 0) err.total_land_area = "Enter a valid land area (> 0).";
    return err;
  };

  const save = async (e) => {
    e.preventDefault();
    const err = validate();
    if (Object.keys(err).length) { setErrors(err); return; }
    setLoading(true);
    try {
      await api.put("/api/farmer", form);
      setOrig(form);
      setMsg({ text: "Profile updated successfully.", type: "success" });
    } catch {
      setMsg({ text: "Unable to save profile. Try again.", type: "error" });
    } finally {
      setLoading(false);
      setTimeout(() => setMsg(null), 4000);
    }
  };

  const cancel = () => {
    if (orig) setForm({ ...orig, total_land_area: orig.total_land_area ?? "" });
    setErrors({});
  };

  if (pageLoading) return (
    <div className="flex items-center justify-center py-24 text-slate-400">
      <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading profile...
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-agro to-agro-dark text-white flex items-center justify-center text-xl font-bold shadow-md select-none">
              {initials(form.name)}
            </div>
            <div className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-white border-2 border-agro flex items-center justify-center">
              <Pencil className="w-2.5 h-2.5 text-agro" />
            </div>
          </div>
          <div>
            <h2 className="page-title">{form.name || "Your Profile"}</h2>
            <p className="page-subtitle">Manage your farmer profile and land details.</p>
          </div>
        </div>
        {orig && (
          <div className="flex items-center gap-3">
            <span className="badge badge-info">
              <Map className="w-3 h-3" />
              {form.state || "No state set"}
            </span>
            {form.total_land_area && (
              <span className="badge badge-neutral">
                <Ruler className="w-3 h-3" />
                {form.total_land_area} ac
              </span>
            )}
          </div>
        )}
      </div>

      {msg && (
        <div className={msg.type === "success" ? "success-box" : "error-box"}>
          {msg.type === "success" ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          {msg.text}
        </div>
      )}

      <div className="card max-w-3xl">
        <div className="card-header">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-agro" />
            <h3 className="section-title">Farmer information</h3>
          </div>
          <p className="section-subtitle">Keep your contact and location details current.</p>
        </div>

        <form onSubmit={save} className="grid gap-5 md:grid-cols-2">
          <div className="form-field">
            <label className="label">Full name <span className="text-rose-400">*</span></label>
            <div className="relative">
              <span className="input-icon"><User className="w-4 h-4" /></span>
              <input className="input-with-icon" name="name" placeholder="Your full name" value={form.name || ""} onChange={change} />
            </div>
            {errors.name && <p className="text-rose-500 text-xs mt-1">{errors.name}</p>}
          </div>

          <div className="form-field">
            <label className="label">Total land area (acres) <span className="text-rose-400">*</span></label>
            <div className="relative">
              <span className="input-icon"><Ruler className="w-4 h-4" /></span>
              <input
                className="input-with-icon"
                name="total_land_area"
                type="number"
                min="0"
                step="0.01"
                placeholder="e.g. 25.5"
                value={form.total_land_area === null || form.total_land_area === undefined ? "" : form.total_land_area}
                onChange={change}
              />
            </div>
            {errors.total_land_area && <p className="text-rose-500 text-xs mt-1">{errors.total_land_area}</p>}
          </div>

          <div className="form-field">
            <label className="label">Village</label>
            <div className="relative">
              <span className="input-icon"><MapPin className="w-4 h-4" /></span>
              <input className="input-with-icon" name="village" placeholder="Village name" value={form.village || ""} onChange={change} />
            </div>
          </div>

          <div className="form-field">
            <label className="label">District</label>
            <div className="relative">
              <span className="input-icon"><Building className="w-4 h-4" /></span>
              <input className="input-with-icon" name="district" placeholder="District" value={form.district || ""} onChange={change} />
            </div>
          </div>

          <div className="form-field md:col-span-2">
            <label className="label">State</label>
            <div className="relative">
              <span className="input-icon"><Map className="w-4 h-4" /></span>
              <input className="input-with-icon" name="state" placeholder="State / Province" value={form.state || ""} onChange={change} />
            </div>
          </div>

          <div className="md:col-span-2 flex flex-wrap items-center gap-3 pt-2 border-t border-slate-50">
            <button type="submit" className="btn" disabled={loading}>
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : <><Save className="w-4 h-4" /> Save profile</>}
            </button>
            <button type="button" onClick={cancel} className="btn-outline">
              <X className="w-4 h-4" /> Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
