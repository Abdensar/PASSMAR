import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, formatError } from "../services/apiClient";

export default function LoginPage({ onLoggedIn }) {
  const nav = useNavigate();
  const [identifiant, setIdentifiant] = useState("");
  const [password, setPassword] = useState("");
  const [totp, setTotp] = useState("");
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
      if (data.agent.role === "DOUANE") nav("/douane");
      else if (data.agent.role === "POLICE") nav("/police");
      else nav("/admin");
    } catch (ex) {
      setErr(formatError(ex));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page narrow">
      <h1>Connexion — Passeport numérique</h1>
      <p className="muted">JWT via cookies HttpOnly. 2FA obligatoire pour les comptes ADMIN.</p>
      <form className="card" onSubmit={handleSubmit}>
        <label>
          Identifiant
          <input
            value={identifiant}
            onChange={(e) => setIdentifiant(e.target.value)}
            autoComplete="username"
            required
          />
        </label>
        <label>
          Mot de passe
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </label>
        <label>
          Code 2FA (ADMIN uniquement)
          <input value={totp} onChange={(e) => setTotp(e.target.value)} placeholder="6 chiffres" />
        </label>
        {err && <p className="error">{err}</p>}
        <button type="submit" disabled={loading}>
          {loading ? "Connexion…" : "Se connecter"}
        </button>
      </form>
    </div>
  );
}
