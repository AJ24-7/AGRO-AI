import { useEffect, useState } from "react";
import api from "../api/axios";
import { useLanguage } from "../context/LanguageContext";
import { useNavigate } from "react-router-dom";
import { getCropImageUrl, getLocationLabel } from "../utils/cropImages";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import {
  Home, LayoutGrid, Tractor, FlaskConical, ShieldAlert,
  TrendingUp, Activity, Leaf, RefreshCw, Newspaper, CloudSun, ExternalLink,
} from "lucide-react";

const COLORS = ["#2e7d32", "#66bb6a", "#a5d6a7", "#81c784", "#388e3c"];
const EMPTY_SUMMARY = {
  total_farms: 0,
  total_plots: 0,
  total_tractors: 0,
  soil_reports: 0,
  disease_detections: 0,
  crop_chart: [],
  disease_chart: [],
};

const EMPTY_FEED = { crops: [] };
const FEED_FALLBACK_IMAGE = "https://images.unsplash.com/photo-1464226184884-fa280b87c399?auto=format&fit=crop&w=1400&q=80";

const StatCard = ({ title, value, icon: Icon, bg, trend }) => (
  <div className="stat-card">
    <div className={`stat-icon ${bg}`}>
      <Icon className="w-6 h-6 text-white" />
    </div>
    <div className="min-w-0">
      <p className="stat-label">{title}</p>
      <p className="stat-value">{value ?? "—"}</p>
      {trend && <p className="stat-trend text-emerald-600">{trend}</p>}
    </div>
  </div>
);

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-lg px-4 py-3 text-sm">
      <p className="font-semibold text-slate-800 mb-1">{label}</p>
      <p className="text-agro">{payload[0].value} entries</p>
    </div>
  );
};

