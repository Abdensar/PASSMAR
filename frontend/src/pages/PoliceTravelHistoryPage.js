import { useState } from "react";
import { api, formatError } from "../services/apiClient";
import AlertResult from "../components/AlertResult";
import toast from "react-hot-toast";

export default function PoliceTravelHistoryPage() {
  const [num, setNum] = useState("");
  const [history, setHistory] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  async function loadTravelHistory(e) {
    e.preventDefault();
    if (!num.trim()) {
      toast.error("Saisissez le numéro du passeport");
      return;
    }
    setResult(null);
    setHistory(null);
    setLoading(true);
    try {
      const cred = await api.lookupPassport(num.trim());
      const h = cred?.offchain?.hmac_hash || cred?.hmac_hash;
      if (!h) {
        const err = new Error("Impossible de déterminer le passeport actif");
        err.status = 500;
        throw err;
      }
      const out = await api.get(`/passport/${encodeURIComponent(h)}/travels`);
      setHistory(out);
      setResult({ code: 200, message: "Historique chargé" });
      toast.success("Historique chargé");
    } catch (ex) {
      setResult({ code: ex.status || 500, message: formatError(ex) });
      toast.error(formatError(ex));
    } finally {
      setLoading(false);
    }
  }

  const offchainTravels = history && Array.isArray(history.offchain) ? history.offchain : [];

  return (
    <div className="max-w-5xl p-6 space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold text-text-light dark:text-text">Historique des voyages</h1>
        <p className="text-sm text-muted-light dark:text-muted max-w-xl">
          Les mouvements affichés sont ceux rattachés au <strong>passeport actif</strong> (dernière version après
          éventuels renouvellements), à partir du n° saisi.
        </p>
      </header>

      <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-surface-light dark:bg-surface-dark p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-text-light dark:text-text mb-4 uppercase tracking-wide text-muted-light dark:text-muted">
          Recherche
        </h2>
        <form onSubmit={loadTravelHistory} className="space-y-4 max-w-2xl">
          <div>
            <label className="block text-sm font-medium text-text-light dark:text-text mb-2" htmlFor="hist-num">
              N° passeport
            </label>
            <input
              id="hist-num"
              type="text"
              value={num}
              onChange={(e) => setNum(e.target.value)}
              className="w-full max-w-md px-3 py-2 bg-background-light dark:bg-background border border-gray-300 dark:border-gray-600 rounded-lg text-text-light dark:text-text focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Comme sur le document"
              autoComplete="off"
              required
            />
          </div>
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading || !num.trim()}
              className="inline-flex justify-center items-center gap-2 px-6 py-3 rounded-lg bg-blockchain hover:bg-blockchain/90 disabled:opacity-50 text-white font-semibold"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Chargement…
                </>
              ) : (
                "Charger l’historique"
              )}
            </button>
          </div>
        </form>
      </section>

      {history && (
        <section
          className="rounded-xl border border-gray-200 dark:border-gray-700 bg-surface-light dark:bg-surface-dark overflow-hidden shadow-sm"
          aria-live="polite"
        >
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blockchain/10 to-blockchain/5 dark:from-blockchain/20 dark:to-blockchain/10">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold text-text-light dark:text-text">Mouvements Enregistrés</h2>
                <p className="text-xs text-muted-light dark:text-muted mt-1">
                  Tous les passages frontières pour ce passeport
                </p>
              </div>
              {history.onchain_count != null && (
                <span className="bg-blockchain/15 dark:bg-blockchain/25 text-blockchain-light dark:text-blockchain px-3 py-1 rounded-full text-sm font-semibold">
                  {history.onchain_count} sur chaîne
                </span>
              )}
            </div>
          </div>
          
          <div className="p-6">
            {offchainTravels.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {offchainTravels.map((travel, idx) => (
                  <div
                    key={travel._id || travel.tx_hash || idx}
                    className="bg-background-light dark:bg-background border border-gray-200 dark:border-gray-600 rounded-lg p-4 hover:border-primary-light dark:hover:border-primary hover:shadow-md transition-all"
                  >
                    {/* Type + Date Header */}
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">
                          {travel.type_mvt === "ENT" ? "📥" : "📤"}
                        </span>
                        <div>
                          <p className="font-bold text-text-light dark:text-text">
                            {travel.type_mvt === "ENT" ? "Entrée" : "Sortie"}
                          </p>
                          <p className="text-xs text-muted-light dark:text-muted">
                            {new Date(travel.created_at || travel.date_passage).toLocaleDateString("fr-FR")}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Checkpoint */}
                    <div className="mb-3 pb-3 border-b border-gray-200 dark:border-gray-700">
                      <p className="text-xs text-muted-light dark:text-muted font-medium uppercase tracking-wide mb-1">
                        Poste Frontière
                      </p>
                      <p className="font-semibold text-text-light dark:text-text">
                        {travel.checkpoint || "—"}
                      </p>
                    </div>

                    {/* Origin/Destination */}
                    <div className="mb-3">
                      <p className="text-xs text-muted-light dark:text-muted font-medium uppercase tracking-wide mb-1">
                        {travel.type_mvt === "ENT" ? "Provenance" : "Destination"}
                      </p>
                      <p className="font-semibold text-text-light dark:text-text">
                        {travel.type_mvt === "ENT"
                          ? travel.provenance || "—"
                          : travel.destination || "—"}
                      </p>
                    </div>

                    {/* Details */}
                    {travel.details && (
                      <div className="mb-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-700">
                        <p className="text-xs text-muted-light dark:text-muted font-medium mb-1">Observations</p>
                        <p className="text-sm text-text-light dark:text-text">{travel.details}</p>
                      </div>
                    )}

                    {/* Transaction Hash */}
                    {travel.tx_hash && (
                      <div className="text-xs text-muted-light dark:text-muted font-mono pt-2 border-t border-gray-200 dark:border-gray-700">
                        <p className="truncate">🔗 {travel.tx_hash.substring(0, 20)}...</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-lg text-muted-light dark:text-muted mb-2">
                  ✈️ Aucun voyage enregistré
                </p>
                <p className="text-sm text-muted-light dark:text-muted">
                  Les mouvements frontières apparaîtront ici une fois enregistrés.
                </p>
              </div>
            )}
          </div>
        </section>
      )}

      {result && result.code !== 200 && <AlertResult {...result} />}
    </div>
  );
}
