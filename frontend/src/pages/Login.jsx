import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff, Loader2, AlertCircle, Leaf, BarChart2, Bell } from "lucide-react";

export default function Login() {
  const { login } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate("/");
    } catch {
      setError(t("login.invalidCredentials"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-agro-light via-white to-slate-100 p-4">
      <div className="auth-card max-w-5xl w-full">
        <div className="auth-panel">
          <div className="space-y-8">
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
                  <Leaf className="w-5 h-5 text-white" />
                </div>
                <span className="font-bold text-white text-lg">AgroPilot AI</span>
              </div>
              <p className="text-sm uppercase tracking-[0.3em] text-white/60 mb-3">{t("login.welcomeBack")}</p>
              <h1 className="text-3xl font-bold leading-tight">{t("login.heroTitle")}</h1>
              <p className="mt-3 text-white/80 leading-relaxed text-sm">{t("login.heroText")}</p>
            </div>
            <div className="space-y-3">
              {[
                { icon: Lock, text: t("login.secureAccess") },
                { icon: BarChart2, text: t("login.cropInsights") },
                { icon: Bell, text: t("login.diseaseAlerts") },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="auth-feature">
                  <Icon className="w-4 h-4 shrink-0" />
                  {text}
                </div>
              ))}
            </div>
          </div>
          <p className="text-white/60 text-xs">
            {t("login.helpText")} <span className="text-white font-medium">{t("login.support")}</span>
          </p>
        </div>

        <div className="auth-form bg-white">
          <div className="mb-8">
            <p className="text-xs text-gray-400 uppercase tracking-widest mb-2">{t("login.signIn")}</p>
            <h2 className="text-2xl font-bold text-slate-900">{t("login.signInTitle")}</h2>
            <p className="mt-1.5 text-sm text-gray-500">{t("login.signInDescription")}</p>
          </div>

          <form onSubmit={submit} className="space-y-5">
            {error && (
              <div className="error-box">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            <div className="form-field">
              <label className="label">{t("login.emailLabel")}</label>
              <div className="relative">
                <span className="input-icon"><Mail className="w-4 h-4" /></span>
                <input
                  className="input-with-icon"
                  type="email"
                  placeholder={t("login.emailPlaceholder")}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-field">
              <label className="label">{t("login.passwordLabel")}</label>
              <div className="relative">
                <span className="input-icon"><Lock className="w-4 h-4" /></span>
                <input
                  className="input-with-icon pr-12"
                  type={showPassword ? "text" : "password"}
                  placeholder={t("login.passwordPlaceholder")}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute inset-y-0 right-0 flex items-center px-3.5 text-gray-400 hover:text-agro transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 accent-agro"
                />
                {t("login.rememberMe")}
              </label>
              <Link to="/login" className="text-sm text-agro hover:text-agro-dark font-medium">
                {t("login.forgotPassword")}
              </Link>
            </div>

            <button type="submit" className="btn w-full py-3" disabled={loading}>
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> {t("login.signingIn")}</>
              ) : (
                t("login.signInButton")
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            {t("login.noAccount")} {" "}
            <Link to="/register" className="link-accent">{t("login.createNow")}</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
