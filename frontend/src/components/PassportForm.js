import { useState } from "react";
import { api, formatError } from "../services/apiClient";

export default function PassportForm() {
  const [form, setForm] = useState({
    nom: "",
    prenom: "",
    cin: "",
    num_passeport: "",
    mrz: "",
    date_naissance: "",
    lieu_naissance: "",
    adresse: "",
    nationalite: "Marocaine",
    date_expiration: "",
    photo_url: "",
    biometrie: "",
  });
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  function set(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit(e) {
    e.preventDefault();
    setErr("");
    setMsg(null);
    setLoading(true);
    try {
      const payload = {
        ...form,
        date_naissance: form.date_naissance ? new Date(form.date_naissance).toISOString() : "",
        date_expiration: form.date_expiration ? new Date(form.date_expiration).toISOString() : "",
      };
      const out = await api.post("/passport/create", payload);
      setMsg(out);
    } catch (ex) {
      setErr(formatError(ex));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card">
      <h2>Créer un passeport</h2>
      <form className="grid-form" onSubmit={submit}>
        <label>
          Nom
          <input value={form.nom} onChange={(e) => set("nom", e.target.value)} required />
        </label>
        <label>
          Prénom
          <input value={form.prenom} onChange={(e) => set("prenom", e.target.value)} required />
        </label>
        <label>
          CIN
          <input value={form.cin} onChange={(e) => set("cin", e.target.value)} required />
        </label>
        <label>
          N° passeport
          <input value={form.num_passeport} onChange={(e) => set("num_passeport", e.target.value)} required />
        </label>
        <label className="full">
          MRZ
          <input value={form.mrz} onChange={(e) => set("mrz", e.target.value)} required />
        </label>
        <label>
          Date de naissance
          <input type="date" value={form.date_naissance} onChange={(e) => set("date_naissance", e.target.value)} required />
        </label>
        <label>
          Lieu de naissance
          <input value={form.lieu_naissance} onChange={(e) => set("lieu_naissance", e.target.value)} required />
        </label>
        <label>
          Date d’expiration
          <input type="date" value={form.date_expiration} onChange={(e) => set("date_expiration", e.target.value)} required />
        </label>
        <label>
          Nationalité
          <input value={form.nationalite} onChange={(e) => set("nationalite", e.target.value)} />
        </label>
        <label className="full">
          Adresse
          <input value={form.adresse} onChange={(e) => set("adresse", e.target.value)} />
        </label>
        <label className="full">
          Photo (URL ou base64 court)
          <input value={form.photo_url} onChange={(e) => set("photo_url", e.target.value)} />
        </label>
        <label className="full">
          Biométrie (champ chiffré côté serveur si AES_256_KEY)
          <input value={form.biometrie} onChange={(e) => set("biometrie", e.target.value)} />
        </label>
        {err && <p className="error full">{err}</p>}
        {msg && (
          <div className="success full">
            <div>HMAC (réf. blockchain) : {msg.hmac_hash}</div>
            <div>Tx création : {msg.tx_hash_creation}</div>
          </div>
        )}
        <button type="submit" className="full" disabled={loading}>
          {loading ? "Création…" : "Enregistrer"}
        </button>
      </form>
    </div>
  );
}
