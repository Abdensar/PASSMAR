import { useState } from "react";
import { api, formatError } from "../services/apiClient";
import AlertResult from "./AlertResult";
import toast from 'react-hot-toast';

export default function PassportForm() {
  const [form, setForm] = useState({
    nom: "",
    prenom: "",
    cin: "",
    num_passeport: "",
    sex: "M",
    date_naissance: "",
    lieu_naissance: "",
    adresse: "",
    nationalite: "Marocaine",
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
      // Calculate expiration date as 5 years from now
      const expirationDate = new Date();
      expirationDate.setFullYear(expirationDate.getFullYear() + 5);
      
      const payload = {
        ...form,
        date_naissance: form.date_naissance ? new Date(form.date_naissance).toISOString() : "",
        sex: form.sex,
      };
      const out = await api.post("/passport/create", payload);
      setResult({ code: 200, message: "Passeport créé avec succès", data: out });
      toast.success("Passeport créé !");
    } catch (ex) {
      setResult({ code: ex.status || 500, message: formatError(ex) });
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
                Nationalité
              </label>
              <input
                type="text"
                value={form.nationalite}
                onChange={(e) => setField("nationalite", e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Sexe
              </label>
              <select
                value={form.sex}
                onChange={(e) => setField("sex", e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="M">M</option>
                <option value="F">F</option>
              </select>
            </div>
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
      {result && result.code === 200 && result.data && (
        <div className="mt-6 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 border-2 border-green-300 dark:border-green-700 rounded-xl p-6 shadow-lg">
          <div className="flex items-start gap-4">
            <div className="text-4xl">✅</div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-green-800 dark:text-green-300 mb-4">
                Passeport Créé avec Succès
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Passport Number */}
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-green-200 dark:border-green-700">
                  <p className="text-xs text-muted-light dark:text-muted uppercase font-bold tracking-wide mb-1">N° Passeport</p>
                  <p className="text-lg font-bold text-text-light dark:text-text">{form.num_passeport}</p>
                </div>

                {/* Full Name */}
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-green-200 dark:border-green-700">
                  <p className="text-xs text-muted-light dark:text-muted uppercase font-bold tracking-wide mb-1">Nom Complet</p>
                  <p className="text-lg font-bold text-text-light dark:text-text">{form.prenom} {form.nom}</p>
                </div>

                {/* Sexe */}
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-green-200 dark:border-green-700">
                  <p className="text-xs text-muted-light dark:text-muted uppercase font-bold tracking-wide mb-1">Sexe</p>
                  <p className="text-lg font-bold text-text-light dark:text-text">{form.sex}</p>
                </div>

                {/* CIN */}
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-green-200 dark:border-green-700">
                  <p className="text-xs text-muted-light dark:text-muted uppercase font-bold tracking-wide mb-1">CIN</p>
                  <p className="text-lg font-bold text-text-light dark:text-text">{form.cin}</p>
                </div>

                {/* Expiration Date */}
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-green-200 dark:border-green-700">
                  <p className="text-xs text-muted-light dark:text-muted uppercase font-bold tracking-wide mb-1">Date d'Expiration</p>
                  <p className="text-lg font-bold text-text-light dark:text-text">
                    {result.data.date_expiration ? new Date(result.data.date_expiration).toLocaleDateString("fr-FR") : new Date(Date.now() + 5 * 365 * 24 * 60 * 60 * 1000).toLocaleDateString("fr-FR")}
                  </p>
                </div>

                {/* MRZ */}
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-green-200 dark:border-green-700 md:col-span-2">
                  <p className="text-xs text-muted-light dark:text-muted uppercase font-bold tracking-wide mb-1">MRZ</p>
                  <pre className="text-sm font-mono text-text-light dark:text-text break-all whitespace-pre-wrap">{result.data.mrz}</pre>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
      
      {result && result.code !== 200 && <AlertResult {...result} />}
    </div>
  );
}
