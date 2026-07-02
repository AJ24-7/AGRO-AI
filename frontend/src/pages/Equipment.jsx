import { useEffect, useState, useMemo } from "react";
import api from "../api/axios";
import { useLanguage } from "../context/LanguageContext";
import {
  Wrench, Plus, Pencil, Trash2, Hash, Tag, Loader2,
  CheckCircle2, AlertTriangle, X, Calendar, RefreshCw,
  ChevronDown, ChevronUp, ExternalLink, ShoppingCart,
  Zap, List, Settings, Search, Package,
} from "lucide-react";

/* ── My-Equipment form default ───────────────────────────────────────────── */
const EMPTY_FORM = { registration_number: "", brand: "", model: "", purchase_year: "" };

/* ── Category colour map ─────────────────────────────────────────────────── */
const CAT_COLOUR = {
  Tractor:      "bg-emerald-50 text-emerald-700 border-emerald-100",
  Rotavator:    "bg-amber-50 text-amber-700 border-amber-100",
  "Seed Drill": "bg-blue-50 text-blue-700 border-blue-100",
  "Power Tiller":"bg-purple-50 text-purple-700 border-purple-100",
  Harvester:    "bg-rose-50 text-rose-700 border-rose-100",
  Sprayer:      "bg-teal-50 text-teal-700 border-teal-100",
  Irrigation:   "bg-cyan-50 text-cyan-700 border-cyan-100",
  Tillage:      "bg-orange-50 text-orange-700 border-orange-100",
  Thresher:     "bg-indigo-50 text-indigo-700 border-indigo-100",
};
function catBadge(cat) {
  return `inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium border ${
    CAT_COLOUR[cat] ?? "bg-slate-100 text-slate-600 border-slate-200"
  }`;
}

/* ── Format price ────────────────────────────────────────────────────────── */
function fmtINR(val) {
  if (!val) return null;
  if (val >= 100000) return `₹${(val / 100000).toFixed(2)} L`;
  if (val >= 1000)   return `₹${(val / 1000).toFixed(0)}K`;
  return `₹${val}`;
}

/* ── Fallback image ──────────────────────────────────────────────────────── */
const FALLBACK_IMG =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 500'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0%' stop-color='%23e2e8f0'/><stop offset='100%' stop-color='%23cbd5e1'/></linearGradient></defs><rect width='800' height='500' fill='url(%23g)'/><g fill='%2364758b' font-family='Segoe UI, Arial, sans-serif' text-anchor='middle'><text x='400' y='230' font-size='34' font-weight='700'>Equipment Image Unavailable</text><text x='400' y='275' font-size='20'>Check merchant link for live product photo</text></g></svg>";

