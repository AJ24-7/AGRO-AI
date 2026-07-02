import { useEffect, useMemo, useState } from "react";
import api from "../api/axios";
import "leaflet/dist/leaflet.css";
import {
  MapContainer,
  TileLayer,
  Polygon,
  Polyline,
  CircleMarker,
  Tooltip as MapTooltip,
  useMap,
  useMapEvents,
} from "react-leaflet";
import {
  Home,
  Plus,
  Pencil,
  Trash2,
  MapPin,
  Ruler,
  CheckCircle2,
  X,
  Loader2,
  AlertTriangle,
  Crosshair,
  LocateFixed,
  Trash,
  SunMedium,
  CloudSun,
  Wind,
  Droplets,
  Sparkles,
  Map,
  Navigation,
  Target,
} from "lucide-react";

const EMPTY_FORM = {
  farm_name: "",
  farm_area: "",
  location: "",
  latitude: "",
  longitude: "",
  boundary_points: [],
};

const DEFAULT_CENTER = [22.9734, 78.6569];

function calculatePolygonAreaAcres(points) {
  if (!points || points.length < 3) return null;

  const earthRadius = 6371008.8;
  const avgLat = points.reduce((sum, point) => sum + point.lat, 0) / points.length;
  const refLat = (avgLat * Math.PI) / 180;
  const xValues = points.map((point) => ((point.lng * Math.PI) / 180) * Math.cos(refLat) * earthRadius);
  const yValues = points.map((point) => ((point.lat * Math.PI) / 180) * earthRadius);

  let area = 0;
  for (let index = 0; index < points.length; index += 1) {
    const nextIndex = (index + 1) % points.length;
    area += xValues[index] * yValues[nextIndex] - xValues[nextIndex] * yValues[index];
  }

  return Math.round((Math.abs(area) / 2 / 4046.8564224) * 100) / 100;
}

function getCentroid(points) {
  if (!points || points.length === 0) return null;
  const centroid = points.reduce(
    (accumulator, point) => ({
      lat: accumulator.lat + point.lat / points.length,
      lng: accumulator.lng + point.lng / points.length,
    }),
    { lat: 0, lng: 0 },
  );
  return centroid;
}

function normalizeBoundaryPoints(points) {
  return (points || [])
    .map((point) => ({
      lat: Number(point.lat),
      lng: Number(point.lng),
    }))
    .filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lng));
}

function formatArea(value) {
  if (value === null || value === undefined || value === "") return "—";
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "—";
  return `${numeric.toFixed(2)} ac`;
}

function formatNumber(value, digits = 2) {
  if (value === null || value === undefined || value === "") return "—";
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "—";
  return numeric.toFixed(digits);
}

function getCardCenter(farm) {
  const points = normalizeBoundaryPoints(farm.boundary_points);
  const centroid = getCentroid(points);
  if (centroid) return [centroid.lat, centroid.lng];
  if (Number.isFinite(Number(farm.latitude)) && Number.isFinite(Number(farm.longitude))) {
    return [Number(farm.latitude), Number(farm.longitude)];
  }
  return DEFAULT_CENTER;
}

function insightFromFarm(farm) {
  return {
    latitude: farm.latitude ?? null,
    longitude: farm.longitude ?? null,
    boundary_points: normalizeBoundaryPoints(farm.boundary_points),
    calculated_area: farm.calculated_area ?? null,
    country: farm.country ?? null,
    state: farm.state ?? null,
    location_label: farm.location_label ?? farm.location ?? null,
    weather_summary: farm.weather_summary ?? null,
    weather_code: farm.weather_code ?? null,
    temperature_c: farm.temperature_c ?? null,
    precipitation_mm: farm.precipitation_mm ?? null,
    wind_speed_kph: farm.wind_speed_kph ?? null,
    recommended_crops: farm.recommended_crops ?? [],
  };
}

function MapCenterController({ center }) {
  const map = useMap();

  useEffect(() => {
    map.setView(center, map.getZoom(), { animate: true });
  }, [center, map]);

  return null;
}

function MapClickHandler({ onAddPoint }) {
  useMapEvents({
    click(event) {
      onAddPoint({ lat: event.latlng.lat, lng: event.latlng.lng });
    },
  });

  return null;
}

