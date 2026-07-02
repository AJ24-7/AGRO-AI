import { useState, useEffect } from "react";
import { NavLink } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";

const icons = {
  dashboard: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
      <path d="M4 4h7v7H4V4zm9 0h7v4h-7V4zM4 13h7v7H4v-7zm9 5h7v2h-7v-2z" />
    </svg>
  ),
  profile: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
      <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm0 2c-4.4 0-8 2.2-8 5v1h16v-1c0-2.8-3.6-5-8-5z" />
    </svg>
  ),
  farms: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
      <path d="M4 10.5l8-6 8 6V20a1 1 0 0 1-1 1h-5v-5H10v5H5a1 1 0 0 1-1-1v-9.5z" />
      <path d="M10 13h4v4h-4v-4z" opacity="0.8" />
    </svg>
  ),
  plots: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
      <path d="M4 4h7v7H4V4zm9 0h7v7h-7V4zM4 13h7v7H4v-7zm9 5h7v2h-7v-2z" />
    </svg>
  ),
  soil: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
      <path d="M12 2C9.8 2 8 3.8 8 6c0 4.5 4 8.6 4 8.6s4-4.1 4-8.6c0-2.2-1.8-4-4-4zm0 7a1 1 0 1 1 0-2 1 1 0 0 1 0 2z" />
    </svg>
  ),
  crop: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
      <path d="M12 3.5a6.5 6.5 0 0 0-6.5 6.5c0 3.25 2.3 5.95 5.5 6.35V21h2v-4.65c3.2-.4 5.5-3.1 5.5-6.35A6.5 6.5 0 0 0 12 3.5z" />
    </svg>
  ),
  disease: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
      <path d="M12 2L4 5v6c0 5 3.6 9.7 8 11 4.4-1.3 8-6 8-11V5l-8-3z" />
      <path d="M11 7h2v6h-2V7zm0 8h2v2h-2v-2z" fill="#fff" />
    </svg>
  ),
  fertilizer: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
      <path d="M7 4h10v2H7V4zm-2 5h14v11H5V9zm4 3v5h2v-5H9zm4 0v5h2v-5h-2z" />
    </svg>
  ),
  equipment: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
      <path d="M3 17h2a3 3 0 0 0 6 0h2a3 3 0 0 0 6 0h2v-3l-3-4H5L3 14v3zm6 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm8 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0zM16 8H8V5h8v3z" />
      <path d="M10 11H5.5l1.2-2H10v2zm4 0h4.5l-1.2-2H14v2z" opacity="0.6" />
    </svg>
  ),
  assistant: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
      <path d="M12 2a7 7 0 0 0-7 7v4l-2 3h18l-2-3V9a7 7 0 0 0-7-7zm0 19a3 3 0 0 0 2.82-2H9.18A3 3 0 0 0 12 21z" />
    </svg>
  ),
  notifications: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
      <path d="M12 2a7 7 0 0 0-7 7v4.5l-1.7 1.7a1 1 0 0 0 .7 1.7h16a1 1 0 0 0 .7-1.7L19 13.5V9a7 7 0 0 0-7-7zm0 20a3 3 0 0 0 3-3H9a3 3 0 0 0 3 3z" />
    </svg>
  ),
};

const links = [
  { to: "/", labelKey: "sidebar.home", icon: icons.dashboard },
  { to: "/farms", labelKey: "sidebar.farms", icon: icons.farms },
  { to: "/crop", labelKey: "sidebar.crops", icon: icons.crop },
  { to: "/equipment", labelKey: "sidebar.equipment", icon: icons.equipment },
  { to: "/assistant", labelKey: "sidebar.assistant", icon: icons.assistant },
];

export default function Sidebar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { t } = useLanguage();

  // listen for a global toggle event dispatched from Navbar
  useEffect(() => {
    function handler() {
      setMenuOpen((prev) => !prev);
    }
    window.addEventListener("agro-toggle-sidebar", handler);
    return () => window.removeEventListener("agro-toggle-sidebar", handler);
  }, []);

  return (
    <>
      <div className={`${menuOpen ? "sidebar-overlay" : "hidden"} lg:hidden`} onClick={() => setMenuOpen(false)} />

      <aside
        className={`sidebar-drawer fixed inset-y-0 left-0 top-0 z-50 w-72 transform bg-agro-dark text-white transition duration-300 lg:static lg:translate-x-0 lg:w-64 lg:shadow-none ${menuOpen ? "translate-x-0" : "-translate-x-full"}`}
        aria-label="Primary navigation"
      >
        <div className="h-full flex flex-col">
          <div className="p-4 border-b border-white/10 flex items-center gap-2.5 lg:justify-center">
            <div className="h-10 w-10 rounded-3xl bg-white/10 flex items-center justify-center text-white shadow-inner">
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
                <path d="M12 2L4 7v10a1 1 0 0 0 1 1h4v-5h6v5h4a1 1 0 0 0 1-1V7l-8-5z" />
              </svg>
            </div>
            <div className="hidden lg:block">
              <p className="text-sm font-semibold text-white">{t("sidebar.title")}</p>
              <p className="text-[11px] text-white/70">{t("sidebar.subtitleDesktop")}</p>
            </div>
          </div>

          <nav className="flex-1 p-3 space-y-1.5">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === "/"}
                className={({ isActive }) =>
                  `group flex items-center gap-2.5 rounded-2xl px-3 py-2.5 text-[13px] font-medium transition ${
                    isActive
                      ? "bg-white/15 text-white shadow-inner ring-1 ring-white/20"
                      : "text-slate-100 hover:bg-white/10 hover:text-white"
                  }`
                }
                onClick={() => setMenuOpen(false)}
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white transition group-hover:bg-white/15">
                  {link.icon}
                </span>
                <span className="truncate">{t(link.labelKey)}</span>
              </NavLink>
            ))}
          </nav>

          <div className="p-3 border-t border-white/10">
            <div className="rounded-2xl bg-white/10 p-3">
              <p className="text-[10px] uppercase tracking-[0.25em] text-white/60">{t("sidebar.helpTitle")}</p>
              <p className="mt-1.5 text-xs text-white">{t("sidebar.helpText")}</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
