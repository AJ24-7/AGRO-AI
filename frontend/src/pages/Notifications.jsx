import { useEffect, useState } from "react";
import api from "../api/axios";
import {
  Bell, ShieldAlert, Leaf, Sprout, Info,
  CheckCheck, RefreshCw, BellOff, Check,
} from "lucide-react";

const TYPE_CONFIG = {
  disease: {
    label: "Disease alert",
    badge: "badge badge-danger",
    icon: ShieldAlert,
    iconBg: "bg-rose-100",
    iconColor: "text-rose-500",
  },
  crop: {
    label: "Crop insight",
    badge: "badge badge-info",
    icon: Leaf,
    iconBg: "bg-emerald-100",
    iconColor: "text-emerald-600",
  },
  fertilizer: {
    label: "Fertilizer update",
    badge: "badge badge-warning",
    icon: Sprout,
    iconBg: "bg-amber-100",
    iconColor: "text-amber-600",
  },
  default: {
    label: "General",
    badge: "badge badge-neutral",
    icon: Info,
    iconBg: "bg-slate-100",
    iconColor: "text-slate-500",
  },
};

const getType = (type) => TYPE_CONFIG[type] || TYPE_CONFIG.default;

export default function Notifications() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const r = await api.get("/api/notifications");
      setItems(r.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const markRead = async (id) => {
    await api.put(`/api/notifications/${id}/read`);
    setItems((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n));
  };

  const markAllRead = async () => {
    const unread = items.filter((n) => !n.is_read);
    if (!unread.length) return;
    setMarkingAll(true);
    try {
      await Promise.all(unread.map((n) => api.put(`/api/notifications/${n.id}/read`)));
      setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } finally {
      setMarkingAll(false);
    }
  };

  const unreadCount = items.filter((n) => !n.is_read).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <div className="flex items-center gap-3">
          <div className="stat-icon bg-agro w-10 h-10 relative">
            <Bell className="w-5 h-5 text-white" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </div>
          <div>
            <h2 className="page-title">Notifications</h2>
            <p className="page-subtitle">Stay updated on alerts and system messages.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button onClick={markAllRead} className="btn-outline" disabled={markingAll}>
              {markingAll ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCheck className="w-4 h-4" />}
              Mark all read
            </button>
          )}
          <button onClick={load} className="btn-ghost">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card text-center py-4">
          <p className="stat-value text-slate-900">{items.length}</p>
          <p className="stat-label mt-1">Total</p>
        </div>
        <div className="card text-center py-4">
          <p className="stat-value text-rose-500">{unreadCount}</p>
          <p className="stat-label mt-1">Unread</p>
        </div>
        <div className="card text-center py-4">
          <p className="stat-value text-emerald-600">{items.length - unreadCount}</p>
          <p className="stat-label mt-1">Read</p>
        </div>
      </div>

      {/* Notification list */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-agro" />
            <h3 className="section-title">Recent activity</h3>
          </div>
          <p className="section-subtitle">Review unread alerts and mark them as read.</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin mr-2" />
            Loading…
          </div>
        ) : items.length === 0 ? (
          <div className="empty-state py-16">
            <BellOff className="w-12 h-12 mb-3 text-slate-200" />
            <p className="text-sm font-medium text-slate-400">No notifications yet</p>
            <p className="text-xs text-slate-300 mt-1">Alerts and updates will appear here.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((n) => {
              const meta = getType(n.type);
              const Icon = meta.icon;
              return (
                <div
                  key={n.id}
                  className={`notif-item ${n.is_read ? "notif-read" : "notif-unread"}`}
                >
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${meta.iconBg}`}>
                    <Icon className={`w-4 h-4 ${meta.iconColor}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">{n.title}</p>
                        <p className="text-sm text-slate-500 mt-0.5 leading-relaxed">{n.message}</p>
                      </div>
                      {!n.is_read && (
                        <button
                          onClick={() => markRead(n.id)}
                          className="shrink-0 btn-ghost text-agro hover:bg-agro-light px-2.5 py-1"
                        >
                          <Check className="w-3.5 h-3.5" /> Mark read
                        </button>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <span className="text-xs text-slate-400">{new Date(n.created_at).toLocaleString()}</span>
                      <span className={meta.badge}>{meta.label}</span>
                      {n.is_read && <span className="badge badge-neutral"><Check className="w-2.5 h-2.5" /> Read</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
