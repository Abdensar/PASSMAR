import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, formatError } from "../services/apiClient";
import AuditTable from "../components/AuditTable";

export default function PanelAdmin({ agent, onLogout }) {
  const nav = useNavigate();
  const [agents, setAgents] = useState([]);
  const [pending, setPending] = useState([]);
  const [stats, setStats] = useState(null);
  const [tab, setTab] = useState("revoke");
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [newAgent, setNewAgent] = useState({
    identifiant: "",
    password: "",
    role: "DOUANE",
    eth_address: "",
    type_autorite: "DOUANE",
    nom_autorite: "Poste frontière",
  });
  const [ban, setBan] = useState({ hmac_hash: "", interdiction: true });
  const [confirmId, setConfirmId] = useState("");
  const [reject, setReject] = useState({ id_demande: "", notes: "" });

  async function doLogout() {
    await api.logout();
    onLogout();
    nav("/login");
  }

  async function refreshLists() {
    setErr("");
    try {
      const [a, p, s] = await Promise.all([
        api.get("/admin/agents"),
        api.get("/revocation/pending"),
        api.get("/admin/stats"),
      ]);
      setAgents(a.items || []);
      setPending(p.items || []);
      setStats(s);
    } catch (ex) {
      setErr(formatError(ex));
    }
  }

  useEffect(() => {
    refreshLists();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function createAgent(e) {
    e.preventDefault();
    setErr("");
    setMsg("");
    try {
      const out = await api.post("/admin/agents", newAgent);
      setMsg(
        `Agent créé : ${out.agent?.identifiant}.` +
          (out.otpauth_url ? ` OTPAuth URL (ADMIN) : ${out.otpauth_url}` : "")
      );
      refreshLists();
    } catch (ex) {
      setErr(formatError(ex));
    }
  }

  async function toggleAgent(id, is_active) {
    setErr("");
    try {
      await api.patch(`/admin/agents/${id}`, { is_active });
      refreshLists();
    } catch (ex) {
      setErr(formatError(ex));
    }
  }

  async function confirmRevoke(e) {
    e.preventDefault();
    setErr("");
    setMsg("");
    try {
      const out = await api.post("/passport/revoke/confirm", { id_demande: confirmId });
      setMsg(JSON.stringify(out, null, 2));
      refreshLists();
    } catch (ex) {
      setErr(formatError(ex));
    }
  }

  async function rejectRevoke(e) {
    e.preventDefault();
    setErr("");
    setMsg("");
    try {
      const out = await api.post("/passport/revoke/reject", reject);
      setMsg(JSON.stringify(out, null, 2));
      refreshLists();
    } catch (ex) {
      setErr(formatError(ex));
    }
  }

  async function applyBan(e) {
    e.preventDefault();
    setErr("");
    setMsg("");
    try {
      const out = await api.patch("/passport/travel-ban", ban);
      setMsg(JSON.stringify(out, null, 2));
    } catch (ex) {
      setErr(formatError(ex));
    }
  }

  return (
    <div className="layout">
      <header className="topbar">
        <div>
          <strong>Administration</strong>
          <span className="muted"> · {agent?.identifiant}</span>
        </div>
        <nav className="tabs">
          {["revoke", "agents", "ban", "audit", "stats"].map((t) => (
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
        {tab === "revoke" && (
          <div className="stack">
            <div className="card">
              <h2>Demandes de révocation en attente</h2>
              <button type="button" className="ghost" onClick={refreshLists}>
                Rafraîchir
              </button>
              <ul className="list">
                {pending.map((r) => (
                  <li key={r._id}>
                    <code>{r._id}</code> — {r.hmac_hash} — {r.raison}
                  </li>
                ))}
              </ul>
              <form className="row" onSubmit={confirmRevoke}>
                <input
                  placeholder="id_demande à confirmer"
                  value={confirmId}
                  onChange={(e) => setConfirmId(e.target.value)}
                  required
                />
                <button type="submit">Confirmer (blockchain)</button>
              </form>
              <form className="grid-form" onSubmit={rejectRevoke}>
                <label className="full">
                  Rejeter id_demande
                  <input
                    value={reject.id_demande}
                    onChange={(e) => setReject({ ...reject, id_demande: e.target.value })}
                    required
                  />
                </label>
                <label className="full">
                  Notes
                  <input value={reject.notes} onChange={(e) => setReject({ ...reject, notes: e.target.value })} />
                </label>
                <button type="submit">Rejeter</button>
              </form>
            </div>
          </div>
        )}
        {tab === "agents" && (
          <div className="card">
            <h2>Agents</h2>
            <button type="button" className="ghost" onClick={refreshLists}>
              Rafraîchir
            </button>
            <table className="table">
              <thead>
                <tr>
                  <th>Identifiant</th>
                  <th>Rôle</th>
                  <th>Actif</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {agents.map((ag) => (
                  <tr key={ag._id}>
                    <td>{ag.identifiant}</td>
                    <td>{ag.role}</td>
                    <td>{ag.is_active ? "oui" : "non"}</td>
                    <td>
                      <button type="button" onClick={() => toggleAgent(ag._id, !ag.is_active)}>
                        {ag.is_active ? "Désactiver" : "Activer"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <h3>Créer un agent</h3>
            <form className="grid-form" onSubmit={createAgent}>
              <label>
                Identifiant
                <input
                  value={newAgent.identifiant}
                  onChange={(e) => setNewAgent({ ...newAgent, identifiant: e.target.value })}
                  required
                />
              </label>
              <label>
                Mot de passe
                <input
                  type="password"
                  value={newAgent.password}
                  onChange={(e) => setNewAgent({ ...newAgent, password: e.target.value })}
                  required
                />
              </label>
              <label>
                Rôle
                <select value={newAgent.role} onChange={(e) => setNewAgent({ ...newAgent, role: e.target.value })}>
                  <option value="DOUANE">DOUANE</option>
                  <option value="POLICE">POLICE</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
              </label>
              <label>
                Adresse Ethereum
                <input
                  value={newAgent.eth_address}
                  onChange={(e) => setNewAgent({ ...newAgent, eth_address: e.target.value })}
                  required
                />
              </label>
              <label>
                Type autorité
                <select
                  value={newAgent.type_autorite}
                  onChange={(e) => setNewAgent({ ...newAgent, type_autorite: e.target.value })}
                >
                  <option value="DOUANE">DOUANE</option>
                  <option value="POLICE">POLICE</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
              </label>
              <label className="full">
                Nom autorité
                <input
                  value={newAgent.nom_autorite}
                  onChange={(e) => setNewAgent({ ...newAgent, nom_autorite: e.target.value })}
                />
              </label>
              <button type="submit">Créer</button>
            </form>
          </div>
        )}
        {tab === "ban" && (
          <div className="card">
            <h2>Interdiction de sortie</h2>
            <form className="grid-form" onSubmit={applyBan}>
              <label className="full">
                hmac_hash
                <input value={ban.hmac_hash} onChange={(e) => setBan({ ...ban, hmac_hash: e.target.value })} required />
              </label>
              <label>
                Interdiction
                <select
                  value={ban.interdiction ? "true" : "false"}
                  onChange={(e) => setBan({ ...ban, interdiction: e.target.value === "true" })}
                >
                  <option value="true">Oui</option>
                  <option value="false">Non</option>
                </select>
              </label>
              <button type="submit">Appliquer sur la chaîne</button>
            </form>
          </div>
        )}
        {tab === "audit" && <AuditTable />}
        {tab === "stats" && (
          <div className="card">
            <h2>Statistiques</h2>
            <button type="button" className="ghost" onClick={refreshLists}>
              Rafraîchir
            </button>
            <pre className="result">{JSON.stringify(stats, null, 2)}</pre>
          </div>
        )}
      </main>
    </div>
  );
}
