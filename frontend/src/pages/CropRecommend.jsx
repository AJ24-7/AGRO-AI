import { useEffect, useMemo, useState } from "react";
import api from "../api/axios";
import { useLanguage } from "../context/LanguageContext";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { getCropImageUrl, getLocationLabel } from "../utils/cropImages";
import {
  Leaf,
  FlaskConical,
  Loader2,
  CheckCircle2,
  ChevronRight,
  Info,
  CloudSun,
  Wind,
  Droplets,
  Newspaper,
  ExternalLink,
  LocateFixed,
  MapPin,
  Globe,
  BookOpen,
  Sprout,
  Shield,
  Tractor,
  CloudRain,
} from "lucide-react";

const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1464226184884-fa280b87c399?auto=format&fit=crop&w=1400&q=80";

const NUTRIENT_TIPS = {
  nitrogen: "Supports leaf and stem growth. Typical range: 0–140 kg/ha.",
  phosphorus: "Essential for root development. Typical range: 0–145 kg/ha.",
  potassium: "Improves drought resistance. Typical range: 0–205 kg/ha.",
  ph: "Soil acidity/alkalinity. Ideal crop range: 5.5–7.5.",
};

const TUTORIAL_STAGES = [
  { key: "preparation", icon: Tractor, border: "border-indigo-100", bg: "bg-indigo-50/60", iconColor: "text-indigo-600" },
  { key: "sowing", icon: Sprout, border: "border-emerald-100", bg: "bg-emerald-50/60", iconColor: "text-emerald-600" },
  { key: "irrigation", icon: CloudRain, border: "border-sky-100", bg: "bg-sky-50/60", iconColor: "text-sky-600" },
  { key: "nutrition", icon: FlaskConical, border: "border-amber-100", bg: "bg-amber-50/60", iconColor: "text-amber-600" },
  { key: "protection", icon: Shield, border: "border-rose-100", bg: "bg-rose-50/60", iconColor: "text-rose-600" },
  { key: "harvest", icon: Leaf, border: "border-teal-100", bg: "bg-teal-50/60", iconColor: "text-teal-600" },
  { key: "postHarvest", icon: BookOpen, border: "border-violet-100", bg: "bg-violet-50/60", iconColor: "text-violet-600" },
];

const NutrientField = ({ name, label, placeholder, type = "number", step, onChange, value, tip }) => (
  <div className="form-field">
    <label className="label">{label}</label>
    <div className="input-group relative">
      <input
        className="input"
        name={name}
        type={type}
        step={step}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        required
        min="0"
      />
      <div className="absolute right-3 top-1/2 -translate-y-1/2 group cursor-help">
        <Info className="w-4 h-4 text-slate-300 group-hover:text-agro transition-colors" />
        <div className="absolute right-0 bottom-full mb-2 w-52 bg-slate-900 text-white text-xs rounded-xl p-2.5 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10 leading-relaxed shadow-lg">
          {tip || NUTRIENT_TIPS[name]}
        </div>
      </div>
    </div>
  </div>
);

