import { useState, useCallback } from "react";
import { api, formatError } from "../services/apiClient";
import AlertResult from "../components/AlertResult";
import PassportDetailCards from "../components/PassportDetailCards";
import toast from "react-hot-toast";

export default function PolicePassportPage() {
  const [num, setNum] = useState("");
  const [lookup, setLookup] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadByCredentials = useCallback(async (n, opts = {}) => {
    const { silentToast = false } = opts;
    const nt = String(n ?? "").trim();
    setResult(null);
    setLookup(null);
    setLoading(true);
    try {
      const out = await api.lookupPassport(nt);
      setLookup(out);
      setResult({ code: 200, message: "Analyse terminée" });
      if (!silentToast) toast.success("Fiche chargée");
    } catch (ex) {
      setResult({ code: ex.status || 500, message: formatError(ex) });
      toast.error(formatError(ex));
    } finally {
      setLoading(false);
    }
  }, []);

  const onSelectPassportVersion = useCallback(
    async ({ num_passeport }) => {
      setNum(String(num_passeport ?? ""));
      await loadByCredentials(num_passeport, { silentToast: true });
      toast.success("Fiche de la version sélectionnée");
    },
    [loadByCredentials]
  );

  async function analyzeDocument(e) {
    e.preventDefault();
    await loadByCredentials(num);
  }

  return (
    <div className="max-w-5xl p-6 space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold text-text-light dark:text-text">Fiche & contrôle</h1>
        <p className="text-sm text-muted-light dark:text-muted max-w-xl">
          Saisissez le numéro de passeport pour afficher la fiche, la chaîne de renouvellements et le contrôle documentaire.
        </p>
      </header>

      <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-surface-light dark:bg-surface-dark p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-text-light dark:text-text mb-4 uppercase tracking-wide text-muted-light dark:text-muted">
          Document
        </h2>
        <form onSubmit={analyzeDocument} className="space-y-4 max-w-2xl">
          <div>
            <label className="block text-sm font-medium text-text-light dark:text-text mb-2" htmlFor="police-num">
              N° passeport
            </label>
            <input
              id="police-num"
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
              disabled={loading}
              className="inline-flex justify-center items-center gap-2 px-6 py-3 rounded-lg bg-primary hover:bg-primary/90 disabled:opacity-50 text-white font-semibold"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Chargement…
                </>
              ) : (
                "Afficher la fiche"
              )}
            </button>
          </div>
        </form>
      </section>

      {lookup && (
        <section className="space-y-3" aria-live="polite">
          <h2 className="text-sm font-semibold text-text-light dark:text-text uppercase tracking-wide text-muted-light dark:text-muted">
            Résultat
          </h2>
          <PassportDetailCards data={lookup} onSelectPassportVersion={onSelectPassportVersion} />
        </section>
      )}

      {result && result.code !== 200 && <AlertResult {...result} />}
    </div>
  );
}
