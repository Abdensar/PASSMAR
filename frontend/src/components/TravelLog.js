import { useState } from "react";
import { api, formatError } from "../services/apiClient";

export default function TravelLog() {
  const [body, setBody] = useState({
    num_passeport: "",
    mrz: "",
    type_mvt: "ENT",
    checkpoint: "",
    destination: "",
    provenance: "",
    details: "",
  });
  const [hash, setHash] = useState("");
  const [history, setHistory] = useState(null);
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  function set(k, v) {
    setBody((b) => ({ ...b, [k]: v }));
  }

  async function submitTravel(e) {
    e.preventDefault();
    setErr("");
    setMsg(null);
    setLoading(true);
    try {
      const out = await api.post("/passport/travel", body);
      setMsg(out);
    } catch (ex) {
      setErr(formatError(ex));
    } finally {
      setLoading(false);
    }
  }

  async function loadHistory(e) {
    e.preventDefault();
    setErr("");
    setHistory(null);
    setLoading(true);
    try {
      const out = await api.get(`/passport/${encodeURIComponent(hash)}/travels`);
      setHistory(out);
    } catch (ex) {
      setErr(formatError(ex));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="stack">
      <div className="card">
        <h2>Enregistrer un voyage (ENT / SOR)</h2>
        <p className="muted">Identifiant unique du voyage = txHash Ethereum (retourné après succès).</p>
        <form className="grid-form" onSubmit={submitTravel}>
          <label>
            N° passeport
            <input value={body.num_passeport} onChange={(e) => set("num_passeport", e.target.value)} required />
          </label>
          <label className="full">
            MRZ
            <input value={body.mrz} onChange={(e) => set("mrz", e.target.value)} required />
          </label>
          <label>
            Type
            <select value={body.type_mvt} onChange={(e) => set("type_mvt", e.target.value)}>
              <option value="ENT">ENT</option>
              <option value="SOR">SOR</option>
            </select>
          </label>
          <label className="full">
            Checkpoint
            <input value={body.checkpoint} onChange={(e) => set("checkpoint", e.target.value)} required />
          </label>
          <label>
            Destination (SOR)
            <input value={body.destination} onChange={(e) => set("destination", e.target.value)} />
          </label>
          <label>
            Provenance (ENT)
            <input value={body.provenance} onChange={(e) => set("provenance", e.target.value)} />
          </label>
          <label className="full">
            Détails
            <input value={body.details} onChange={(e) => set("details", e.target.value)} />
          </label>
          {err && <p className="error full">{err}</p>}
          {msg && <pre className="success full">{JSON.stringify(msg, null, 2)}</pre>}
          <button type="submit" disabled={loading}>
            {loading ? "Envoi…" : "Enregistrer le voyage"}
          </button>
        </form>
      </div>
      <div className="card">
        <h2>Historique des voyages (HMAC)</h2>
        <form className="row" onSubmit={loadHistory}>
          <input
            placeholder="hmac_hash"
            value={hash}
            onChange={(e) => setHash(e.target.value)}
            required
          />
          <button type="submit" disabled={loading}>
            Charger
          </button>
        </form>
        {history && <pre className="result">{JSON.stringify(history, null, 2)}</pre>}
      </div>
    </div>
  );
}