function FarmMap({ center, boundaryPoints, onAddPoint, onCurrentLocation, onUndo, onClear }) {
  const polygonPositions = useMemo(() => boundaryPoints.map((point) => [point.lat, point.lng]), [boundaryPoints]);

  return (
    <div className="card h-full overflow-hidden">
      <div className="card-header">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Map className="w-4 h-4 text-agro" />
            <h3 className="section-title">Mark farm on the map</h3>
          </div>
          <span className="badge badge-info">{boundaryPoints.length} point{boundaryPoints.length === 1 ? "" : "s"}</span>
        </div>
        <p className="section-subtitle">Click around the farm boundary to calculate area and get location-based crop advice.</p>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <button type="button" onClick={onCurrentLocation} className="btn-sm btn-outline">
          <LocateFixed className="w-3.5 h-3.5" /> Use current location
        </button>
        <button type="button" onClick={onUndo} className="btn-sm btn-outline" disabled={boundaryPoints.length === 0}>
          <Navigation className="w-3.5 h-3.5" /> Undo point
        </button>
        <button type="button" onClick={onClear} className="btn-sm btn-outline" disabled={boundaryPoints.length === 0}>
          <Trash className="w-3.5 h-3.5" /> Clear boundary
        </button>
      </div>

      <div className="rounded-[1.75rem] overflow-hidden border border-gray-100 bg-slate-50">
        <MapContainer center={center} zoom={14} scrollWheelZoom className="h-[26rem] w-full">
          <MapCenterController center={center} />
          <MapClickHandler onAddPoint={onAddPoint} />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {polygonPositions.length >= 2 && (
            <Polyline positions={polygonPositions} pathOptions={{ color: "#2e7d32", weight: 3, dashArray: "8 8" }} />
          )}
          {polygonPositions.length >= 3 && (
            <Polygon positions={polygonPositions} pathOptions={{ color: "#2e7d32", fillColor: "#2e7d32", fillOpacity: 0.16, weight: 2 }} />
          )}
          {boundaryPoints.map((point, index) => (
            <CircleMarker
              key={`${point.lat}-${point.lng}-${index}`}
              center={[point.lat, point.lng]}
              radius={8}
              pathOptions={{ color: "#166534", fillColor: "#86efac", fillOpacity: 0.95, weight: 2 }}
            >
              <MapTooltip direction="top" offset={[0, -6]} permanent>
                {index + 1}
              </MapTooltip>
            </CircleMarker>
          ))}
          {boundaryPoints.length === 0 && (
            <CircleMarker
              center={center}
              radius={7}
              pathOptions={{ color: "#2e7d32", fillColor: "#dcfce7", fillOpacity: 0.9, weight: 2 }}
            >
              <MapTooltip direction="top" offset={[0, -6]} permanent>
                Anchor
              </MapTooltip>
            </CircleMarker>
          )}
        </MapContainer>
      </div>
    </div>
  );
}

