import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Eye, EyeOff, User, Lock, Shield } from "lucide-react";
import { api, formatError } from "../services/apiClient";
import ThemeToggle from '../components/ThemeToggle';
import logo from '../tools/Logo_1.png';
import toast from 'react-hot-toast';

export default function LoginPage({ onLoggedIn }) {
  const nav = useNavigate();
  const [identifiant, setIdentifiant] = useState("");
  const [password, setPassword] = useState("");
  const [totp, setTotp] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      const body = { identifiant, password };
      if (totp.trim()) body.totp = totp.trim();
      const data = await api.login(body);
      onLoggedIn(data.agent);
      toast.success('Connexion réussie !');
      if (data.agent.role === "DOUANE") nav("/douane");
      else if (data.agent.role === "POLICE") nav("/police");
      else nav("/admin");
    } catch (ex) {
      setErr(formatError(ex));
      toast.error(formatError(ex));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark flex items-center justify-center p-4">
      <div className="max-w-md w-full relative">
        {/* Theme Toggle */}
        <div className="absolute top-4 right-4 z-10">
          <ThemeToggle />
        </div>

        {/* Card */}
        <div className="bg-surface-light dark:bg-surface-dark border border-gray-200 dark:border-gray-700 rounded-xl p-8 shadow-2xl">
          {/* Logo */}
          <div className="text-center mb-8">
            <img src={logo} alt="PASSMAR" className="h-16 w-auto mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-text-light dark:text-text mb-2">Authentification Sécurisée</h1>
            <p className="text-muted-light dark:text-muted text-sm">Accès réservé aux agents habilités</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Identifiant */}
            <div>
              <label className="block text-sm font-medium text-text-light dark:text-text mb-2">
                Identifiant
              </label>
              <div className="relative">
                <User size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-light dark:text-muted" />
                <input
                  type="text"
                  value={identifiant}
                  onChange={(e) => setIdentifiant(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-background-light dark:bg-background border border-gray-300 dark:border-gray-600 rounded-lg text-text-light dark:text-text placeholder-muted-light dark:placeholder-muted focus:outline-none focus:ring-2 focus:ring-primary-light dark:focus:ring-primary focus:border-transparent"
                  placeholder="Votre identifiant"
                  autoComplete="username"
                  required
                />
              </div>
            </div>

            {/* Mot de passe */}
            <div>
              <label className="block text-sm font-medium text-text-light dark:text-text mb-2">
                Mot de passe
              </label>
              <div className="relative">
                <Lock size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-light dark:text-muted" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-3 bg-background-light dark:bg-background border border-gray-300 dark:border-gray-600 rounded-lg text-text-light dark:text-text placeholder-muted-light dark:placeholder-muted focus:outline-none focus:ring-2 focus:ring-primary-light dark:focus:ring-primary focus:border-transparent"
                  placeholder="Votre mot de passe"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-light dark:text-muted hover:text-text-light dark:hover:text-text"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* TOTP */}
            <div>
              <label className="block text-sm font-medium text-text-light dark:text-text mb-2">
                Code 2FA (ADMIN uniquement)
              </label>
              <div className="relative">
                <Shield size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-light dark:text-muted" />
                <input
                  type="text"
                  value={totp}
                  onChange={(e) => setTotp(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-background-light dark:bg-background border border-gray-300 dark:border-gray-600 rounded-lg text-text-light dark:text-text placeholder-muted-light dark:placeholder-muted focus:outline-none focus:ring-2 focus:ring-primary-light dark:focus:ring-primary focus:border-transparent"
                  placeholder="6 chiffres"
                  maxLength="6"
                />
              </div>
            </div>

            {/* Error */}
            {err && (
              <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500 rounded-lg p-3">
                <p className="text-red-600 dark:text-red-400 text-sm">{err}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary-light dark:bg-primary hover:bg-primary dark:hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Connexion...
                </>
              ) : (
                'Se connecter'
              )}
            </button>
          </form>

          {/* Security Info */}
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-center gap-2 text-xs text-muted-light dark:text-muted">
              <Shield size={14} />
              <span>Connexion chiffrée · JWT · 2FA</span>
            </div>
          </div>

          {/* Back to Landing */}
          <div className="mt-4 text-center">
            <Link
              to="/"
              className="text-primary-light dark:text-primary hover:text-gold-light dark:hover:text-gold text-sm transition-colors"
            >
              ← Retour à l'accueil
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
