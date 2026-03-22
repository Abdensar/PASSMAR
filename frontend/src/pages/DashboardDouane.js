import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, formatError } from "../services/apiClient";
import PassportForm from "../components/PassportForm";
import TravelLog from "../components/TravelLog";

export default function DashboardDouane({ agent, onLogout }) {
  const nav = useNavigate();
  const [tab, setTab] = useState("create");
  const [renew, setRenew] = useState({
    num_passeport: "",
    mrz: "",
    nouveau_num_passeport: "",
    nouveau_mrz: "",
    date_expiration: "",
    motif: "EXPIRATION",
  });
  const [revoke, setRevoke] = useState({ hmac_hash: "", raison: "VOLE" });
  const [foreign, setForeign] = useState({
    nationalite: "",
    num_passeport_etr: "",
    type_mvt: "ENT",
    checkpoint: "",
    date_passage: "",
    details: "",
  });
  const [lookup, setLookup] = useState("");
  const [lookupRes, setLookupRes] = useState(null);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  async function doLogout() {
    await api.logout();
    onLogout();
    nav("/login");
  }

  async function submitRenew(e) {
    e.preventDefault();
    setErr("");
    setMsg("");
    try {
      const payload = {
        ...renew,
        date_expiration: renew.date_expiration ? new Date(renew.date_expiration).toISOString() : "",
      };
      const out = await api.post("/passport/renew", payload);
      setMsg(JSON.stringify(out, null, 2));
    } catch (ex) {
      setErr(formatError(ex));
    }
  }

  async function submitRevoke(e) {
    e.preventDefault();
    setErr("");
    setMsg("");
    try {
      const out = await api.post("/passport/revoke/initiate", revoke);
      setMsg(JSON.stringify(out, null, 2));
    } catch (ex) {
      setErr(formatError(ex));
    }
  }

  async function submitForeign(e) {
    e.preventDefault();
    setErr("");
    setMsg("");
    try {
      const payload = {
        ...foreign,
        date_passage: foreign.date_passage ? new Date(foreign.date_passage).toISOString() : "",
      };
      const out = await api.post("/passport/foreign-travel", payload);
      setMsg(JSON.stringify(out, null, 2));
    } catch (ex) {
      setErr(formatError(ex));
    }
  }

  async function loadPassport(e) {
    e.preventDefault();
    setErr("");
    setLookupRes(null);
    try {
      const out = await api.get(`/passport/${encodeURIComponent(lookup)}`);
      setLookupRes(out);
    } catch (ex) {
      setErr(formatError(ex));
    }
  }

  return (
    <div className="layout">
      <header className="topbar">
        <div>
          <strong>Douane</strong>
          <span className="muted"> · {agent?.identifiant}</span>
        </div>
        <nav className="tabs">
          {["create", "travel", "renew", "revoke", "foreign", "consult"].map((t) => (
            <button key={t} type="button" className={tab === t ? "active" : ""} onClick={() => setTab(t)}>
              {t}
            </button>
          ))}
        </nav>
        <button type="button" className="ghost" onClick={doLogout}>
          Déconnexion
        </button>
      </header>
      <main className="main">
        {err && <p className="error banner">{err}</p>}
        {msg && <pre className="success banner">{msg}</pre>}
        {tab === "create" && <PassportForm />}
        {tab === "travel" && <TravelLog />}
        {tab === "renew" && (
          <div className="card">
            <h2>Renouvellement</h2>
            <form className="grid-form" onSubmit={submitRenew}>
              <label>
                Ancien n° passeport
                <input
                  value={renew.num_passeport}
                  onChange={(e) => setRenew({ ...renew, num_passeport: e.target.value })}
                  required
                />
              </label>
              <label className="full">
                Ancien MRZ
                <input value={renew.mrz} onChange={(e) => setRenew({ ...renew, mrz: e.target.value })} required />
              </label>
              <label>
                Nouveau n° passeport
                <input
                  value={renew.nouveau_num_passeport}
                  onChange={(e) => setRenew({ ...renew, nouveau_num_passeport: e.target.value })}
                  required
                />
              </label>
              <label className="full">
                Nouveau MRZ
                <input
                  value={renew.nouveau_mrz}
                  onChange={(e) => setRenew({ ...renew, nouveau_mrz: e.target.value })}
                  required
                />
              </label>
              <label>
                Nouvelle expiration
                <input
                  type="date"
                  value={renew.date_expiration}
                  onChange={(e) => setRenew({ ...renew, date_expiration: e.target.value })}
                  required
                />
              </label>
              <label>
                Motif
                <select value={renew.motif} onChange={(e) => setRenew({ ...renew, motif: e.target.value })}>
                  <option value="EXPIRATION">EXPIRATION</option>
                  <option value="PERTE">PERTE</option>
                  <option value="DETERIORATION">DETERIORATION</option>
                </select>
              </label>
              <button type="submit" className="full">
                Renouveler
              </button>
            </form>
          </div>
        )}
        {tab === "revoke" && (
          <div className="card">
            <h2>Initier révocation (validation admin requise)</h2>
            <form className="grid-form" onSubmit={submitRevoke}>
              <label className="full">
                hmac_hash
                <input
                  value={revoke.hmac_hash}
                  onChange={(e) => setRevoke({ ...revoke, hmac_hash: e.target.value })}
                  required
                />
              </label>
              <label>
                Raison
                <select value={revoke.raison} onChange={(e) => setRevoke({ ...revoke, raison: e.target.value })}>
                  <option value="VOLE">VOLÉ</option>
                  <option value="PERDU">PERDU</option>
                  <option value="FALSIFIE">FALSIFIÉ</option>
                  <option value="DECES">DÉCÈS</option>
                  <option value="JUDICIAIRE">JUDICIAIRE</option>
                </select>
              </label>
              <button type="submit">Soumettre la demande</button>
            </form>
          </div>
        )}
        {tab === "foreign" && (
          <div className="card">
            <h2>Passeport étranger (MongoDB uniquement)</h2>
            <form className="grid-form" onSubmit={submitForeign}>
              <label>
                Nationalité
                <input
                  value={foreign.nationalite}
                  onChange={(e) => setForeign({ ...foreign, nationalite: e.target.value })}
                  required
                />
              </label>
              <label>
                N° passeport étranger
                <input
                  value={foreign.num_passeport_etr}
                  onChange={(e) => setForeign({ ...foreign, num_passeport_etr: e.target.value })}
                  required
                />
              </label>
              <label>
                Type
                <select value={foreign.type_mvt} onChange={(e) => setForeign({ ...foreign, type_mvt: e.target.value })}>
                  <option value="ENT">ENT</option>
                  <option value="SOR">SOR</option>
                </select>
              </label>
              <label className="full">
                Checkpoint
                <input
                  value={foreign.checkpoint}
                  onChange={(e) => setForeign({ ...foreign, checkpoint: e.target.value })}
                  required
                />
              </label>
              <label>
                Date passage
                <input
                  type="datetime-local"
                  value={foreign.date_passage}
                  onChange={(e) => setForeign({ ...foreign, date_passage: e.target.value })}
                  required
                />
              </label>
              <label className="full">
                Détails
                <input value={foreign.details} onChange={(e) => setForeign({ ...foreign, details: e.target.value })} />
              </label>
              <button type="submit">Enregistrer</button>
            </form>
          </div>
        )}
        {tab === "consult" && (
          <div className="card">
            <h2>Consulter par HMAC</h2>
            <form className="row" onSubmit={loadPassport}>
              <input value={lookup} onChange={(e) => setLookup(e.target.value)} placeholder="hmac_hash" required />
              <button type="submit">Charger</button>
            </form>
            {lookupRes && <pre className="result">{JSON.stringify(lookupRes, null, 2)}</pre>}
          </div>
        )}
      </main>
    </div>
  );
}
