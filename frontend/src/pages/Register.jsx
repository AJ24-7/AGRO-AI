import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { Link, useNavigate } from "react-router-dom";
import {
  User, Mail, Phone, Lock, Eye, EyeOff, Loader2,
  AlertCircle, Leaf, BarChart2, ShieldCheck, CheckCircle2,
} from "lucide-react";

export default function Register() {
  const { register } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", phone: "" });
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (form.password !== confirmPassword) {
      setError(t("register.passwordsDoNotMatch"));
      return;
    }
    setLoading(true);
    try {
      await register(form);
      navigate("/login");
    } catch (err) {
      setError(err.response?.data?.detail || t("register.registrationFailed"));
    } finally {
      setLoading(false);
    }
  };

  const passwordStrength = (p) => {
    if (!p) return null;
    if (p.length < 6) return { label: t("register.passwordStrength.weak"), color: "bg-rose-400", width: "33%" };
    if (p.length < 10) return { label: t("register.passwordStrength.fair"), color: "bg-amber-400", width: "66%" };
    return { label: t("register.passwordStrength.strong"), color: "bg-emerald-500", width: "100%" };
  };
  const strength = passwordStrength(form.password);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-agro-light via-white to-slate-100 p-4">
      <div className="auth-card max-w-5xl w-full">
        {/* Left panel */}
        <div className="auth-panel">
          <div className="space-y-8">
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
                  <Leaf className="w-5 h-5 text-white" />
                </div>
                <span className="font-bold text-white text-lg">AgroPilot AI</span>
              </div>
              <p className="text-sm uppercase tracking-[0.3em] text-white/60 mb-3">{t("register.newGrower")}</p>
              <h1 className="text-3xl font-bold leading-tight">{t("register.heroTitle")}</h1>
              <p className="mt-3 text-white/80 leading-relaxed text-sm">{t("register.heroText")}</p>
            </div>
            <div className="space-y-3">
              {[
                { icon: BarChart2, text: t("register.manageFields") },
                { icon: ShieldCheck, text: t("register.fertilizerAdvice") },
                { icon: CheckCircle2, text: t("register.notifications") },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="auth-feature">
                  <Icon className="w-4 h-4 shrink-0" />
                  {text}
                </div>
              ))}
            </div>
          </div>
          <p className="text-white/60 text-xs">
            {t("register.alreadyMember")} {" "}
            <Link to="/login" className="text-white font-semibold">{t("register.signInHere")}</Link>
          </p>
        </div>

        {/* Right form */}
        <div className="auth-form bg-white">
          <div className="mb-6">
            <p className="text-xs text-gray-400 uppercase tracking-widest mb-2">{t("register.title")}</p>
            <h2 className="text-2xl font-bold text-slate-900">{t("register.titleMain")}</h2>
            <p className="mt-1.5 text-sm text-gray-500">{t("register.description")}</p>
          </div>

          <form onSubmit={submit} className="space-y-4">
            {error && (
              <div className="error-box">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            <div className="form-field">
              <label className="label">{t("register.fullName")}</label>
              <div className="relative">
                <span className="input-icon"><User className="w-4 h-4" /></span>
                <input className="input-with-icon" name="name" type="text" placeholder="Your full name" value={form.name} onChange={change} required />
              </div>
            </div>

            <div className="form-field">
              <label className="label">{t("register.emailAddress")}</label>
              <div className="relative">
                <span className="input-icon"><Mail className="w-4 h-4" /></span>
                <input className="input-with-icon" name="email" type="email" placeholder="you@example.com" value={form.email} onChange={change} required />
              </div>
            </div>

            <div className="form-field">
              <label className="label">{t("register.phone")}</label>
              <div className="relative">
                <span className="input-icon"><Phone className="w-4 h-4" /></span>
                <input className="input-with-icon" name="phone" type="tel" placeholder="+1 234 567 890" value={form.phone} onChange={change} required />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="form-field">
                <label className="label">{t("register.password")}</label>
                <div className="relative">
                  <span className="input-icon"><Lock className="w-4 h-4" /></span>
                  <input
                    className="input-with-icon pr-10"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder={t("register.password")}
                    value={form.password}
                    onChange={change}
                    required
                  />
                  <button type="button" onClick={() => setShowPassword((p) => !p)} className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-agro transition-colors">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {strength && (
                  <div className="mt-1.5 space-y-1">
                    <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-300 ${strength.color}`} style={{ width: strength.width }} />
                    </div>
                    <p className="text-xs text-slate-400">Strength: <span className="font-medium text-slate-600">{strength.label}</span></p>
                  </div>
                )}
              </div>

              <div className="form-field">
                <label className="label">{t("register.confirmPassword")}</label>
                <div className="relative">
                  <span className="input-icon"><Lock className="w-4 h-4" /></span>
                  <input
                    className="input-with-icon pr-10"
                    type={showConfirm ? "text" : "password"}
                    placeholder={t("register.confirmPassword")}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                  <button type="button" onClick={() => setShowConfirm((p) => !p)} className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-agro transition-colors">
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {confirmPassword && (
                  <p className={`text-xs mt-1 ${form.password === confirmPassword ? "text-emerald-600" : "text-rose-500"}`}>
                    {form.password === confirmPassword ? t("register.passwordStrength.strong") : t("register.passwordsDoNotMatch")}
                  </p>
                )}
              </div>
            </div>

            <button type="submit" className="btn w-full py-3" disabled={loading}>
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> {t("register.creatingAccount")}</>
              ) : (
                t("register.createAccount")
              )}
            </button>
          </form>

          <p className="mt-5 text-center text-xs text-gray-400">
            {t("register.termsPrefix")} {" "}
            <Link to="/login" className="link-accent">{t("register.terms")}</Link> and{" "}
            <Link to="/login" className="link-accent">{t("register.privacy")}</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}
