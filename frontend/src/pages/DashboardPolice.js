import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, formatError } from "../services/apiClient";
import VerifyForm from "../components/VerifyForm";

export default function DashboardPolice({ agent, onLogout }) {
  const nav = useNavigate();
  const [hash, setHash] = useState("");
  const [history, setHistory] = useState(null);
  const [lookup, setLookup] = useState(null);
  const [err, setErr] = useState("");
  const [tab, setTab] = useState("verify");

  async function doLogout() {
    await api.logout();
    onLogout();
    nav("/login");
  }

  async function loadHistory(e) {
    e.preventDefault();
    setErr("");
    setHistory(null);
    try {
      const out = await api.get(`/passport/${encodeURIComponent(hash)}/travels`);
      setHistory(out);
    } catch (ex) {
      setErr(formatError(ex));
    }
  }

  async function loadPassport(e) {
    e.preventDefault();
    setErr("");
    setLookup(null);
    try {
      const out = await api.get(`/passport/${encodeURIComponent(hash)}`);
      setLookup(out);
    } catch (ex) {
      setErr(formatError(ex));
    }
  }

  return (
    <div className="layout">
      <header className="topbar">
        <div>
          <strong>Police</strong>
          <span className="muted"> · {agent?.identifiant}</span>
        </div>
        <nav className="tabs">
          <button type="button" className={tab === "verify" ? "active" : ""} onClick={() => setTab("verify")}>
            Vérifier
          </button>
          <button type="button" className={tab === "consult" ? "active" : ""} onClick={() => setTab("consult")}>
            Consulter / voyages
          </button>
        </nav>
        <button type="button" className="ghost" onClick={doLogout}>
          Déconnexion
        </button>
      </header>
      <main className="main">
        {err && <p className="error banner">{err}</p>}
        {tab === "verify" && <VerifyForm />}
        {tab === "consult" && (
          <div className="stack">
            <div className="card">
              <h2>Fiche passeport (HMAC)</h2>
              <form className="row" onSubmit={loadPassport}>
                <input value={hash} onChange={(e) => setHash(e.target.value)} placeholder="hmac_hash" required />
                <button type="submit">Charger</button>
              </form>
              {lookup && <pre className="result">{JSON.stringify(lookup, null, 2)}</pre>}
            </div>
            <div className="card">
              <h2>Historique des voyages</h2>
              <form className="row" onSubmit={loadHistory}>
                <input value={hash} onChange={(e) => setHash(e.target.value)} placeholder="hmac_hash" required />
                <button type="submit">Historique</button>
              </form>
              {history && <pre className="result">{JSON.stringify(history, null, 2)}</pre>}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
