import { useState } from "react";
import { api, formatError } from "../services/apiClient";
import AlertResult from "./AlertResult";
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
    date_passage: new Date().toISOString().split('T')[0],
    details: "",
  });
  const [historyNum, setHistoryNum] = useState("");
  const [historyMrz, setHistoryMrz] = useState("");
  const [travelHistory, setTravelHistory] = useState(null);
  const [successResult, setSuccessResult] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  function setField(k, v) {
    setBody((b) => ({ ...b, [k]: v }));
  }

  async function submitTravel(e) {
    e.preventDefault();
    setResult(null);
    setSuccessResult(null);
    setLoading(true);
    try {
      const out = await api.post("/passport/travel", body);
      setSuccessResult(out);
      setResult({ code: 200, message: "✅ Voyage enregistré avec succès" });
      toast.success("Voyage enregistré !");
      // Reset form
      setBody({
        num_passeport: "",
        mrz: "",
        type_mvt: "ENT",
        checkpoint: "",
        destination: "",
        provenance: "",
        date_passage: new Date().toISOString().split('T')[0],
        details: "",
      });
    } catch (ex) {
      setResult({ code: ex.status || 500, message: formatError(ex) });
      toast.error(formatError(ex));
    } finally {
      setLoading(false);
    }
  }

  async function loadHistory(e) {
    e.preventDefault();
    setResult(null);
    setTravelHistory(null);
    setLoading(true);
    try {
      // Get HMAC hash from num_passeport and mrz using query params
      const q = new URLSearchParams({ num: historyNum, mrz: historyMrz }).toString();
      const passportData = await api.get(`/passport/lookup?${q}`);
      const hmacHash = passportData.offchain?.hmac_hash || passportData.hmac_hash;
      
      if (!hmacHash) {
        throw new Error("Impossible de trouver le hash du passeport");
      }
      
      // Fetch travel history for this passport
      const out = await api.get(`/passport/${encodeURIComponent(hmacHash)}/travels`);
      setTravelHistory(out);
      setResult({ code: 200, message: "✅ Historique de voyage chargé" });
      toast.success("Historique chargé !");
    } catch (ex) {
      setResult({ code: ex.status || 500, message: formatError(ex) });
      toast.error(formatError(ex));
    } finally {
      setLoading(false);
    }
  }

  const offchainTravels = travelHistory && Array.isArray(travelHistory.offchain) ? travelHistory.offchain : [];
  const isEntree = body.type_mvt === "ENT";

  return (
    <div className="max-w-4xl space-y-6">
      {/* Enregistrer Voyage */}
      <div>
        <h2 className="text-2xl font-bold mb-6 text-text-light dark:text-text">Enregistrer un Voyage</h2>
        <div className="bg-surface-light dark:bg-surface-dark border border-gray-200 dark:border-gray-700 rounded-xl p-6">
          <p className="text-sm text-muted-light dark:text-muted mb-4">
            Enregistrez chaque entrée ou sortie d'un passeport à un poste frontière.
          </p>
          <form onSubmit={submitTravel} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-light dark:text-text mb-2">
                  N° Passeport *
                </label>
                <input
                  type="text"
                  value={body.num_passeport}
                  onChange={(e) => setField("num_passeport", e.target.value)}
                  className="w-full px-3 py-2 bg-background-light dark:bg-background border border-gray-300 dark:border-gray-600 rounded-lg text-text-light dark:text-text placeholder-muted-light dark:placeholder-muted focus:outline-none focus:ring-2 focus:ring-primary-light dark:focus:ring-primary focus:border-transparent"
                  placeholder="Ex. MA0012345678"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-light dark:text-text mb-2">
                  Type de Mouvement *
                </label>
                <select
                  value={body.type_mvt}
                  onChange={(e) => setField("type_mvt", e.target.value)}
                  className="w-full px-3 py-2 bg-background-light dark:bg-background border border-gray-300 dark:border-gray-600 rounded-lg text-text-light dark:text-text focus:outline-none focus:ring-2 focus:ring-primary-light dark:focus:ring-primary"
                >
                  <option value="ENT">📥 Entrée (Arrivée)</option>
                  <option value="SOR">📤 Sortie (Départ)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-light dark:text-text mb-2">
                MRZ (Ligne de lecture) *
              </label>
              <input
                type="text"
                value={body.mrz}
                onChange={(e) => setField("mrz", e.target.value)}
                className="w-full px-3 py-2 bg-background-light dark:bg-background border border-gray-300 dark:border-gray-600 rounded-lg font-mono text-sm text-text-light dark:text-text placeholder-muted-light dark:placeholder-muted focus:outline-none focus:ring-2 focus:ring-primary-light dark:focus:ring-primary focus:border-transparent"
                placeholder="Scanné du document"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-light dark:text-text mb-2">
                  Poste Frontière (Checkpoint) *
                </label>
                <input
                  type="text"
                  value={body.checkpoint}
                  onChange={(e) => setField("checkpoint", e.target.value)}
                  className="w-full px-3 py-2 bg-background-light dark:bg-background border border-gray-300 dark:border-gray-600 rounded-lg text-text-light dark:text-text placeholder-muted-light dark:placeholder-muted focus:outline-none focus:ring-2 focus:ring-primary-light dark:focus:ring-primary focus:border-transparent"
                  placeholder="Ex. Tanger, Casablanca, Nador..."
                  required
                />
                <p className="text-xs text-muted-light dark:text-muted mt-1">Lieu de la traversée frontière</p>
              </div>

              {/* Conditional: Show origin/destination based on type */}
              <div>
                <label className="block text-sm font-medium text-text-light dark:text-text mb-2">
                  {isEntree ? "Provenance (Origine) *" : "Destination (Départ) *"}
                </label>
                <input
                  type="text"
                  value={isEntree ? body.provenance : body.destination}
                  onChange={(e) => setField(isEntree ? "provenance" : "destination", e.target.value)}
                  className="w-full px-3 py-2 bg-background-light dark:bg-background border border-gray-300 dark:border-gray-600 rounded-lg text-text-light dark:text-text placeholder-muted-light dark:placeholder-muted focus:outline-none focus:ring-2 focus:ring-primary-light dark:focus:ring-primary focus:border-transparent"
                  placeholder={isEntree ? "Pays/Ville d'origine" : "Pays/Ville de destination"}
                  required
                />
                <p className="text-xs text-muted-light dark:text-muted mt-1">
                  {isEntree ? "Où vient le voyageur ?" : "Où va le voyageur ?"}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-light dark:text-text mb-2">
                  Date de Passage *
                </label>
                <input
                  type="date"
                  value={body.date_passage}
                  onChange={(e) => setField("date_passage", e.target.value)}
                  className="w-full px-3 py-2 bg-background-light dark:bg-background border border-gray-300 dark:border-gray-600 rounded-lg text-text-light dark:text-text focus:outline-none focus:ring-2 focus:ring-primary-light dark:focus:ring-primary focus:border-transparent"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-light dark:text-text mb-2">
                Détails supplémentaires
              </label>
              <textarea
                value={body.details}
                onChange={(e) => setField("details", e.target.value)}
                className="w-full px-3 py-2 bg-background-light dark:bg-background border border-gray-300 dark:border-gray-600 rounded-lg text-text-light dark:text-text placeholder-muted-light dark:placeholder-muted focus:outline-none focus:ring-2 focus:ring-primary-light dark:focus:ring-primary focus:border-transparent"
                placeholder="Observations, remarques, incidents..."
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
                '✅ Enregistrer le Voyage'
              )}
            </button>
          </form>
        </div>

        {/* Success Card Result */}
        {successResult && (
          <div className="mt-6 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 border-2 border-green-300 dark:border-green-700 rounded-xl p-6 shadow-lg">
            <div className="flex items-start gap-4">
              <div className="text-4xl">✅</div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-green-800 dark:text-green-300 mb-4">
                  Voyage Enregistré avec Succès
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Movement Type */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-green-200 dark:border-green-700">
                    <p className="text-xs text-muted-light dark:text-muted uppercase font-bold tracking-wide mb-1">Type de Mouvement</p>
                    <p className="text-lg font-bold text-text-light dark:text-text">
                      {successResult.type_mvt === "ENT" ? "📥 Entrée" : "📤 Sortie"}
                    </p>
                  </div>

                  {/* Checkpoint */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-green-200 dark:border-green-700">
                    <p className="text-xs text-muted-light dark:text-muted uppercase font-bold tracking-wide mb-1">Poste Frontière</p>
                    <p className="text-lg font-bold text-text-light dark:text-text">
                      {successResult.checkpoint}
                    </p>
                  </div>

                  {/* Origin/Destination */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-green-200 dark:border-green-700">
                    <p className="text-xs text-muted-light dark:text-muted uppercase font-bold tracking-wide mb-1">
                      {successResult.type_mvt === "ENT" ? "Provenance" : "Destination"}
                    </p>
                    <p className="text-lg font-bold text-text-light dark:text-text">
                      {successResult.type_mvt === "ENT" 
                        ? successResult.provenance || "—" 
                        : successResult.destination || "—"}
                    </p>
                  </div>

                  {/* Date */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-green-200 dark:border-green-700">
                    <p className="text-xs text-muted-light dark:text-muted uppercase font-bold tracking-wide mb-1">Date d'Enregistrement</p>
                    <p className="text-lg font-bold text-text-light dark:text-text">
                      {new Date().toLocaleDateString("fr-FR")}
                    </p>
                  </div>
                </div>

                {/* Blockchain Proof */}
                {successResult.tx_hash && (
                  <div className="mt-4 bg-white dark:bg-gray-800 rounded-lg p-4 border-2 border-blue-300 dark:border-blue-600">
                    <p className="text-xs text-muted-light dark:text-muted uppercase font-bold tracking-wide mb-3">
                      ⛓️ Preuve Blockchain
                    </p>
                    <BlockchainProof txHash={successResult.tx_hash} />
                  </div>
                )}

                {/* Passport Hash */}
                {successResult.hmac_hash && (
                  <div className="mt-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border border-blue-200 dark:border-blue-700">
                    <p className="text-xs text-muted-light dark:text-muted font-mono mb-2">Hash HMAC du Passeport</p>
                    <p className="text-xs font-mono text-text-light dark:text-text break-all">
                      {successResult.hmac_hash}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Historique Voyages */}
      <div>
        <h2 className="text-2xl font-bold mb-6 text-text-light dark:text-text">Consulter Historique de Voyages</h2>
        <div className="bg-surface-light dark:bg-surface-dark border border-gray-200 dark:border-gray-700 rounded-xl p-6">
          <p className="text-sm text-muted-light dark:text-muted mb-4">
            Entrez le hash HMAC du passeport pour consulter tous les mouvements enregistrés.
          </p>
          <form onSubmit={loadHistory} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-light dark:text-text mb-2">
                  N° Passeport *
                </label>
                <input
                  type="text"
                  value={historyNum}
                  onChange={(e) => setHistoryNum(e.target.value)}
                  className="w-full px-3 py-2 bg-background-light dark:bg-background border border-gray-300 dark:border-gray-600 rounded-lg text-text-light dark:text-text placeholder-muted-light dark:placeholder-muted focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Ex. MA0012345678"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-light dark:text-text mb-2">
                  MRZ (Ligne de lecture) *
                </label>
                <input
                  type="text"
                  value={historyMrz}
                  onChange={(e) => setHistoryMrz(e.target.value)}
                  className="w-full px-3 py-2 bg-background-light dark:bg-background border border-gray-300 dark:border-gray-600 rounded-lg font-mono text-sm text-text-light dark:text-text placeholder-muted-light dark:placeholder-muted focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Scanné du document"
                  required
                />
              </div>
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
                '📋 Charger l\'Historique'
              )}
            </button>
          </form>
        </div>

        {/* Travel History Cards */}
        {travelHistory && (
          <div className="mt-6 space-y-4">
            <div className="bg-surface-light dark:bg-surface-dark border border-gray-200 dark:border-gray-700 rounded-xl p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold text-text-light dark:text-text">
                  Mouvements Enregistrés
                </h3>
                {travelHistory.onchain_count != null && (
                  <span className="bg-blockchain/15 dark:bg-blockchain/25 text-blockchain-light dark:text-blockchain px-3 py-1 rounded-full text-sm font-semibold">
                    {travelHistory.onchain_count} sur chaîne
                  </span>
                )}
              </div>

              {offchainTravels.length > 0 ? (
                <div className="grid grid-cols-1 gap-4">
                  {offchainTravels.map((travel, index) => (
                    <div
                      key={travel._id || travel.tx_hash || index}
                      className="bg-background-light dark:bg-background border border-gray-200 dark:border-gray-600 rounded-lg p-4 hover:border-primary-light dark:hover:border-primary transition-colors"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">
                            {travel.type_mvt === "ENT" ? "📥" : "📤"}
                          </span>
                          <div>
                            <p className="font-semibold text-text-light dark:text-text">
                              {travel.type_mvt === "ENT" ? "Entrée" : "Sortie"}
                            </p>
                            <p className="text-sm text-muted-light dark:text-muted">
                              {new Date(travel.created_at || travel.date_passage).toLocaleDateString("fr-FR")}
                            </p>
                          </div>
                        </div>
                        {travel.status && <StatusBadge status={travel.status} />}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-muted-light dark:text-muted font-medium">Poste Frontière</p>
                          <p className="text-text-light dark:text-text">{travel.checkpoint}</p>
                        </div>
                        <div>
                          <p className="text-muted-light dark:text-muted font-medium">
                            {travel.type_mvt === "ENT" ? "Provenance" : "Destination"}
                          </p>
                          <p className="text-text-light dark:text-text">
                            {travel.type_mvt === "ENT"
                              ? travel.provenance || "—"
                              : travel.destination || "—"}
                          </p>
                        </div>
                      </div>

                      {travel.details && (
                        <div className="mt-3 pt-3 border-t border-gray-300 dark:border-gray-500">
                          <p className="text-sm text-muted-light dark:text-muted font-medium">Notes</p>
                          <p className="text-sm text-text-light dark:text-text">{travel.details}</p>
                        </div>
                      )}

                      {travel.tx_hash && (
                        <div className="mt-3 text-xs text-muted-light dark:text-muted font-mono">
                          <p>Tx: {travel.tx_hash.substring(0, 20)}...</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-light dark:text-muted py-8">
                  Aucun voyage enregistré pour ce passeport
                </p>
              )}
            </div>
          </div>
        )}

        {result && result.code !== 200 && <AlertResult {...result} />}
      </div>
    </div>
  );
}