export default function CropRecommend() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const routeLocation = useLocation();
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState({ nitrogen: "", phosphorus: "", potassium: "", ph: "" });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [locationRecLoading, setLocationRecLoading] = useState(false);
  const [locationRecError, setLocationRecError] = useState(null);
  const [locationRecData, setLocationRecData] = useState(null);
  const [imageFallbackUsed, setImageFallbackUsed] = useState(false);
  const [location, setLocation] = useState({ latitude: null, longitude: null });
  const [selectedCrop, setSelectedCrop] = useState(routeLocation.state?.cropName || searchParams.get("crop") || "");
  const [selectedCropImage, setSelectedCropImage] = useState(routeLocation.state?.cropImageUrl || "");

  const routeLat = Number(searchParams.get("lat"));
  const routeLng = Number(searchParams.get("lng"));

  const activeCropImage = useMemo(() => {
    if (result?.recommended_crop) return result?.crop_image_url || "";
    if (selectedCrop) return selectedCropImage || "";
    return locationRecData?.recommendations?.[0]?.crop_image_url || "";
  }, [result, selectedCrop, selectedCropImage, locationRecData]);

  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const formatNumber = (value, digits = 1) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return "--";
    return numeric.toFixed(digits);
  };

  const prettyDate = (value) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString();
  };

  useEffect(() => {
    const routeCrop = (routeLocation.state?.cropName || searchParams.get("crop") || "").trim();
    const routeImage = routeLocation.state?.cropImageUrl || "";

    if (routeCrop) {
      setSelectedCrop(routeCrop);
      setSelectedCropImage(routeImage);
    }

    if (Number.isFinite(routeLat) && Number.isFinite(routeLng)) {
      setLocation({ latitude: routeLat, longitude: routeLng });
      fetchLocationRecommendations(routeLat, routeLng);
    }
  }, [routeLat, routeLng, routeLocation.state, searchParams]);

  const fetchLocationRecommendations = async (latitude, longitude) => {
    if (latitude === null || longitude === null) return;
    setLocationRecLoading(true);
    setLocationRecError(null);
    try {
      const { data } = await api.get("/api/crop/recommend-by-location", {
        params: { latitude, longitude },
      });
      setLocationRecData(data);
    } catch {
      setLocationRecError(t("cropRecommend.locationRecommendationFailed"));
    } finally {
      setLocationRecLoading(false);
    }
  };

  const addCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError(t("cropRecommend.geolocationUnsupported"));
      return;
    }
    setGeoLoading(true);
    setLocationRecError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;
        setLocation({ latitude, longitude });
        setGeoLoading(false);
        fetchLocationRecommendations(latitude, longitude);
      },
      () => {
        setError(t("cropRecommend.geolocationFailed"));
        setGeoLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    setImageFallbackUsed(false);
    try {
      const payload = Object.fromEntries(Object.entries(form).map(([key, value]) => [key, Number(value)]));
      if (location.latitude !== null && location.longitude !== null) {
        payload.latitude = location.latitude;
        payload.longitude = location.longitude;
      }
      const { data } = await api.post("/api/crop/recommend", payload);
      setResult(data);
      setSelectedCrop(data?.recommended_crop || "");
      setSelectedCropImage(data?.crop_image_url || "");

      if (location.latitude !== null && location.longitude !== null) {
        fetchLocationRecommendations(location.latitude, location.longitude);
      }
    } catch {
      setError(t("cropRecommend.recommendationFailed"));
    } finally {
      setLoading(false);
    }
  };

  const activeCrop = useMemo(() => {
    if (result?.recommended_crop) return result.recommended_crop;
    if (selectedCrop) return selectedCrop;
    const locationFirst = locationRecData?.recommendations?.[0]?.crop;
    return locationFirst || "";
  }, [result, locationRecData, selectedCrop]);

  const tutorialSteps = useMemo(() => {
    if (!activeCrop) return [];
    return TUTORIAL_STAGES.map((stage) => ({
      ...stage,
      title: t(`cropRecommend.tutorialStages.${stage.key}`),
      tip: t(`cropRecommend.tutorialTips.${stage.key}`, { crop: activeCrop }),
    }));
  }, [activeCrop, t]);

  const weatherAdvisory = useMemo(() => {
    const weather = result?.weather || locationRecData?.recommendations?.[0]?.weather;
    if (!weather) return null;

    const temperature = Number(weather.temperature_c);
    const rainfall = Number(weather.precipitation_mm);
    const wind = Number(weather.wind_speed_kph);

    if (Number.isFinite(temperature) && temperature >= 35) {
      return t("cropRecommend.weatherAdvice.hot");
    }
    if (Number.isFinite(rainfall) && rainfall >= 8) {
      return t("cropRecommend.weatherAdvice.rainy");
    }
    if (Number.isFinite(wind) && wind >= 20) {
      return t("cropRecommend.weatherAdvice.windy");
    }
    return t("cropRecommend.weatherAdvice.normal");
  }, [result, locationRecData, t]);

  const webGuides = useMemo(() => {
    if (!activeCrop) return [];

    const encodedCrop = encodeURIComponent(activeCrop);
    const encodedLocation = encodeURIComponent(
      locationRecData?.location
        ? `${formatNumber(locationRecData.location.latitude, 2)}, ${formatNumber(locationRecData.location.longitude, 2)}`
        : "India",
    );

    return [
      {
        id: "package-practices",
        label: t("cropRecommend.webGuides.packageOfPractices"),
        url: `https://www.google.com/search?q=${encodedCrop}+crop+package+of+practices+${encodedLocation}`,
      },
      {
        id: "video-guide",
        label: t("cropRecommend.webGuides.videoGuide"),
        url: `https://www.youtube.com/results?search_query=${encodedCrop}+crop+management+tutorial`,
      },
      {
        id: "agri-news",
        label: t("cropRecommend.webGuides.marketAndPolicy"),
        url: `https://news.google.com/search?q=${encodedCrop}+agriculture+market+price+policy`,
      },
      {
        id: "fao",
        label: t("cropRecommend.webGuides.globalPractices"),
        url: "https://www.fao.org/home/en",
      },
    ];
  }, [activeCrop, locationRecData, t]);

  const confidenceColor = (confidence) => {
    if (confidence >= 80) return "bg-emerald-500";
    if (confidence >= 50) return "bg-amber-400";
    return "bg-rose-400";
  };

  const openCropContext = (item) => {
    const nextParams = new URLSearchParams();
    nextParams.set("crop", item.crop);
    if (Number.isFinite(Number(locationRecData?.location?.latitude))) {
      nextParams.set("lat", String(locationRecData.location.latitude));
    }
    if (Number.isFinite(Number(locationRecData?.location?.longitude))) {
      nextParams.set("lng", String(locationRecData.location.longitude));
    }

    navigate(`/crop?${nextParams.toString()}`, {
      replace: true,
      state: {
        cropName: item.crop,
        cropImageUrl: item.crop_image_url,
        location: locationRecData?.location,
        weather: item.weather,
      },
    });

    setSelectedCrop(item.crop);
    setSelectedCropImage(item.crop_image_url || "");
  };

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div className="flex items-center gap-3">
          <div className="stat-icon bg-agro w-10 h-10">
            <Leaf className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="page-title">{t("cropRecommend.title")}</h2>
            <p className="page-subtitle">{t("cropRecommend.subtitle")}</p>
          </div>
        </div>
      </div>

      {(selectedCrop || result?.recommended_crop || locationRecData?.recommendations?.length) && (
        <div className="card border-agro/20 bg-gradient-to-r from-agro-light/40 to-white">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
            <div className="w-full lg:w-56 shrink-0 overflow-hidden rounded-2xl border border-white/70 bg-slate-100 shadow-sm">
              <img
                src={getCropImageUrl(activeCrop, activeCropImage, FALLBACK_IMAGE)}
                alt={`${activeCrop || "crop"} crop`}
                className="h-40 w-full object-cover"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = getCropImageUrl(activeCrop, "", FALLBACK_IMAGE);
                }}
                decoding="async"
              />
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-agro-dark/70">{t("cropRecommend.connectedView")}</p>
              <h3 className="text-xl font-bold text-slate-900 capitalize">{activeCrop || t("cropRecommend.noResultTitle")}</h3>
              <p className="text-sm text-slate-600">
                {location.latitude !== null && location.longitude !== null
                  ? `${t("cropRecommend.locationLinked")} ${formatNumber(location.latitude, 4)}, ${formatNumber(location.longitude, 4)}`
                  : t("cropRecommend.linkLocation")}
              </p>
              {getLocationLabel(locationRecData?.location) && (
                <p className="text-xs text-slate-500 line-clamp-2">{getLocationLabel(locationRecData.location)}</p>
              )}
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  className="btn-sm"
                  onClick={() => {
                    setSelectedCrop(result?.recommended_crop || selectedCrop);
                    setSelectedCropImage(result?.crop_image_url || selectedCropImage || "");
                  }}
                >
                  {t("cropRecommend.focusCurrentCrop")}
                </button>
                <button type="button" className="btn-sm btn-outline" onClick={addCurrentLocation}>
                  {t("cropRecommend.currentLocation")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card">
          <div className="card-header">
            <div className="flex items-center gap-2">
              <FlaskConical className="w-4 h-4 text-agro" />
              <h3 className="section-title">{t("cropRecommend.nutrientInputs")}</h3>
            </div>
            <p className="section-subtitle">{t("cropRecommend.nutrientInputsSub")}</p>
          </div>

          {error && (
            <div className="error-box mb-4">
              <Info className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={submit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <NutrientField name="nitrogen" label={t("cropRecommend.nitrogen")} placeholder="e.g. 90" value={form.nitrogen} onChange={change} tip={t("cropRecommend.tips.nitrogen")} />
            <NutrientField name="phosphorus" label={t("cropRecommend.phosphorus")} placeholder="e.g. 42" value={form.phosphorus} onChange={change} tip={t("cropRecommend.tips.phosphorus")} />
            <NutrientField name="potassium" label={t("cropRecommend.potassium")} placeholder="e.g. 43" value={form.potassium} onChange={change} tip={t("cropRecommend.tips.potassium")} />
            <NutrientField name="ph" label={t("cropRecommend.ph")} placeholder="e.g. 6.5" step="0.1" value={form.ph} onChange={change} tip={t("cropRecommend.tips.ph")} />

            <div className="sm:col-span-2 rounded-2xl border border-gray-100 bg-slate-50 p-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
              <div className="flex items-center gap-2 min-w-0">
                <MapPin className="w-3.5 h-3.5 text-agro shrink-0" />
                {location.latitude !== null && location.longitude !== null ? (
                  <span className="truncate">{t("cropRecommend.locationLinked")} {formatNumber(location.latitude, 4)}, {formatNumber(location.longitude, 4)}</span>
                ) : (
                  <span>{t("cropRecommend.linkLocation")}</span>
                )}
              </div>
              <button type="button" onClick={addCurrentLocation} className="btn-sm btn-outline" disabled={geoLoading}>
                {geoLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LocateFixed className="w-3.5 h-3.5" />}
                {geoLoading ? t("cropRecommend.locating") : t("cropRecommend.currentLocation")}
              </button>
            </div>

            {(locationRecLoading || locationRecError || (Array.isArray(locationRecData?.recommendations) && locationRecData.recommendations.length > 0)) && (
              <div className="sm:col-span-2 rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4 space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 flex items-center gap-1.5">
                    <LocateFixed className="w-3.5 h-3.5" /> {t("cropRecommend.locationBasedTitle")}
                  </p>
                  {location.latitude !== null && location.longitude !== null && (
                    <button
                      type="button"
                      onClick={() => fetchLocationRecommendations(location.latitude, location.longitude)}
                      className="btn-sm btn-outline"
                      disabled={locationRecLoading}
                    >
                      {locationRecLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Globe className="w-3.5 h-3.5" />}
                      {locationRecLoading ? t("cropRecommend.refreshingLocationBased") : t("cropRecommend.refreshLocationBased")}
                    </button>
                  )}
                </div>

                <p className="text-xs text-slate-600">{t("cropRecommend.locationBasedSub")}</p>

                {locationRecError && <p className="text-xs text-rose-600 font-medium">{locationRecError}</p>}

                {Array.isArray(locationRecData?.recommendations) && locationRecData.recommendations.length > 0 && (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {locationRecData.recommendations.slice(0, 4).map((item) => (
                      <button
                        type="button"
                        key={item.crop}
                        onClick={() => openCropContext(item)}
                        className="rounded-xl border border-emerald-100 bg-white px-3 py-2 text-left transition hover:border-agro/30 hover:shadow-sm"
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={getCropImageUrl(item.crop, item.crop_image_url, FALLBACK_IMAGE)}
                            alt={`${item.crop} crop`}
                            className="h-12 w-12 shrink-0 rounded-lg object-cover"
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.src = getCropImageUrl(item.crop, "", FALLBACK_IMAGE);
                            }}
                            decoding="async"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-slate-800 capitalize">{item.crop}</p>
                            <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{item.reason}</p>
                          </div>
                        </div>
                        <div className="mt-2 flex items-center justify-between gap-2">
                          <span className="text-[11px] text-slate-500">{t("cropRecommend.openConnectedCrop")}</span>
                          <ExternalLink className="w-3 h-3 text-slate-400" />
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <button className="btn sm:col-span-2" disabled={loading}>
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> {t("cropRecommend.analyzing")}</>
              ) : (
                <><Leaf className="w-4 h-4" /> {t("cropRecommend.getRecommendation")}</>
              )}
            </button>
          </form>
        </div>

        {result || activeCrop ? (
          <div className="card border-agro-accent/30 bg-gradient-to-b from-agro-light/30 to-white">
            <div className="card-header">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-agro" />
                <h3 className="section-title">{result ? t("cropRecommend.recommendationResult") : t("cropRecommend.locationBasedTitle")}</h3>
              </div>
              <p className="section-subtitle">{result ? t("cropRecommend.recommendationResultSub") : t("cropRecommend.locationBasedSub")}</p>
            </div>

            <div className="flex flex-col items-start gap-5">
              {result?.recommended_crop && (
                <div className="w-full rounded-2xl overflow-hidden border border-slate-100 bg-slate-50">
                  <img
                    src={getCropImageUrl(result.recommended_crop, imageFallbackUsed ? "" : result.crop_image_url, FALLBACK_IMAGE)}
                    alt={`${result.recommended_crop} crop`}
                    className="w-full h-52 object-cover"
                    onError={() => setImageFallbackUsed(true)}
                    decoding="async"
                  />
                </div>
              )}

              {result && (
                <div className="flex items-center gap-3 bg-agro/5 border border-agro/20 rounded-2xl px-4 py-3 w-full">
                  <div className="stat-icon bg-agro w-10 h-10 shrink-0">
                    <Leaf className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wide">{t("cropRecommend.recommendedCrop")}</p>
                    <p className="text-2xl font-bold text-agro-dark capitalize">{result.recommended_crop}</p>
                  </div>
                </div>
              )}

              {result && (
                <div className="w-full space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-600 font-medium">{t("cropRecommend.modelConfidence")}</span>
                    <span className={`font-bold ${result.confidence >= 80 ? "text-emerald-600" : result.confidence >= 50 ? "text-amber-600" : "text-rose-500"}`}>
                      {result.confidence}%
                    </span>
                  </div>
                  <div className="confidence-bar">
                    <div className={`h-full rounded-full transition-all duration-700 ease-out ${confidenceColor(result.confidence)}`} style={{ width: `${result.confidence}%` }} />
                  </div>
                </div>
              )}

              {result && (
                <div className="w-full grid grid-cols-2 gap-2">
                  {[
                    { label: "N", value: form.nitrogen, color: "bg-blue-100 text-blue-800" },
                    { label: "P", value: form.phosphorus, color: "bg-orange-100 text-orange-800" },
                    { label: "K", value: form.potassium, color: "bg-purple-100 text-purple-800" },
                    { label: "pH", value: form.ph, color: "bg-teal-100 text-teal-800" },
                  ].map(({ label, value, color }) => (
                    <div key={label} className={`flex items-center justify-between rounded-xl px-3 py-2 text-sm font-medium ${color}`}>
                      <span>{label}</span>
                      <span>{value}</span>
                    </div>
                  ))}
                </div>
              )}

              {result && (
                <div className="w-full rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                  <p>{t("cropRecommend.locationSource")} {result.location_source === "current" ? t("cropRecommend.currentDeviceLocation") : result.location_source === "saved_farm" ? t("cropRecommend.savedFarmLocation") : t("cropRecommend.notAvailable")}</p>
                  {result.location?.latitude !== undefined && result.location?.longitude !== undefined && (
                    <p className="mt-1 text-slate-500">{formatNumber(result.location.latitude, 4)}, {formatNumber(result.location.longitude, 4)}</p>
                  )}
                  {result.location?.location_label && <p className="mt-1 text-slate-500 line-clamp-2">{result.location.location_label}</p>}
                </div>
              )}

              {result?.weather && (
                <div className="w-full rounded-2xl border border-sky-100 bg-sky-50/60 p-4 space-y-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-sky-700 flex items-center gap-1.5">
                    <CloudSun className="w-3.5 h-3.5" /> {t("cropRecommend.liveWeather")}
                  </p>
                  <p className="text-sm font-semibold text-slate-800">{result.weather.weather_summary || t("cropRecommend.currentWeather")}</p>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="rounded-xl bg-white px-3 py-2 border border-sky-100">
                      <p className="text-slate-500">{t("cropRecommend.temp")}</p>
                      <p className="font-semibold text-slate-800 mt-1">{formatNumber(result.weather.temperature_c)} C</p>
                    </div>
                    <div className="rounded-xl bg-white px-3 py-2 border border-sky-100">
                      <p className="text-slate-500 flex items-center gap-1"><Wind className="w-3 h-3" />{t("cropRecommend.wind")}</p>
                      <p className="font-semibold text-slate-800 mt-1">{formatNumber(result.weather.wind_speed_kph)} km/h</p>
                    </div>
                    <div className="rounded-xl bg-white px-3 py-2 border border-sky-100">
                      <p className="text-slate-500 flex items-center gap-1"><Droplets className="w-3 h-3" />{t("cropRecommend.rain")}</p>
                      <p className="font-semibold text-slate-800 mt-1">{formatNumber(result.weather.precipitation_mm)} mm</p>
                    </div>
                  </div>
                </div>
              )}

              {Array.isArray(result?.news) && result.news.length > 0 && (
                <div className="w-full space-y-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500 flex items-center gap-1.5">
                    <Newspaper className="w-3.5 h-3.5" /> {t("cropRecommend.latestCropNews")}
                  </p>
                  <div className="space-y-2">
                    {result.news.map((item) => (
                      <a key={`${item.title}-${item.link}`} href={item.link} target="_blank" rel="noreferrer" className="block rounded-xl border border-slate-100 bg-white px-3 py-2 hover:border-agro-accent/40 transition-colors">
                        <p className="text-sm font-medium text-slate-800 line-clamp-2">{item.title}</p>
                        <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">{prettyDate(item.published_at)} <ExternalLink className="w-3 h-3" /></p>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {activeCrop && (
                <div className="w-full rounded-2xl border border-slate-100 bg-white p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-600 flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5" /> {t("cropRecommend.managementTutorialTitle")}
                    </p>
                    <span className="text-xs rounded-full bg-agro/10 text-agro-dark px-2.5 py-1 font-medium capitalize">
                      {t("cropRecommend.forCrop", { crop: activeCrop })}
                    </span>
                  </div>

                  <p className="text-xs text-slate-500">{t("cropRecommend.managementTutorialSub")}</p>

                  {weatherAdvisory && (
                    <div className="rounded-xl border border-amber-100 bg-amber-50/70 px-3 py-2 text-xs text-amber-800">
                      {weatherAdvisory}
                    </div>
                  )}

                  <div className="grid gap-2 sm:grid-cols-2">
                    {tutorialSteps.map((step) => {
                      const StepIcon = step.icon;
                      return (
                        <div key={step.key} className={`rounded-xl border ${step.border} ${step.bg} p-3`}>
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-600 flex items-center gap-1.5">
                            <StepIcon className={`w-3.5 h-3.5 ${step.iconColor}`} /> {step.title}
                          </p>
                          <p className="text-sm text-slate-700 mt-1.5 leading-relaxed">{step.tip}</p>
                        </div>
                      );
                    })}
                  </div>

                  <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">{t("cropRecommend.webGuidesTitle")}</p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {webGuides.map((guide) => (
                        <a
                          key={guide.id}
                          href={guide.url}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:border-agro-accent/50 transition-colors inline-flex items-center justify-between gap-2"
                        >
                          <span>{guide.label}</span>
                          <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <button
                onClick={() => {
                  setResult(null);
                  setLocationRecData(null);
                  setForm({ nitrogen: "", phosphorus: "", potassium: "", ph: "" });
                }}
                className="btn-ghost w-full justify-center"
              >
                <ChevronRight className="w-4 h-4" /> {t("cropRecommend.newRecommendation")}
              </button>
            </div>
          </div>
        ) : (
          <div className="card flex flex-col items-center justify-center py-16 text-center border-dashed border-2 border-slate-100">
            <Leaf className="w-12 h-12 text-slate-200 mb-3" />
            <p className="text-sm font-medium text-slate-400">{t("cropRecommend.noResultTitle")}</p>
            <p className="text-xs text-slate-300 mt-1">{t("cropRecommend.noResultSub")}</p>
          </div>
        )}
      </div>
    </div>
  );
}
