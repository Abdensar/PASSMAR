import { useState } from "react";
import { fetchJson, formatError } from "../services/apiClient";

export default function VerifyForm() {
  const [num, setNum] = useState("");
  const [mrz, setMrz] = useState("");
  const [res, setRes] = useState(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setErr("");
    setRes(null);
    setLoading(true);
    try {
      const q = new URLSearchParams({ num, mrz }).toString();
      const { status, data } = await fetchJson(`/passport/verify?${q}`, { method: "GET" });
      if (!data || typeof data !== "object") {
        setErr(`Réponse invalide (${status})`);
      } else {
        setRes(data);
      }
    } catch (ex) {
      setErr(formatError(ex));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card">
      <h2>Vérifier l’authenticité</h2>
      <form className="grid-form" onSubmit={submit}>
        <label>
          N° passeport
          <input value={num} onChange={(e) => setNum(e.target.value)} required />
        </label>
        <label className="full">
          MRZ
          <input value={mrz} onChange={(e) => setMrz(e.target.value)} required />
        </label>
        {err && <p className="error full">{err}</p>}
        <button type="submit" disabled={loading}>
          {loading ? "Vérification…" : "Vérifier"}
        </button>
      </form>
      {res && (
        <pre className="result">{JSON.stringify(res, null, 2)}</pre>
      )}
    </div>
  );
}