function LocationInsight({ insight, loading, error }) {
  const recommendations = insight?.recommended_crops || [];

  return (
    <div className="card h-full">
      <div className="card-header">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-agro" />
          <h3 className="section-title">Location intelligence</h3>
        </div>
        <p className="section-subtitle">Country, state, weather, auto area, and crop picks from the selected coordinates.</p>
      </div>

      {loading ? (
        <div className="empty-state py-10">
          <Loader2 className="w-8 h-8 animate-spin text-agro" />
          <p className="text-sm mt-2">Analyzing location…</p>
        </div>
      ) : error ? (
        <div className="error-box">{error}</div>
      ) : insight?.latitude && insight?.longitude ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-2xl border border-gray-100 bg-slate-50 p-4">
              <p className="stat-label">Coordinates</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{formatNumber(insight.latitude, 5)}, {formatNumber(insight.longitude, 5)}</p>
            </div>
            <div className="rounded-2xl border border-gray-100 bg-slate-50 p-4">
              <p className="stat-label">Auto area</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{formatArea(insight.calculated_area)}</p>
            </div>
            <div className="rounded-2xl border border-gray-100 bg-slate-50 p-4">
              <p className="stat-label">Country / State</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{insight.country || "—"}</p>
              <p className="text-xs text-slate-500 mt-1">{insight.state || "State not resolved yet"}</p>
            </div>
            <div className="rounded-2xl border border-gray-100 bg-slate-50 p-4">
              <p className="stat-label">Weather</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{insight.weather_summary || "Weather data unavailable"}</p>
            </div>
          </div>

          <div>
            <p className="section-title mb-2">Recommended crops</p>
            {recommendations.length > 0 ? (
              <div className="space-y-2">
                {recommendations.map((item) => (
                  <div key={item.crop} className="rounded-2xl border border-gray-100 bg-white px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-900">{item.crop}</p>
                        <p className="text-xs text-slate-500 mt-1">{item.reason}</p>
                      </div>
                      <span className="badge badge-info shrink-0">Top pick</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state py-8">
                <Target className="w-8 h-8 text-slate-300" />
                <p className="text-sm mt-2">No crop recommendations yet</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="empty-state py-10">
          <Crosshair className="w-8 h-8 text-slate-300" />
          <p className="text-sm mt-2">Pick a location on the map to start the analysis.</p>
        </div>
      )}
    </div>
  );
}

export default function Farms() {
  const [farms, setFarms] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [toast, setToast] = useState(null);
  const [insight, setInsight] = useState(null);
  const [insightLoading, setInsightLoading] = useState(false);
  const [insightError, setInsightError] = useState("");
  const [mapCenter, setMapCenter] = useState(DEFAULT_CENTER);

  const load = async () => {
    const response = await api.get("/api/farms");
    setFarms(response.data || []);
  };

  useEffect(() => {
    load().catch(() => setFarms([]));
  }, []);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    window.setTimeout(() => setToast(null), 3000);
  };

  const hasCoordinates = form.latitude !== "" && form.latitude !== null && form.latitude !== undefined && form.longitude !== "" && form.longitude !== null && form.longitude !== undefined;
  const boundarySignature = JSON.stringify(form.boundary_points || []);

  useEffect(() => {
    let active = true;
    if (!hasCoordinates) {
      setInsight(null);
      setInsightError("");
      setInsightLoading(false);
      return undefined;
    }

    setInsightLoading(true);
    const timeout = window.setTimeout(async () => {
      try {
        const response = await api.post("/api/farms/location-insight", {
          latitude: Number(form.latitude),
          longitude: Number(form.longitude),
          boundary_points: form.boundary_points,
        });
        if (!active) return;
        setInsight(response.data);
        setInsightError("");
        if (response.data?.location_label) {
          setForm((current) => ({
            ...current,
            location: response.data.location_label,
          }));
        }
      } catch {
        if (!active) return;
        setInsightError("Location preview is unavailable right now. You can still save the farm.");
      } finally {
        if (active) setInsightLoading(false);
      }
    }, 450);

    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, [hasCoordinates, form.latitude, form.longitude, boundarySignature]);

  const syncGeometry = (nextPoints) => {
    const normalizedPoints = normalizeBoundaryPoints(nextPoints);
    const centroid = getCentroid(normalizedPoints);
    const calculatedArea = calculatePolygonAreaAcres(normalizedPoints);

    setForm((current) => ({
      ...current,
      boundary_points: normalizedPoints,
      latitude: centroid ? centroid.lat : current.latitude,
      longitude: centroid ? centroid.lng : current.longitude,
      farm_area: calculatedArea ?? current.farm_area,
    }));

    if (centroid) {
      setMapCenter([centroid.lat, centroid.lng]);
    }
  };

  const change = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const setCurrentLocation = () => {
    if (!navigator.geolocation) {
      showToast("Browser geolocation is not available.", "error");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;
        setForm((current) => ({ ...current, latitude, longitude }));
        setMapCenter([latitude, longitude]);
        showToast("Current location added. Mark the farm boundary on the map.");
      },
      () => showToast("Unable to read current location.", "error"),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const addPoint = (point) => {
    const nextPoints = [...(form.boundary_points || []), point];
    syncGeometry(nextPoints);
  };

  const undoPoint = () => {
    const nextPoints = (form.boundary_points || []).slice(0, -1);
    syncGeometry(nextPoints);
  };

  const clearBoundary = () => {
    setForm((current) => ({
      ...current,
      boundary_points: [],
      farm_area: "",
    }));
    setInsight(null);
    setInsightError("");
  };

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...form,
        farm_area: form.farm_area === "" ? null : Number(form.farm_area),
        latitude: form.latitude === "" ? null : Number(form.latitude),
        longitude: form.longitude === "" ? null : Number(form.longitude),
      };

      if (editId) {
        await api.put(`/api/farms/${editId}`, payload);
        showToast("Farm updated successfully.");
      } else {
        await api.post("/api/farms", payload);
        showToast("Farm added successfully.");
      }

      setForm(EMPTY_FORM);
      setEditId(null);
      setInsight(null);
      setInsightError("");
      setMapCenter(DEFAULT_CENTER);
      await load();
    } catch {
      showToast("Failed to save farm. Try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  const edit = (farm) => {
    const points = normalizeBoundaryPoints(farm.boundary_points);
    const centroid = getCentroid(points);
    setForm({
      farm_name: farm.farm_name || "",
      farm_area: farm.calculated_area ?? farm.farm_area ?? "",
      location: farm.location_label || farm.location || "",
      latitude: farm.latitude ?? centroid?.lat ?? "",
      longitude: farm.longitude ?? centroid?.lng ?? "",
      boundary_points: points,
    });
    setInsight(insightFromFarm(farm));
    setMapCenter(getCardCenter(farm));
    setEditId(farm.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelEdit = () => {
    setForm(EMPTY_FORM);
    setEditId(null);
    setInsight(null);
    setInsightError("");
    setMapCenter(DEFAULT_CENTER);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/api/farms/${deleteId}`);
      showToast("Farm deleted.");
      await load();
    } catch {
      showToast("Delete failed. Try again.", "error");
    } finally {
      setDeleteId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div className="flex items-center gap-3">
          <div className="stat-icon bg-agro w-10 h-10">
            <Home className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="page-title">Farms</h2>
            <p className="page-subtitle">Mark farm boundaries on the map, auto-calculate area, and surface crop advice from location data.</p>
          </div>
        </div>
        <span className="badge badge-info">{farms.length} farm{farms.length !== 1 ? "s" : ""}</span>
      </div>

      {toast && (
        <div className={`${toast.type === "error" ? "error-box" : "success-box"} animate-pulse`}>
          {toast.type === "error" ? <AlertTriangle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
          {toast.msg}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[1.25fr_0.95fr] gap-6">
        <FarmMap
          center={mapCenter}
          boundaryPoints={form.boundary_points}
          onAddPoint={addPoint}
          onCurrentLocation={setCurrentLocation}
          onUndo={undoPoint}
          onClear={clearBoundary}
        />

        <div className="space-y-6">
          <div className="card">
            <div className="card-header">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {editId ? <Pencil className="w-4 h-4 text-agro" /> : <Plus className="w-4 h-4 text-agro" />}
                  <h3 className="section-title">{editId ? "Edit Farm" : "Add New Farm"}</h3>
                </div>
                {editId && (
                  <button onClick={cancelEdit} type="button" className="btn-ghost text-slate-400">
                    <X className="w-4 h-4" /> Cancel
                  </button>
                )}
              </div>
              <p className="section-subtitle">Type the farm name, then mark the boundary or use the current location anchor.</p>
            </div>

            <form onSubmit={submit} className="grid grid-cols-1 gap-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-field md:col-span-2">
                  <label className="label">Farm name</label>
                  <div className="input-group relative">
                    <span className="input-icon"><Home className="w-4 h-4" /></span>
                    <input className="input-with-icon" name="farm_name" placeholder="e.g. North Field" value={form.farm_name} onChange={change} required />
                  </div>
                </div>
                <div className="form-field">
                  <label className="label">Area (acres)</label>
                  <div className="input-group relative">
                    <span className="input-icon"><Ruler className="w-4 h-4" /></span>
                    <input
                      className="input-with-icon"
                      name="farm_area"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Auto-calculated from the boundary"
                      value={form.farm_area}
                      onChange={change}
                      readOnly={(form.boundary_points || []).length >= 3}
                    />
                  </div>
                </div>
                <div className="form-field">
                  <label className="label">Location label</label>
                  <div className="input-group relative">
                    <span className="input-icon"><MapPin className="w-4 h-4" /></span>
                    <input className="input-with-icon" name="location" placeholder="Resolved from the selected coordinates" value={form.location} onChange={change} />
                  </div>
                </div>
                <div className="form-field">
                  <label className="label">Latitude</label>
                  <div className="input-group relative">
                    <span className="input-icon"><Crosshair className="w-4 h-4" /></span>
                    <input className="input-with-icon" name="latitude" placeholder="Pick on map" value={form.latitude} onChange={change} />
                  </div>
                </div>
                <div className="form-field">
                  <label className="label">Longitude</label>
                  <div className="input-group relative">
                    <span className="input-icon"><Crosshair className="w-4 h-4" /></span>
                    <input className="input-with-icon" name="longitude" placeholder="Pick on map" value={form.longitude} onChange={change} />
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-dashed border-agro-accent/30 bg-agro-light/20 p-4 text-sm text-slate-600">
                {(form.boundary_points || []).length >= 3 ? (
                  <p>Boundary points are set. Saving this farm will use the map polygon to calculate acreage automatically.</p>
                ) : (
                  <p>Use the map to place at least three points, or enter a manual acreage if the farm boundary is not ready yet.</p>
                )}
              </div>

              <div className="flex flex-wrap gap-3">
                <button className="btn" disabled={loading}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : editId ? <CheckCircle2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  {loading ? "Saving…" : editId ? "Update Farm" : "Add Farm"}
                </button>
                {editId && (
                  <button type="button" onClick={cancelEdit} className="btn-outline">
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>

          <LocationInsight insight={insight} loading={insightLoading} error={insightError} />
        </div>
      </div>

      {farms.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {farms.map((farm) => {
            const area = farm.calculated_area ?? farm.farm_area;
            const recommendations = farm.recommended_crops || [];
            return (
              <div key={farm.id} className="card-hover flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="stat-icon bg-agro-light w-10 h-10 shrink-0">
                      <Home className="w-5 h-5 text-agro" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 truncate">{farm.farm_name}</p>
                      <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3" />
                        {farm.location_label || farm.location || "Marked on map"}
                      </p>
                    </div>
                  </div>
                  <span className="badge badge-info shrink-0">{formatArea(area)}</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-2xl bg-slate-50 p-3 border border-slate-100">
                    <p className="stat-label">Country</p>
                    <p className="mt-1 font-semibold text-slate-800 truncate">{farm.country || "—"}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-3 border border-slate-100">
                    <p className="stat-label">State</p>
                    <p className="mt-1 font-semibold text-slate-800 truncate">{farm.state || "—"}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-3 border border-slate-100 col-span-2">
                    <p className="stat-label">Weather</p>
                    <p className="mt-1 font-semibold text-slate-800">{farm.weather_summary || "Weather not resolved yet"}</p>
                  </div>
                </div>

                {recommendations.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Recommended crops</p>
                    <div className="flex flex-wrap gap-2">
                      {recommendations.slice(0, 3).map((item) => (
                        <span key={item.crop} className="badge badge-success">
                          {item.crop}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-2 pt-1 border-t border-slate-50">
                  <button onClick={() => edit(farm)} className="btn-ghost flex-1 justify-center">
                    <Pencil className="w-3.5 h-3.5" /> Edit
                  </button>
                  <button onClick={() => setDeleteId(farm.id)} className="btn-ghost flex-1 justify-center text-rose-500 hover:text-rose-600 hover:bg-rose-50">
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card empty-state py-16">
          <Home className="w-12 h-12 mb-3 text-slate-200" />
          <p className="text-sm font-medium text-slate-400">No farms added yet</p>
          <p className="text-xs text-slate-300 mt-1">Use the map and form above to add your first farm.</p>
        </div>
      )}

      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-6 w-full max-w-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="stat-icon bg-rose-100 w-10 h-10">
                <Trash2 className="w-5 h-5 text-rose-500" />
              </div>
              <div>
                <p className="font-semibold text-slate-900">Delete farm?</p>
                <p className="text-sm text-slate-500">This action cannot be undone.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={confirmDelete} className="btn-danger flex-1 justify-center">
                <Trash2 className="w-4 h-4" /> Delete
              </button>
              <button onClick={() => setDeleteId(null)} className="btn-outline flex-1 justify-center">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