export default function Equipment() {
  const { t } = useLanguage();
  const eq = (k) => t(`equipment.${k}`);

  /* catalog & my-equipment state */
  const [catalog, setCatalog]       = useState([]);
  const [myEq, setMyEq]             = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError]     = useState(null);
  const [lastUpdated, setLastUpdated]       = useState(null);

  /* UI state */
  const [tab, setTab]                   = useState("catalog");   // "catalog" | "mine"
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchQuery, setSearchQuery]   = useState("");
  const [expandedId, setExpandedId]     = useState(null);
  const [imgErrors, setImgErrors]       = useState({});

  /* My-equipment form */
  const [form, setForm]         = useState(EMPTY_FORM);
  const [editId, setEditId]     = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [toast, setToast]       = useState(null);

  /* ── Loaders ───────────────────────────────────────────────────────────── */
  const loadCatalog = async () => {
    setCatalogLoading(true);
    setCatalogError(null);
    try {
      const { data } = await api.get("/api/equipment/catalog");
      setCatalog(data.items ?? []);
      setLastUpdated(data.generated_at ? new Date(data.generated_at) : new Date());
    } catch {
      setCatalogError(eq("errorLoad"));
    } finally {
      setCatalogLoading(false);
    }
  };

  const loadMyEq = () =>
    api.get("/api/tractors").then((r) => setMyEq(r.data)).catch(() => {});

  useEffect(() => { loadCatalog(); loadMyEq(); }, []);

  /* ── Toast helper ──────────────────────────────────────────────────────── */
  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  };

  /* ── My-equipment CRUD ─────────────────────────────────────────────────── */
  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      const payload = { ...form, purchase_year: Number(form.purchase_year) };
      if (editId) {
        await api.put(`/api/tractors/${editId}`, payload);
        showToast(eq("toastUpdated"));
      } else {
        await api.post("/api/tractors", payload);
        showToast(eq("toastAdded"));
      }
      setForm(EMPTY_FORM);
      setEditId(null);
      loadMyEq();
    } catch {
      showToast(eq("toastFailed"), "error");
    } finally {
      setFormLoading(false);
    }
  };

  const startEdit = (item) => {
    setForm({
      registration_number: item.registration_number,
      brand: item.brand,
      model: item.model,
      purchase_year: item.purchase_year,
    });
    setEditId(item.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelEdit = () => { setForm(EMPTY_FORM); setEditId(null); };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/api/tractors/${deleteId}`);
      showToast(eq("toastRemoved"));
      loadMyEq();
    } catch {
      showToast(eq("toastDeleteFailed"), "error");
    } finally {
      setDeleteId(null);
    }
  };

  const equipAge = (year) => {
    if (!year) return null;
    const age = new Date().getFullYear() - Number(year);
    return age === 0 ? eq("new") : `${age} ${age !== 1 ? eq("yrsOld") : eq("yrOld")}`;
  };

  /* ── Catalog filtering ─────────────────────────────────────────────────── */
  const categories = useMemo(
    () => ["All", ...Array.from(new Set(catalog.map((e) => e.category)))],
    [catalog],
  );

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return catalog.filter(
      (e) =>
        (activeCategory === "All" || e.category === activeCategory) &&
        (!q || e.equipment_name.toLowerCase().includes(q) || e.category.toLowerCase().includes(q)),
    );
  }, [catalog, activeCategory, searchQuery]);

  /* ── Offer buy redirect ────────────────────────────────────────────────── */
  const buyNow = (url) => window.open(url, "_blank", "noopener,noreferrer");

  /* ─────────────────────────────────────────────────────────────────────── */
  return (
    <div className="space-y-6">

      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div className="page-header">
        <div className="flex items-center gap-3">
          <div className="stat-icon bg-agro-dark w-10 h-10">
            <Wrench className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="page-title">{eq("title")}</h2>
            <p className="page-subtitle">{eq("subtitle")}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {lastUpdated && (
            <span className="badge badge-neutral text-[11px]">
              {eq("updated")} {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={loadCatalog}
            disabled={catalogLoading}
            className="btn-outline text-xs px-3 py-2"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${catalogLoading ? "animate-spin" : ""}`} />
            {eq("refresh")}
          </button>
        </div>
      </div>

      {/* ── Toast ────────────────────────────────────────────────────────── */}
      {toast && (
        <div className={toast.type === "error" ? "error-box" : "success-box"}>
          {toast.type === "error"
            ? <AlertTriangle className="w-4 h-4 shrink-0" />
            : <CheckCircle2 className="w-4 h-4 shrink-0" />}
          {toast.msg}
        </div>
      )}

      {/* ── Tab switcher ─────────────────────────────────────────────────── */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-2xl w-fit">
        {[
          { key: "catalog", icon: <Package className="w-4 h-4" />, label: eq("tabCatalog") },
          { key: "mine",    icon: <Settings className="w-4 h-4" />, label: eq("tabMine") },
        ].map(({ key, icon, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-150 ${
              tab === key
                ? "bg-white text-agro shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {icon} {label}
          </button>
        ))}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* TAB: CATALOG                                                        */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {tab === "catalog" && (
        <div className="space-y-5">

          {/* Search + category filters */}
          <div className="card p-4 space-y-3">
            <div className="relative">
              <span className="input-icon"><Search className="w-4 h-4" /></span>
              <input
                className="input-with-icon"
                placeholder={eq("searchPlaceholder")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-150 ${
                    activeCategory === cat
                      ? "bg-agro text-white border-agro"
                      : "bg-white text-slate-600 border-slate-200 hover:border-agro hover:text-agro"
                  }`}
                >
                  {cat === "All" ? eq("catAll") : cat}
                </button>
              ))}
            </div>
          </div>

          {/* Loading */}
          {catalogLoading && (
            <div className="card flex items-center justify-center gap-3 py-16 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin text-agro" />
              <span className="text-sm">{eq("loading")}</span>
            </div>
          )}

          {/* Error */}
          {!catalogLoading && catalogError && (
            <div className="error-box">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {catalogError}
            </div>
          )}

          {/* Grid */}
          {!catalogLoading && !catalogError && (
            filtered.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {filtered.map((item) => {
                  const open = expandedId === item.equipment_id;
                  const lowestOffer = item.offers.reduce(
                    (best, o) =>
                      o.price_inr != null && (best === null || o.price_inr < best.price_inr)
                        ? o
                        : best,
                    null,
                  );
                  return (
                    <div key={item.equipment_id} className="card-hover flex flex-col">

                      {/* Image */}
                      <div className="relative rounded-2xl overflow-hidden mb-4 bg-slate-50 h-44">
                        <img
                          src={imgErrors[item.equipment_id] ? FALLBACK_IMG : item.image_url}
                          alt={item.equipment_name}
                          onError={() =>
                            setImgErrors((p) => ({ ...p, [item.equipment_id]: true }))
                          }
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                        <span className={`absolute top-2.5 left-2.5 ${catBadge(item.category)}`}>
                          {item.category}
                        </span>
                        {lowestOffer && (
                          <span className="absolute top-2.5 right-2.5 bg-white/90 backdrop-blur-sm border border-emerald-100 text-emerald-700 rounded-full px-2.5 py-0.5 text-xs font-semibold shadow-sm">
                            {eq("from")} {fmtINR(lowestOffer.price_inr)}
                          </span>
                        )}
                      </div>

                      {/* Name */}
                      <p className="font-bold text-slate-900 text-base leading-snug">
                        {item.equipment_name}
                      </p>

                      {/* Merchant count */}
                      <p className="text-xs text-slate-400 mt-0.5 mb-3">
                        {item.offers.length} {eq("merchantsListed")}
                      </p>

                      {/* Expand toggle */}
                      <button
                        onClick={() => setExpandedId(open ? null : item.equipment_id)}
                        className="btn-ghost w-full justify-center text-xs mb-2"
                      >
                        {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        {open ? eq("hideDetails") : eq("showDetails")}
                      </button>

                      {/* Expanded details */}
                      {open && (
                        <div className="space-y-3 mb-3">

                          {/* Usage methods */}
                          <div>
                            <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-1.5">
                              <Zap className="w-3.5 h-3.5 text-amber-500" /> {eq("usageMethods")}
                            </p>
                            <ul className="space-y-1.5">
                              {item.usage_methods.map((u, i) => (
                                <li key={i} className="flex items-start gap-2 text-xs text-slate-600">
                                  <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-agro shrink-0" />
                                  {u}
                                </li>
                              ))}
                            </ul>
                          </div>

                          {/* Requirements */}
                          <div>
                            <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-1.5">
                              <List className="w-3.5 h-3.5 text-blue-500" /> {eq("requirements")}
                            </p>
                            <ul className="space-y-1.5">
                              {item.requirements.map((r, i) => (
                                <li key={i} className="flex items-start gap-2 text-xs text-slate-600">
                                  <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-blue-400 shrink-0" />
                                  {r}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}

                      {/* Offers / Merchant prices */}
                      <div className="mt-auto pt-3 border-t border-slate-50 space-y-2">
                        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                          {eq("merchantOffers")}
                        </p>
                        {item.offers.map((offer, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between gap-2 bg-slate-50 rounded-xl px-3 py-2"
                          >
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-slate-800 truncate">
                                {offer.merchant}
                              </p>
                              <p className="text-[11px] text-emerald-600 font-medium">
                                {offer.price_text}
                              </p>
                            </div>
                            <button
                              onClick={() => buyNow(offer.product_url)}
                              className="shrink-0 flex items-center gap-1 bg-agro hover:bg-agro-dark text-white rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all duration-150 shadow-sm"
                            >
                              <ShoppingCart className="w-3 h-3" />
                              {eq("buy")}
                              <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                            </button>
                          </div>
                        ))}
                      </div>

                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="card empty-state py-16">
                <Package className="w-12 h-12 mb-3 text-slate-200" />
                <p className="text-sm font-medium text-slate-400">{eq("noResults")}</p>
                <p className="text-xs text-slate-300 mt-1">{eq("noResultsSub")}</p>
              </div>
            )
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* TAB: MY EQUIPMENT                                                   */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {tab === "mine" && (
        <div className="space-y-5">

          {/* Header row */}
          <div className="flex items-center justify-between">
            <div>
              <p className="section-title">{eq("myEquipTitle")}</p>
              <p className="section-subtitle">{eq("myEquipSubtitle")}</p>
            </div>
            <span className="badge badge-info">
              {myEq.length} {eq("registered")}
            </span>
          </div>

          {/* Form */}
          <div className="card">
            <div className="card-header">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {editId ? <Pencil className="w-4 h-4 text-agro" /> : <Plus className="w-4 h-4 text-agro" />}
                  <h3 className="section-title">
                    {editId ? eq("formEdit") : eq("formAdd")}
                  </h3>
                </div>
                {editId && (
                  <button onClick={cancelEdit} className="btn-ghost text-slate-400">
                    <X className="w-4 h-4" /> {eq("cancel")}
                  </button>
                )}
              </div>
              <p className="section-subtitle">{eq("formSub")}</p>
            </div>

            <form onSubmit={submit} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="form-field">
                <label className="label">{eq("regNo")}</label>
                <div className="relative">
                  <span className="input-icon"><Hash className="w-4 h-4" /></span>
                  <input
                    className="input-with-icon"
                    name="registration_number"
                    placeholder="e.g. MH-12-AB-1234"
                    value={form.registration_number}
                    onChange={change}
                    required
                  />
                </div>
              </div>
              <div className="form-field">
                <label className="label">{eq("brand")}</label>
                <div className="relative">
                  <span className="input-icon"><Tag className="w-4 h-4" /></span>
                  <input
                    className="input-with-icon"
                    name="brand"
                    placeholder="e.g. Mahindra"
                    value={form.brand}
                    onChange={change}
                  />
                </div>
              </div>
              <div className="form-field">
                <label className="label">{eq("model")}</label>
                <div className="relative">
                  <span className="input-icon"><Wrench className="w-4 h-4" /></span>
                  <input
                    className="input-with-icon"
                    name="model"
                    placeholder="e.g. 575 DI"
                    value={form.model}
                    onChange={change}
                  />
                </div>
              </div>
              <div className="form-field">
                <label className="label">{eq("purchaseYear")}</label>
                <div className="relative">
                  <span className="input-icon"><Calendar className="w-4 h-4" /></span>
                  <input
                    className="input-with-icon"
                    name="purchase_year"
                    type="number"
                    min="1970"
                    max={new Date().getFullYear()}
                    placeholder="e.g. 2020"
                    value={form.purchase_year}
                    onChange={change}
                  />
                </div>
              </div>

              <div className="sm:col-span-2 lg:col-span-4 flex gap-3">
                <button className="btn" disabled={formLoading}>
                  {formLoading
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : editId
                      ? <CheckCircle2 className="w-4 h-4" />
                      : <Plus className="w-4 h-4" />}
                  {formLoading
                    ? eq("saving")
                    : editId ? eq("updateBtn") : eq("addBtn")}
                </button>
                {editId && (
                  <button type="button" onClick={cancelEdit} className="btn-outline">
                    {eq("cancel")}
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* My equipment list */}
          {myEq.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {myEq.map((item) => (
                <div key={item.id} className="card-hover space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="stat-icon bg-agro-light w-10 h-10 shrink-0">
                        <Wrench className="w-5 h-5 text-agro" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900 truncate">
                          {item.brand || "—"} {item.model || ""}
                        </p>
                        <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                          <Hash className="w-3 h-3" /> {item.registration_number}
                        </p>
                      </div>
                    </div>
                    {item.purchase_year && (
                      <span className="badge badge-neutral shrink-0">
                        <Calendar className="w-3 h-3" /> {item.purchase_year}
                      </span>
                    )}
                  </div>

                  {item.purchase_year && (
                    <div className="text-xs text-slate-400 bg-slate-50 rounded-xl px-3 py-2">
                      {equipAge(item.purchase_year)}
                    </div>
                  )}

                  <div className="flex gap-2 pt-1 border-t border-slate-50">
                    <button onClick={() => startEdit(item)} className="btn-ghost flex-1 justify-center">
                      <Pencil className="w-3.5 h-3.5" /> {eq("edit")}
                    </button>
                    <button
                      onClick={() => setDeleteId(item.id)}
                      className="btn-ghost flex-1 justify-center text-rose-500 hover:text-rose-600 hover:bg-rose-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> {eq("remove")}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="card empty-state py-16">
              <Wrench className="w-12 h-12 mb-3 text-slate-200" />
              <p className="text-sm font-medium text-slate-400">{eq("myEquipEmpty")}</p>
              <p className="text-xs text-slate-300 mt-1">{eq("myEquipEmptySub")}</p>
            </div>
          )}
        </div>
      )}

      {/* ── Delete confirmation modal ────────────────────────────────────── */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-6 w-full max-w-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="stat-icon bg-rose-100 w-10 h-10">
                <Trash2 className="w-5 h-5 text-rose-500" />
              </div>
              <div>
                <p className="font-semibold text-slate-900">{eq("deleteTitle")}</p>
                <p className="text-sm text-slate-500">{eq("deleteBody")}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={confirmDelete} className="btn-danger flex-1 justify-center">
                <Trash2 className="w-4 h-4" /> {eq("remove")}
              </button>
              <button onClick={() => setDeleteId(null)} className="btn-outline flex-1 justify-center">
                {eq("cancel")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
