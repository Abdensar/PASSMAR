import { useState } from "react";
import { api, formatError } from "../services/apiClient";
import AlertResult from "./AlertResult";
import HashDisplay from "./HashDisplay";
import BlockchainProof from "./BlockchainProof";
import toast from 'react-hot-toast';

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
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  function setField(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit(e) {
    e.preventDefault();
    setResult(null);
    setLoading(true);
    try {
      const payload = {
        ...form,
        date_naissance: form.date_naissance ? new Date(form.date_naissance).toISOString() : "",
        date_expiration: form.date_expiration ? new Date(form.date_expiration).toISOString() : "",
      };
      const out = await api.post("/passport/create", payload);
      setResult({ code: 200, message: "Passeport créé avec succès", data: out });
      toast.success("Passeport créé !");
    } catch (ex) {
      setResult({ code: ex.response?.status || 500, message: formatError(ex) });
      toast.error(formatError(ex));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-4xl">
      <h2 className="text-2xl font-bold mb-6 text-white">Créer un Passeport</h2>
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
        <form onSubmit={submit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Nom
              </label>
              <input
                type="text"
                value={form.nom}
                onChange={(e) => setField("nom", e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Prénom
              </label>
              <input
                type="text"
                value={form.prenom}
                onChange={(e) => setField("prenom", e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                CIN
              </label>
              <input
                type="text"
                value={form.cin}
                onChange={(e) => setField("cin", e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                N° Passeport
              </label>
              <input
                type="text"
                value={form.num_passeport}
                onChange={(e) => setField("num_passeport", e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Date de Naissance
              </label>
              <input
                type="date"
                value={form.date_naissance}
                onChange={(e) => setField("date_naissance", e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Lieu de Naissance
              </label>
              <input
                type="text"
                value={form.lieu_naissance}
                onChange={(e) => setField("lieu_naissance", e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Date d'Expiration
              </label>
              <input
                type="date"
                value={form.date_expiration}
                onChange={(e) => setField("date_expiration", e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Nationalité
              </label>
              <input
                type="text"
                value={form.nationalite}
                onChange={(e) => setField("nationalite", e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              MRZ
            </label>
            <input
              type="text"
              value={form.mrz}
              onChange={(e) => setField("mrz", e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Adresse
            </label>
            <input
              type="text"
              value={form.adresse}
              onChange={(e) => setField("adresse", e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Photo (URL ou base64)
            </label>
            <input
              type="text"
              value={form.photo_url}
              onChange={(e) => setField("photo_url", e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Biométrie
            </label>
            <input
              type="text"
              value={form.biometrie}
              onChange={(e) => setField("biometrie", e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Création...
              </>
            ) : (
              'Créer le Passeport'
            )}
          </button>
        </form>
      </div>
      {result && (
        <div className="mt-6">
          <AlertResult {...result} />
          {result.data && result.data.hmac_hash && (
            <div className="mt-4">
              <HashDisplay hash={result.data.hmac_hash} label="Hash HMAC du Passeport" />
            </div>
          )}
          {result.data && result.data.tx_hash_creation && (
            <div className="mt-4">
              <BlockchainProof txHash={result.data.tx_hash_creation} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
