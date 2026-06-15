import { useEffect, useState } from "react";
import api from "../api/axios";

export default function Notifications() {
  const [items, setItems] = useState([]);

  const load = () => api.get("/api/notifications").then((r) => setItems(r.data));
  useEffect(() => { load(); }, []);

  const markRead = async (id) => { await api.put(`/api/notifications/${id}/read`); load(); };

  const icon = (type) => ({ disease: "🦠", crop: "🌱", fertilizer: "💊" }[type] || "🔔");

  return (
    <div className="card">
      <h2 className="text-xl font-bold text-agro-dark mb-4">🔔 Notifications</h2>
      <div className="space-y-2">
        {items.map((n) => (
          <div key={n.id}
               className={`flex items-start gap-3 p-3 rounded-lg border ${
                 n.is_read ? "bg-white" : "bg-agro-light border-agro-accent"}`}>
            <span className="text-2xl">{icon(n.type)}</span>
            <div className="flex-1">
              <p className="font-semibold text-agro-dark">{n.title}</p>
              <p className="text-sm text-gray-600">{n.message}</p>
              <p className="text-xs text-gray-400">{new Date(n.created_at).toLocaleString()}</p>
            </div>
            {!n.is_read && (
              <button onClick={() => markRead(n.id)} className="text-xs text-agro">Mark read</button>
            )}
          </div>
        ))}
        {items.length === 0 && <p className="text-gray-500">No notifications yet.</p>}
      </div>
    </div>
  );
}
