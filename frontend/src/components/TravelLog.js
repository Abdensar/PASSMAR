import { useState } from "react";
import { api, formatError } from "../services/apiClient";
import AlertResult from "./AlertResult";
import HashDisplay from "./HashDisplay";
import BlockchainProof from "./BlockchainProof";
import StatusBadge from "./StatusBadge";
import toast from 'react-hot-toast';

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
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  function setField(k, v) {
    setBody((b) => ({ ...b, [k]: v }));
  }

  async function submitTravel(e) {
    e.preventDefault();
    setResult(null);
    setLoading(true);
    try {
      const out = await api.post("/passport/travel", body);
      setResult({ code: 200, message: "Voyage enregistré avec succès", data: out });
      toast.success("Voyage enregistré !");
    } catch (ex) {
      setResult({ code: ex.response?.status || 500, message: formatError(ex) });
      toast.error(formatError(ex));
    } finally {
      setLoading(false);
    }
  }

  async function loadHistory(e) {
    e.preventDefault();
    setResult(null);
    setHistory(null);
    setLoading(true);
    try {
      const out = await api.get(`/passport/${encodeURIComponent(hash)}/travels`);
      setHistory(out);
      setResult({ code: 200, message: "Historique chargé", data: out });
    } catch (ex) {
      setResult({ code: ex.response?.status || 500, message: formatError(ex) });
      toast.error(formatError(ex));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-4xl space-y-6">
      {/* Enregistrer Voyage */}
      <div>
        <h2 className="text-2xl font-bold mb-6 text-text-light dark:text-text">Enregistrer un Voyage</h2>
        <div className="bg-surface-light dark:bg-surface-dark border border-gray-200 dark:border-gray-700 rounded-xl p-6">
          <p className="text-muted-light dark:text-muted mb-4">Identifiant unique du voyage = txHash Ethereum (retourné après succès).</p>
          <form onSubmit={submitTravel} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-light dark:text-text mb-2">
                  N° Passeport
                </label>
                <input
                  type="text"
                  value={body.num_passeport}
                  onChange={(e) => setField("num_passeport", e.target.value)}
                  className="w-full px-3 py-2 bg-background-light dark:bg-background border border-gray-300 dark:border-gray-600 rounded-lg text-text-light dark:text-text placeholder-muted-light dark:placeholder-muted focus:outline-none focus:ring-2 focus:ring-primary-light dark:focus:ring-primary focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-light dark:text-text mb-2">
                  Type de Mouvement
                </label>
                <select
                  value={body.type_mvt}
                  onChange={(e) => setField("type_mvt", e.target.value)}
                  className="w-full px-3 py-2 bg-background-light dark:bg-background border border-gray-300 dark:border-gray-600 rounded-lg text-text-light dark:text-text focus:outline-none focus:ring-2 focus:ring-primary-light dark:focus:ring-primary"
                >
                  <option value="ENT">Entrée</option>
                  <option value="SOR">Sortie</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-light dark:text-text mb-2">
                MRZ
              </label>
              <input
                type="text"
                value={body.mrz}
                onChange={(e) => setField("mrz", e.target.value)}
                className="w-full px-3 py-2 bg-background-light dark:bg-background border border-gray-300 dark:border-gray-600 rounded-lg text-text-light dark:text-text placeholder-muted-light dark:placeholder-muted focus:outline-none focus:ring-2 focus:ring-primary-light dark:focus:ring-primary focus:border-transparent"
                required
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Checkpoint
                </label>
                <input
                  type="text"
                  value={body.checkpoint}
                  onChange={(e) => setField("checkpoint", e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Destination (Sortie)
                </label>
                <input
                  type="text"
                  value={body.destination}
                  onChange={(e) => setField("destination", e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Provenance (Entrée)
                </label>
                <input
                  type="text"
                  value={body.provenance}
                  onChange={(e) => setField("provenance", e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Détails
              </label>
              <textarea
                value={body.details}
                onChange={(e) => setField("details", e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
                rows="3"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary-light dark:bg-primary hover:bg-primary dark:hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Enregistrement...
                </>
              ) : (
                'Enregistrer le Voyage'
              )}
            </button>
          </form>
        </div>
        {result && result.data && result.data.txHash && (
          <div className="mt-4">
            <BlockchainProof txHash={result.data.txHash} />
          </div>
        )}
      </div>

      {/* Historique Voyages */}
      <div>
        <h2 className="text-2xl font-bold mb-6 text-text-light dark:text-text">Historique des Voyages</h2>
        <div className="bg-surface-light dark:bg-surface-dark border border-gray-200 dark:border-gray-700 rounded-xl p-6">
          <form onSubmit={loadHistory} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-light dark:text-text mb-2">
                HMAC Hash du Passeport
              </label>
              <input
                type="text"
                value={hash}
                onChange={(e) => setHash(e.target.value)}
                className="w-full px-3 py-2 bg-background-light dark:bg-background border border-gray-300 dark:border-gray-600 rounded-lg text-text-light dark:text-text placeholder-muted-light dark:placeholder-muted focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Entrez le hash HMAC"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary-light dark:bg-primary hover:bg-primary dark:hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Chargement...
                </>
              ) : (
                'Charger l\'Historique'
              )}
            </button>
          </form>
        </div>
        {history && (
          <div className="mt-6">
            <div className="bg-surface-light dark:bg-surface-dark border border-gray-200 dark:border-gray-700 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-text-light dark:text-text mb-4">Voyages</h3>
              {history.length > 0 ? (
                <div className="space-y-3">
                  {history.map((travel, index) => (
                    <div key={index} className="bg-[#E8D5B7] dark:bg-gray-700/50 rounded-lg p-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <span className="text-sm text-muted-light dark:text-muted">Type:</span>
                          <p className="text-text-light dark:text-text">{travel.type_mvt === 'ENT' ? 'Entrée' : 'Sortie'}</p>
                        </div>
                        <div>
                          <span className="text-sm text-muted-light dark:text-muted">Checkpoint:</span>
                          <p className="text-text-light dark:text-text">{travel.checkpoint}</p>
                        </div>
                        <div>
                          <span className="text-sm text-muted-light dark:text-muted">Date:</span>
                          <p className="text-text-light dark:text-text">{new Date(travel.date_passage).toLocaleString('fr-FR')}</p>
                        </div>
                      </div>
                      {travel.destination && (
                        <div className="mt-2">
                          <span className="text-sm text-muted-light dark:text-muted">Destination:</span>
                          <p className="text-text-light dark:text-text">{travel.destination}</p>
                        </div>
                      )}
                      {travel.provenance && (
                        <div className="mt-2">
                          <span className="text-sm text-muted-light dark:text-muted">Provenance:</span>
                          <p className="text-text-light dark:text-text">{travel.provenance}</p>
                        </div>
                      )}
                      {travel.details && (
                        <div className="mt-2">
                          <span className="text-sm text-muted-light dark:text-muted">Détails:</span>
                          <p className="text-text-light dark:text-text text-sm">{travel.details}</p>
                        </div>
                      )}
                      {travel.status && (
                        <div className="mt-2">
                          <span className="text-sm text-muted-light dark:text-muted">Statut:</span>
                          <StatusBadge status={travel.status} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-light dark:text-muted">Aucun voyage trouvé</p>
              )}
            </div>
          </div>
        )}
      </div>

      {result && <AlertResult {...result} />}
    </div>
  );
}