export default function Dashboard() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [feed, setFeed] = useState(EMPTY_FEED);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const [summaryResponse, feedResponse] = await Promise.all([
        api.get("/api/analytics/summary"),
        api.get("/api/crop/dashboard-feed"),
      ]);
      setData(summaryResponse.data || EMPTY_SUMMARY);
      setFeed(feedResponse.data || EMPTY_FEED);
      setError("");
    } catch {
      setData(EMPTY_SUMMARY);
      setFeed(EMPTY_FEED);
      setError(t("dashboard.backendError"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, []);

  const summary = data || EMPTY_SUMMARY;
  const cropFeed = feed?.crops || [];

  const openCropTab = (item) => {
    const latitude = item?.location?.latitude;
    const longitude = item?.location?.longitude;
    const params = new URLSearchParams();
    if (item?.crop_name) params.set("crop", item.crop_name);
    if (Number.isFinite(Number(latitude))) params.set("lat", String(latitude));
    if (Number.isFinite(Number(longitude))) params.set("lng", String(longitude));

    navigate(`/crop${params.toString() ? `?${params.toString()}` : ""}`, {
      state: {
        cropName: item?.crop_name,
        cropImageUrl: getCropImageUrl(item?.crop_name, item?.crop_image_url, FEED_FALLBACK_IMAGE),
        location: item?.location,
        weather: item?.weather,
      },
    });
  };

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <div className="flex flex-col items-center gap-3 text-slate-400">
        <RefreshCw className="w-8 h-8 animate-spin text-agro" />
        <p className="text-sm">{t("common.loading")}</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <div>
          <h2 className="page-title">{t("dashboard.title")}</h2>
          <p className="page-subtitle">{t("dashboard.subtitle")}</p>
        </div>
        <button onClick={() => load(true)} className="btn-outline" disabled={refreshing}>
          <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          {t("dashboard.refresh")}
        </button>
      </div>

      {error && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {error}
        </div>
      )}

      {/* Hero banner */}
      <div className="dashboard-hero">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <span className="badge badge-info">
              <Activity className="w-3 h-3" /> {t("dashboard.liveData")}
            </span>
            <h2 className="text-2xl font-bold text-slate-900">{t("dashboard.overviewTitle")}</h2>
            <p className="text-slate-500 text-sm max-w-xl">{t("dashboard.overviewText")}</p>
          </div>
          <div className="dashboard-summary">
            <div className="dashboard-summary-card text-center">
              <p className="stat-label">{t("dashboard.activeFarms")}</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{summary.total_farms}</p>
            </div>
            <div className="dashboard-summary-card text-center">
              <p className="stat-label">{t("dashboard.cropTypes")}</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{summary.crop_chart.length}</p>
            </div>
            <div className="dashboard-summary-card text-center">
              <p className="stat-label">{t("dashboard.diseaseAlerts")}</p>
              <p className="text-2xl font-bold text-rose-600 mt-1">{summary.disease_detections}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        <StatCard title={t("dashboard.farms")} value={summary.total_farms} icon={Home} bg="bg-agro" />
        <StatCard title={t("dashboard.plots")} value={summary.total_plots} icon={LayoutGrid} bg="bg-agro-dark" />
        <StatCard title={t("dashboard.tractors")} value={summary.total_tractors} icon={Tractor} bg="bg-agro-accent" />
        <StatCard title={t("dashboard.soilReports")} value={summary.soil_reports} icon={FlaskConical} bg="bg-slate-700" />
        <StatCard title={t("dashboard.diseaseAlertsCard")} value={summary.disease_detections} icon={ShieldAlert} bg="bg-rose-500" />
      </div>

      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-2">
            <Newspaper className="w-4 h-4 text-agro" />
            <h3 className="section-title">{t("dashboard.cropFeed")}</h3>
          </div>
          <p className="section-subtitle">{t("dashboard.cropFeedSub")}</p>
        </div>

        {cropFeed.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {cropFeed.map((item) => (
              <div key={item.crop_name} className="rounded-2xl border border-slate-100 overflow-hidden bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
                <img
                  src={getCropImageUrl(item.crop_name, item.crop_image_url, FEED_FALLBACK_IMAGE)}
                  alt={`${item.crop_name} crop`}
                  className="h-36 w-full object-cover"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = getCropImageUrl(item.crop_name, "", FEED_FALLBACK_IMAGE);
                  }}
                  decoding="async"
                />
                <div className="p-3 space-y-2">
                  <p className="font-semibold text-slate-900 capitalize">{item.crop_name}</p>
                  {item.location?.state && (
                    <p className="text-[11px] text-slate-500">{t("dashboard.localTo")} {item.location.state}{item.location.country ? `, ${item.location.country}` : ""}</p>
                  )}
                  {!item.location?.state && getLocationLabel(item.location) && (
                    <p className="text-[11px] text-slate-500 line-clamp-2">{getLocationLabel(item.location)}</p>
                  )}
                  {item.weather && (
                    <div className="rounded-xl bg-sky-50 border border-sky-100 p-2.5">
                      <p className="text-xs font-medium uppercase tracking-wide text-sky-700 flex items-center gap-1">
                        <CloudSun className="w-3 h-3" /> {t("dashboard.weather")}
                      </p>
                      <p className="text-xs text-slate-700 mt-1">{item.weather.weather_summary || t("dashboard.weatherAvailable")}</p>
                      <p className="text-xs text-slate-500 mt-1">{Number.isFinite(Number(item.weather.temperature_c)) ? Number(item.weather.temperature_c).toFixed(1) : "--"} C</p>
                    </div>
                  )}

                  {Array.isArray(item.news) && item.news.length > 0 ? (
                    <a
                      href={item.news[0].link}
                      target="_blank"
                      rel="noreferrer"
                      className="block rounded-xl border border-slate-100 bg-slate-50 px-2.5 py-2 hover:border-agro-accent/40 transition-colors"
                    >
                      <p className="text-[12px] text-slate-700 line-clamp-2">{item.news[0].title}</p>
                      <p className="text-[11px] text-slate-500 mt-1 inline-flex items-center gap-1">{t("dashboard.readArticle")} <ExternalLink className="w-3 h-3" /></p>
                    </a>
                  ) : (
                    <p className="text-xs text-slate-400">{t("dashboard.noLatestNews")}</p>
                  )}

                  <button
                    type="button"
                    onClick={() => openCropTab(item)}
                    className="mt-1 inline-flex w-full items-center justify-center rounded-xl border border-agro/20 bg-agro/5 px-3 py-2 text-xs font-medium text-agro-dark transition hover:border-agro/40 hover:bg-agro/10"
                  >
                    {t("dashboard.openCropTab")}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state h-44">
            <Leaf className="w-10 h-10 mb-2 text-slate-300" />
            <p className="text-sm">{t("dashboard.noCropFeed")}</p>
          </div>
        )}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="card-header">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-agro" />
              <h3 className="section-title">{t("dashboard.cropRecommendations")}</h3>
            </div>
            <p className="section-subtitle">{t("dashboard.cropRecommendationsSub")}</p>
          </div>
          {summary.crop_chart.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={summary.crop_chart} barCategoryGap="35%">
                <XAxis dataKey="name" stroke="#94a3b8" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis allowDecimals={false} stroke="#94a3b8" tickLine={false} axisLine={false} fontSize={12} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" fill="#2e7d32" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state h-48">
              <Leaf className="w-10 h-10 mb-2 text-slate-300" />
              <p className="text-sm">{t("dashboard.noCropData")}</p>
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-header">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-500" />
              <h3 className="section-title">{t("dashboard.diseaseDistribution")}</h3>
            </div>
            <p className="section-subtitle">{t("dashboard.diseaseDistributionSub")}</p>
          </div>
          {summary.disease_chart.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={summary.disease_chart}
                  dataKey="count"
                  nameKey="name"
                  cx="50%"
                  cy="45%"
                  outerRadius={90}
                  innerRadius={40}
                  paddingAngle={3}
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  labelLine={false}
                >
                  {summary.disease_chart.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Legend verticalAlign="bottom" height={36} iconType="circle" iconSize={8} />
                <Tooltip contentStyle={{ borderRadius: "1rem", borderColor: "#d1d5db", fontSize: 13 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state h-48">
              <ShieldAlert className="w-10 h-10 mb-2 text-slate-300" />
              <p className="text-sm">{t("dashboard.noDiseaseData")}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
