import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { api, formatError } from "../services/apiClient";
import PassportForm from "../components/PassportForm";
import TravelLog from "../components/TravelLog";
import SidebarLayout from "../components/SidebarLayout";
import AlertResult from "../components/AlertResult";
import HashDisplay from "../components/HashDisplay";
import PassportDetailCards from "../components/PassportDetailCards";
import toast from 'react-hot-toast';

export default function DashboardDouane({ agent, onLogout }) {
  const nav = useNavigate();
  const [currentPage, setCurrentPage] = useState("create");
  const [renew, setRenew] = useState({
    num_passeport: "",
    mrz: "",
    nouveau_num_passeport: "",
    nouveau_mrz: "",
    date_expiration: "",
    motif: "EXPIRATION",
  });
  const [revoke, setRevoke] = useState({ hmac_hash: "", raison: "VOLE" });
  const [foreign, setForeign] = useState({
    nationalite: "",
    num_passeport_etr: "",
    type_mvt: "ENT",
    checkpoint: "",
    date_passage: "",
    details: "",
  });
  const [consultNum, setConsultNum] = useState("");
  const [consultMrz, setConsultMrz] = useState("");
  const [lookupRes, setLookupRes] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  async function doLogout() {
    await api.logout();
    onLogout();
    nav("/login");
  }

  async function submitRenew(e) {
    e.preventDefault();
    setResult(null);
    setLoading(true);
    try {
      const payload = {
        ...renew,
        date_expiration: renew.date_expiration ? new Date(renew.date_expiration).toISOString() : "",
      };
      const out = await api.post("/passport/renew", payload);
      setResult({ code: 200, message: "Passeport renouvelé avec succès", data: out });
      toast.success("Passeport renouvelé !");
    } catch (ex) {
      setResult({ code: ex.status || 500, message: formatError(ex) });
      toast.error(formatError(ex));
    } finally {
      setLoading(false);
    }
  }

  async function submitRevoke(e) {
    e.preventDefault();
    setResult(null);
    setLoading(true);
    try {
      const out = await api.post("/passport/revoke/initiate", revoke);
      setResult({ code: 200, message: "Demande de révocation initiée", data: out });
      toast.success("Demande de révocation soumise !");
    } catch (ex) {
      setResult({ code: ex.status || 500, message: formatError(ex) });
      toast.error(formatError(ex));
    } finally {
      setLoading(false);
    }
  }

  async function submitForeign(e) {
    e.preventDefault();
    setResult(null);
    setLoading(true);
    try {
      const payload = {
        ...foreign,
        date_passage: foreign.date_passage ? new Date(foreign.date_passage).toISOString() : "",
      };
      const out = await api.post("/passport/foreign-travel", payload);
      setResult({ code: 200, message: "Voyage étranger enregistré", data: out });
      toast.success("Voyage enregistré !");
    } catch (ex) {
      setResult({ code: ex.status || 500, message: formatError(ex) });
      toast.error(formatError(ex));
    } finally {
      setLoading(false);
    }
  }

  const loadConsultByCredentials = useCallback(async (n, m, opts = {}) => {
    const { silentToast = false } = opts;
    const nt = String(n ?? "").trim();
    const mt = String(m ?? "").trim();
    setResult(null);
    setLookupRes(null);
    setLoading(true);
    try {
      const out = await api.lookupPassport(nt, mt);
      setLookupRes(out);
      setResult({ code: 200, message: "Passeport trouvé" });
      if (!silentToast) toast.success("Fiche passeport chargée");
    } catch (ex) {
      setResult({ code: ex.status || 500, message: formatError(ex) });
      toast.error(formatError(ex));
    } finally {
      setLoading(false);
    }
  }, []);

  async function loadPassport(e) {
    e.preventDefault();
    await loadConsultByCredentials(consultNum, consultMrz);
  }

  const onSelectPassportVersionConsult = useCallback(
    async ({ num_passeport, mrz: mrzVal }) => {
      setConsultNum(String(num_passeport ?? ""));
      setConsultMrz(String(mrzVal ?? ""));
      await loadConsultByCredentials(num_passeport, mrzVal, { silentToast: true });
      toast.success("Fiche de la version sélectionnée");
    },
    [loadConsultByCredentials]
  );

  const renderContent = () => {
    switch (currentPage) {
      case "create":
        return <PassportForm />;
      case "travel":
        return <TravelLog />;
      case "renew":
        return (
          <div className="max-w-2xl">
            <h2 className="text-2xl font-bold mb-6 text-text-light dark:text-text">Renouvellement de Passeport</h2>
            <div className="bg-surface-light dark:bg-surface-dark border border-gray-200 dark:border-gray-700 rounded-xl p-6">
              <form onSubmit={submitRenew} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text-light dark:text-text mb-2">
                      Ancien n° passeport
                    </label>
                    <input
                      type="text"
                      value={renew.num_passeport}
                      onChange={(e) => setRenew({ ...renew, num_passeport: e.target.value })}
                      className="w-full px-3 py-2 bg-background-light dark:bg-background border border-gray-300 dark:border-gray-600 rounded-lg text-text-light dark:text-text placeholder-muted-light dark:placeholder-muted focus:outline-none focus:ring-2 focus:ring-primary-light dark:focus:ring-primary"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-light dark:text-text mb-2">
                      Nouveau n° passeport
                    </label>
                    <input
                      type="text"
                      value={renew.nouveau_num_passeport}
                      onChange={(e) => setRenew({ ...renew, nouveau_num_passeport: e.target.value })}
                      className="w-full px-3 py-2 bg-background-light dark:bg-background border border-gray-300 dark:border-gray-600 rounded-lg text-text-light dark:text-text placeholder-muted-light dark:placeholder-muted focus:outline-none focus:ring-2 focus:ring-primary"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-light dark:text-text mb-2">
                    Ancien MRZ
                  </label>
                  <input
                    type="text"
                    value={renew.mrz}
                    onChange={(e) => setRenew({ ...renew, mrz: e.target.value })}
                    className="w-full px-3 py-2 bg-background-light dark:bg-background border border-gray-300 dark:border-gray-600 rounded-lg text-text-light dark:text-text placeholder-muted-light dark:placeholder-muted focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-light dark:text-text mb-2">
                    Nouveau MRZ
                  </label>
                  <input
                    type="text"
                    value={renew.nouveau_mrz}
                    onChange={(e) => setRenew({ ...renew, nouveau_mrz: e.target.value })}
                    className="w-full px-3 py-2 bg-background-light dark:bg-background border border-gray-300 dark:border-gray-600 rounded-lg text-text-light dark:text-text placeholder-muted-light dark:placeholder-muted focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text-light dark:text-text mb-2">
                      Nouvelle expiration
                    </label>
                    <input
                      type="date"
                      value={renew.date_expiration}
                      onChange={(e) => setRenew({ ...renew, date_expiration: e.target.value })}
                      className="w-full px-3 py-2 bg-background-light dark:bg-background border border-gray-300 dark:border-gray-600 rounded-lg text-text-light dark:text-text focus:outline-none focus:ring-2 focus:ring-primary"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-light dark:text-text mb-2">
                      Motif
                    </label>
                    <select
                      value={renew.motif}
                      onChange={(e) => setRenew({ ...renew, motif: e.target.value })}
                      className="w-full px-3 py-2 bg-background-light dark:bg-background border border-gray-300 dark:border-gray-600 rounded-lg text-text-light dark:text-text focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="EXPIRATION">EXPIRATION</option>
                      <option value="PERTE">PERTE</option>
                      <option value="DETERIORATION">DETERIORATION</option>
                    </select>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Renouvellement...
                    </>
                  ) : (
                    'Renouveler'
                  )}
                </button>
              </form>
            </div>
            {result && <AlertResult {...result} />}
            {result?.data?.nouveau_hmac_hash && (
              <div className="mt-4 space-y-2">
                <HashDisplay hash={result.data.nouveau_hmac_hash} label="Nouveau hash (passeport actif)" />
                {result.data.tx_hash && <HashDisplay hash={result.data.tx_hash} label="Transaction renouvellement" />}
              </div>
            )}
          </div>
        );
      case "revoke":
        return (
          <div className="max-w-2xl">
            <h2 className="text-2xl font-bold mb-6 text-text-light dark:text-text">Révocation de Passeport</h2>
            <div className="bg-surface-light dark:bg-surface-dark border border-gray-200 dark:border-gray-700 rounded-xl p-6">
              <p className="text-text-light dark:text-text mb-4">Initier une demande de révocation (validation admin requise)</p>
              <form onSubmit={submitRevoke} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text-light dark:text-text mb-2">
                    HMAC Hash
                  </label>
                  <input
                    type="text"
                    value={revoke.hmac_hash}
                    onChange={(e) => setRevoke({ ...revoke, hmac_hash: e.target.value })}
                    className="w-full px-3 py-2 bg-background-light dark:bg-background border border-gray-300 dark:border-gray-600 rounded-lg text-text-light dark:text-text placeholder-muted-light dark:placeholder-muted focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-light dark:text-text mb-2">
                    Raison
                  </label>
                  <select
                    value={revoke.raison}
                    onChange={(e) => setRevoke({ ...revoke, raison: e.target.value })}
                    className="w-full px-3 py-2 bg-background-light dark:bg-background border border-gray-300 dark:border-gray-600 rounded-lg text-text-light dark:text-text focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="VOLE">VOLÉ</option>
                    <option value="PERDU">PERDU</option>
                    <option value="FALSIFIE">FALSIFIÉ</option>
                    <option value="DECES">DÉCÈS</option>
                    <option value="JUDICIAIRE">JUDICIAIRE</option>
                  </select>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Soumission...
                    </>
                  ) : (
                    'Soumettre la demande'
                  )}
                </button>
              </form>
            </div>
            {result && <AlertResult {...result} />}
          </div>
        );
      case "foreign":
        return (
          <div className="max-w-2xl">
            <h2 className="text-2xl font-bold mb-6 text-text-light dark:text-text">Voyage Étranger</h2>
            <div className="bg-surface-light dark:bg-surface-dark border border-gray-200 dark:border-gray-700 rounded-xl p-6">
              <p className="text-text-light dark:text-text mb-4">Enregistrement des voyages de passeports étrangers (MongoDB uniquement)</p>
              <form onSubmit={submitForeign} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text-light dark:text-text mb-2">
                      Nationalité
                    </label>
                    <input
                      type="text"
                      value={foreign.nationalite}
                      onChange={(e) => setForeign({ ...foreign, nationalite: e.target.value })}
                      className="w-full px-3 py-2 bg-background-light dark:bg-background border border-gray-300 dark:border-gray-600 rounded-lg text-text-light dark:text-text placeholder-muted-light dark:placeholder-muted focus:outline-none focus:ring-2 focus:ring-primary"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-light dark:text-text mb-2">
                      N° passeport étranger
                    </label>
                    <input
                      type="text"
                      value={foreign.num_passeport_etr}
                      onChange={(e) => setForeign({ ...foreign, num_passeport_etr: e.target.value })}
                      className="w-full px-3 py-2 bg-background-light dark:bg-background border border-gray-300 dark:border-gray-600 rounded-lg text-text-light dark:text-text placeholder-muted-light dark:placeholder-muted focus:outline-none focus:ring-2 focus:ring-primary"
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text-light dark:text-text mb-2">
                      Type de mouvement
                    </label>
                    <select
                      value={foreign.type_mvt}
                      onChange={(e) => setForeign({ ...foreign, type_mvt: e.target.value })}
                      className="w-full px-3 py-2 bg-background-light dark:bg-background border border-gray-300 dark:border-gray-600 rounded-lg text-text-light dark:text-text focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="ENT">Entrée</option>
                      <option value="SOR">Sortie</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-light dark:text-text mb-2">
                      Checkpoint
                    </label>
                    <input
                      type="text"
                      value={foreign.checkpoint}
                      onChange={(e) => setForeign({ ...foreign, checkpoint: e.target.value })}
                      className="w-full px-3 py-2 bg-background-light dark:bg-background border border-gray-300 dark:border-gray-600 rounded-lg text-text-light dark:text-text placeholder-muted-light dark:placeholder-muted focus:outline-none focus:ring-2 focus:ring-primary"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-light dark:text-text mb-2">
                    Date de passage
                  </label>
                  <input
                    type="datetime-local"
                    value={foreign.date_passage}
                    onChange={(e) => setForeign({ ...foreign, date_passage: e.target.value })}
                    className="w-full px-3 py-2 bg-background-light dark:bg-background border border-gray-300 dark:border-gray-600 rounded-lg text-text-light dark:text-text focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-light dark:text-text mb-2">
                    Détails
                  </label>
                  <textarea
                    value={foreign.details}
                    onChange={(e) => setForeign({ ...foreign, details: e.target.value })}
                    className="w-full px-3 py-2 bg-background-light dark:bg-background border border-gray-300 dark:border-gray-600 rounded-lg text-text-light dark:text-text placeholder-muted-light dark:placeholder-muted focus:outline-none focus:ring-2 focus:ring-primary"
                    rows="3"
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
                      Enregistrement...
                    </>
                  ) : (
                    'Enregistrer'
                  )}
                </button>
              </form>
            </div>
            {result && <AlertResult {...result} />}
          </div>
        );
      case "consult":
        return (
          <div className="max-w-4xl">
            <h2 className="text-2xl font-bold mb-2 text-text-light dark:text-text">Consulter un passeport</h2>
            <p className="text-sm text-muted-light dark:text-muted mb-6">
              Saisissez le numéro et le MRZ lus sur le document — pas besoin du hash HMAC.
            </p>
            <div className="bg-surface-light dark:bg-surface-dark border border-gray-200 dark:border-gray-700 rounded-xl p-6">
              <form onSubmit={loadPassport} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text-light dark:text-text mb-2">
                    N° passeport
                  </label>
                  <input
                    type="text"
                    value={consultNum}
                    onChange={(e) => setConsultNum(e.target.value)}
                    className="w-full px-3 py-2 bg-background-light dark:bg-background border border-gray-300 dark:border-gray-600 rounded-lg text-text-light dark:text-text focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Ex. MA0012345678"
                    autoComplete="off"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-light dark:text-text mb-2">MRZ</label>
                  <input
                    type="text"
                    value={consultMrz}
                    onChange={(e) => setConsultMrz(e.target.value)}
                    className="w-full px-3 py-2 bg-background-light dark:bg-background border border-gray-300 dark:border-gray-600 rounded-lg font-mono text-sm text-text-light dark:text-text focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Ligne MRZ du document"
                    required
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
                      Recherche...
                    </>
                  ) : (
                    "Afficher la fiche"
                  )}
                </button>
              </form>
            </div>
            {lookupRes && (
              <PassportDetailCards data={lookupRes} onSelectPassportVersion={onSelectPassportVersionConsult} />
            )}
            {result && result.code !== 200 && <AlertResult {...result} />}
          </div>
        );
      default:
        return <div>Page non trouvée</div>;
    }
  };

  const navigationItems = [
    { key: 'create', icon: '📋', label: 'Créer Passeport' },
    { key: 'travel', icon: '✈️', label: 'Enregistrer Voyage' },
    { key: 'renew', icon: '🔄', label: 'Renouveler' },
    { key: 'revoke', icon: '🚫', label: 'Révoquer' },
    { key: 'foreign', icon: '🌍', label: 'Étranger' },
    { key: 'consult', icon: '🔍', label: 'Consulter' },
  ];

  return (
    <SidebarLayout
      role="DOUANE"
      agentName={agent?.identifiant}
      onLogout={doLogout}
      navigationItems={navigationItems}
      onNavigate={setCurrentPage}
    >
      {renderContent()}
    </SidebarLayout>
  );
}

