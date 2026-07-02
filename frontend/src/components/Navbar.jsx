import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { useNavigate } from "react-router-dom";
import { useState, useRef, useEffect } from "react";

export default function Navbar() {
  const { user, logout } = useAuth();
  const { language, toggleLanguage, t } = useLanguage();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate("/login"); };

  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const [isMobile, setIsMobile] = useState(typeof window !== "undefined" ? window.innerWidth < 768 : false);

  useEffect(() => {
    function onResize() {
      setIsMobile(window.innerWidth < 768);
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    function onDoc(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <header className="h-16 bg-white/95 backdrop-blur border-b border-slate-200 flex items-center justify-between px-3 sm:px-4 lg:px-6 shadow-sm">
      <h1 className="text-base sm:text-lg font-semibold text-agro-dark truncate pr-3">
        <span className="sm:hidden">{t("navbar.titleMobile")}</span>
        <span className="hidden sm:inline">{t("navbar.titleDesktop")}</span>
      </h1>

      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        {/* Mobile menu toggle - dispatches event to Sidebar */}
        <button
          onClick={() => window.dispatchEvent(new Event("agro-toggle-sidebar"))}
          className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-agro-dark shadow-sm lg:hidden"
          aria-label={t("navbar.openSidebar")}
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>
        <button
          type="button"
          onClick={toggleLanguage}
          className="h-10 min-w-20 rounded-2xl border border-slate-200 bg-white px-3 text-xs font-semibold text-agro-dark shadow-sm transition hover:bg-agro-light"
          aria-label={t("navbar.languageLabel")}
        >
          {language === "en" ? t("navbar.languageSwitch") : t("common.english")}
        </button>

        <span className="text-xs sm:text-sm text-slate-600 hidden md:inline truncate max-w-48">
          {t("navbar.welcome")}, <span className="font-semibold text-slate-900">{user?.name || t("common.farmer")}</span>
        </span>

        <button
          onClick={() => navigate("/notifications")}
          className="relative h-10 w-10 rounded-2xl border border-slate-200 bg-white flex items-center justify-center text-agro-dark shadow-sm transition hover:bg-agro-light"
          aria-label={t("navbar.openNotifications")}
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
            <path d="M12 2a7 7 0 0 0-7 7v4.5l-1.7 1.7a1 1 0 0 0 .7 1.7h16a1 1 0 0 0 .7-1.7L19 13.5V9a7 7 0 0 0-7-7zm0 20a3 3 0 0 0 3-3H9a3 3 0 0 0 3 3z" />
          </svg>
          <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-white" aria-hidden="true" />
        </button>

        <div className="relative" ref={ref}>
          <button
            onClick={() => setOpen((v) => !v)}
            className="h-10 w-10 rounded-2xl border border-slate-200 bg-white flex items-center justify-center text-agro-dark shadow-sm transition hover:bg-slate-50"
            aria-label={t("navbar.openProfileMenu")}
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
              <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm0 2c-4.4 0-8 2.2-8 5v1h16v-1c0-2.8-3.6-5-8-5z" />
            </svg>
          </button>

          {open && (
            isMobile ? (
              <div className="fixed inset-x-0 top-16 z-50 bg-white border-t border-slate-100 shadow-xl text-sm">
                <div className="px-4 py-4">
                  <div className="mb-3">
                    <p className="text-xs text-slate-500">{t("navbar.signedInAs")}</p>
                    <p className="text-sm font-semibold text-slate-800 truncate">{user?.name || t("common.farmer")}</p>
                  </div>
                  <div className="space-y-2">
                    <button
                      onClick={() => { setOpen(false); navigate("/profile"); }}
                      className="w-full text-left rounded-lg px-4 py-3 hover:bg-slate-50"
                    >
                      {t("navbar.manageProfile")}
                    </button>
                    <button
                      onClick={() => { setOpen(false); handleLogout(); }}
                      className="w-full text-left rounded-lg px-4 py-3 text-red-600 hover:bg-slate-50"
                    >
                      {t("navbar.logOut")}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="absolute right-0 mt-2 w-48 rounded-2xl border border-slate-100 bg-white shadow-xl text-sm z-50 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/80">
                  <p className="text-xs text-slate-500">{t("navbar.signedInAs")}</p>
                  <p className="text-sm font-semibold text-slate-800 truncate">{user?.name || t("common.farmer")}</p>
                </div>
                <button
                  onClick={() => { setOpen(false); navigate("/profile"); }}
                  className="w-full text-left px-4 py-2.5 hover:bg-slate-100"
                >
                  {t("navbar.manageProfile")}
                </button>
                <button
                  onClick={() => { setOpen(false); handleLogout(); }}
                  className="w-full text-left px-4 py-2.5 text-red-600 hover:bg-slate-100"
                >
                  {t("navbar.logOut")}
                </button>
              </div>
            )
          )}
        </div>
      </div>
    </header>
  );
}
