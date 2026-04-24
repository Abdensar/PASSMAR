import { useState } from "react";
import { api, formatError } from "../services/apiClient";
import AlertResult from "../components/AlertResult";
import toast from "react-hot-toast";

export default function PoliceTravelHistoryPage() {
  const [num, setNum] = useState("");
  const [mrz, setMrz] = useState("");
  const [history, setHistory] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  async function loadTravelHistory(e) {
    e.preventDefault();
    if (!num.trim() || !mrz.trim()) {
      toast.error("Saisissez le numéro et le MRZ");
      return;
    }
    setResult(null);
    setHistory(null);
    setLoading(true);
    try {
      const cred = await api.lookupPassport(num.trim(), mrz.trim());
      const h = cred?.active_hmac_hash || cred?.offchain?.hmac_hash;
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
          éventuels renouvellements), à partir du n° et du MRZ saisis.
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
          <div>
            <label className="block text-sm font-medium text-text-light dark:text-text mb-2" htmlFor="hist-mrz">
              MRZ
            </label>
            <input
              id="hist-mrz"
              type="text"
              value={mrz}
              onChange={(e) => setMrz(e.target.value)}
              className="w-full px-3 py-2 bg-background-light dark:bg-background border border-gray-300 dark:border-gray-600 rounded-lg font-mono text-sm text-text-light dark:text-text focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Ligne MRZ"
              autoComplete="off"
              required
            />
          </div>
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading || !num.trim() || !mrz.trim()}
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
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-blockchain/10">
            <h2 className="text-sm font-semibold text-text-light dark:text-text">Mouvements enregistrés</h2>
            {history.onchain_count != null && (
              <p className="text-xs text-muted-light dark:text-muted mt-1">Preuves on-chain : {history.onchain_count}</p>
            )}
          </div>
          <div className="overflow-x-auto">
            {offchainTravels.length > 0 ? (
              <table className="w-full text-sm text-left">
                <thead className="bg-background-light dark:bg-background/80 text-muted-light dark:text-muted uppercase text-xs">
                  <tr>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Checkpoint</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Détails</th>
                  </tr>
                </thead>
                <tbody className="text-text-light dark:text-text">
                  {offchainTravels.map((travel) => (
                    <tr
                      key={travel.tx_hash}
                      className="border-t border-gray-100 dark:border-gray-700/80 hover:bg-background-light/60 dark:hover:bg-background/30"
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        {travel.type_mvt === "ENT" ? "Entrée" : "Sortie"}
                      </td>
                      <td className="px-4 py-3">{travel.checkpoint}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {new Date(travel.created_at || travel.date_passage).toLocaleString("fr-FR")}
                      </td>
                      <td className="px-4 py-3 max-w-xs truncate" title={travel.details || ""}>
                        {travel.details || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="p-6 text-muted-light dark:text-muted text-sm">
                Aucun voyage enregistré pour le passeport actif.
              </p>
            )}
          </div>
        </section>
      )}

      {result && result.code !== 200 && <AlertResult {...result} />}
    </div>
  );
}
