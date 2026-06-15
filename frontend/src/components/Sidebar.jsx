import { NavLink } from "react-router-dom";

const links = [
  { to: "/", label: "Dashboard", icon: "📊" },
  { to: "/profile", label: "Profile", icon: "👨‍🌾" },
  { to: "/farms", label: "Farms", icon: "🚜" },
  { to: "/plots", label: "Plots", icon: "🌾" },
  { to: "/soil", label: "Soil Analysis", icon: "🧪" },
  { to: "/crop", label: "Crop Recommend", icon: "🌱" },
  { to: "/disease", label: "Disease Detect", icon: "🦠" },
  { to: "/fertilizer", label: "Fertilizer", icon: "💊" },
  { to: "/tractors", label: "Tractors", icon: "🛻" },
  { to: "/notifications", label: "Notifications", icon: "🔔" },
];

export default function Sidebar() {
  return (
    <aside className="w-64 bg-agro-dark text-white flex flex-col">
      <div className="p-5 text-2xl font-bold border-b border-green-800 flex items-center gap-2">
        🌱 AgroPilot AI
      </div>
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.to === "/"}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2 rounded-lg transition ${
                isActive ? "bg-agro-accent text-agro-dark font-semibold"
                         : "hover:bg-green-800"
              }`
            }
          >
            <span>{l.icon}</span> {l.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
