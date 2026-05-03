import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { api, formatError } from "../services/apiClient";
import PassportForm from "../components/PassportForm";
import TravelLog from "../components/TravelLog";
import SidebarLayout from "../components/SidebarLayout";
import AlertResult from "../components/AlertResult";
import HashDisplay from "../components/HashDisplay";
import PassportDetailCards from "../components/PassportDetailCards";
import StatusBadge from "../components/StatusBadge";
import toast from 'react-hot-toast';

export default function DashboardDouane({ agent, onLogout }) {
  const nav = useNavigate();
  const [currentPage, setCurrentPage] = useState("create");
  const [renew, setRenew] = useState({
    num_passeport: "",
    nouveau_num_passeport: "",
    motif: "EXPIRATION",
  });
  const [revoke, setRevoke] = useState({ num_passeport: "", raison: "VOLE" });
  const [foreign, setForeign] = useState({
    nationalite: "",
    num_passeport_etr: "",
    type_mvt: "ENT",
    checkpoint: "",
    date_passage: "",
    details: "",
  });
  const [consultNum, setConsultNum] = useState("");
  const [lookupRes, setLookupRes] = useState(null);
  const [cinHistory, setCinHistory] = useState(null);
  const [travelHistory, setTravelHistory] = useState(null);
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
        num_passeport: renew.num_passeport,
        nouveau_num_passeport: renew.nouveau_num_passeport,
        motif: renew.motif,
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
      const payload = {
        num_passeport: String(revoke.num_passeport || "").trim(),
        raison: revoke.raison,
      };
      const out = await api.post("/passport/revoke/initiate", payload);
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
    setCinHistory(null);
    setTravelHistory(null);
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
    await loadConsultByCredentials(consultNum);
  }

  const onSelectPassportVersionConsult = useCallback(
    async ({ num_passeport, mrz: mrzVal }) => {
      setConsultNum(String(num_passeport ?? ""));
      await loadConsultByCredentials(num_passeport, mrzVal, { silentToast: true });
      toast.success("Fiche de la version sélectionnée");
    },
    [loadConsultByCredentials]
  );

  const loadCINHistory = useCallback(async (cin) => {
    setCinHistory(null);
    setLoading(true);
    try {
      const out = await api.getCINHistory(cin);
      setCinHistory(out);
      toast.success("Historique complet chargé");
    } catch (ex) {
      toast.error(formatError(ex));
    } finally {
      setLoading(false);
    }
  }, []);

  const loadTravelHistory = useCallback(async (numPasseport, mrz) => {
    setTravelHistory(null);
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("num", numPasseport);
      if (mrz) params.append("mrz", mrz);
      const passportData = await api.get(`/passport/lookup?${params.toString()}`);
      const hmacHash = passportData.offchain?.hmac_hash || passportData.hmac_hash;
      
      if (!hmacHash) {
        throw new Error("Impossible de trouver le hash du passeport");
      }
      
      // Fetch travel history for this passport
      const out = await api.get(`/passport/${encodeURIComponent(hmacHash)}/travels`);
      setTravelHistory(out);
      toast.success("Historique de voyage chargé");
    } catch (ex) {
      toast.error(formatError(ex));
    } finally {
      setLoading(false);
    }
  }, []);

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
                      N° Passeport Actuel
                    </label>
                    <input
                      type="text"
                      value={renew.num_passeport}
                      onChange={(e) => setRenew({ ...renew, num_passeport: e.target.value })}
                      className="w-full px-3 py-2 bg-background-light dark:bg-background border border-gray-300 dark:border-gray-600 rounded-lg text-text-light dark:text-text placeholder-muted-light dark:placeholder-muted focus:outline-none focus:ring-2 focus:ring-primary-light dark:focus:ring-primary"
                      placeholder="Comme sur le document"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-light dark:text-text mb-2">
                      Nouveau N° Passeport
                    </label>
                    <input
                      type="text"
                      value={renew.nouveau_num_passeport}
                      onChange={(e) => setRenew({ ...renew, nouveau_num_passeport: e.target.value })}
                      className="w-full px-3 py-2 bg-background-light dark:bg-background border border-gray-300 dark:border-gray-600 rounded-lg text-text-light dark:text-text placeholder-muted-light dark:placeholder-muted focus:outline-none focus:ring-2 focus:ring-primary-light dark:focus:ring-primary"
                      placeholder="Nouveau numéro"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-light dark:text-text mb-2">
                    Motif du Renouvellement
                  </label>
                  <select
                    value={renew.motif}
                    onChange={(e) => setRenew({ ...renew, motif: e.target.value })}
                    className="w-full px-3 py-2 bg-background-light dark:bg-background border border-gray-300 dark:border-gray-600 rounded-lg text-text-light dark:text-text focus:outline-none focus:ring-2 focus:ring-primary-light dark:focus:ring-primary"
                  >
                    <option value="EXPIRATION">EXPIRATION</option>
                    <option value="PERTE">PERTE</option>
                    <option value="DETERIORATION">DETERIORATION</option>
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
                      Renouvellement...
                    </>
                  ) : (
                    'Renouveler'
                  )}
                </button>
              </form>
            </div>
            {result && result.code === 200 && result.data && (
              <div className="mt-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 border-2 border-blue-300 dark:border-blue-700 rounded-xl p-6 shadow-lg">
                <div className="flex items-start gap-4">
                  <div className="text-4xl">🔄</div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-blue-800 dark:text-blue-300 mb-4">
                      Passeport Renouvelé avec Succès
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* New Passport Number */}
                      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-blue-200 dark:border-blue-700">
                        <p className="text-xs text-muted-light dark:text-muted uppercase font-bold tracking-wide mb-1">Nouveau N° Passeport</p>
                        <p className="text-lg font-bold text-text-light dark:text-text">{renew.nouveau_num_passeport}</p>
                      </div>

                      {/* Expiration Date */}
                      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-blue-200 dark:border-blue-700">
                        <p className="text-xs text-muted-light dark:text-muted uppercase font-bold tracking-wide mb-1">Nouvelle Date d'Expiration</p>
                        <p className="text-lg font-bold text-text-light dark:text-text">
                          {new Date(Date.now() + 5 * 365 * 24 * 60 * 60 * 1000).toLocaleDateString("fr-FR")}
                        </p>
                      </div>

                      {/* Motif */}
                      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-blue-200 dark:border-blue-700">
                        <p className="text-xs text-muted-light dark:text-muted uppercase font-bold tracking-wide mb-1">Motif du Renouvellement</p>
                        <p className="text-lg font-bold text-text-light dark:text-text">{renew.motif}</p>
                      </div>

                      {/* Date of Renewal */}
                      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-blue-200 dark:border-blue-700">
                        <p className="text-xs text-muted-light dark:text-muted uppercase font-bold tracking-wide mb-1">Date du Renouvellement</p>
                        <p className="text-lg font-bold text-text-light dark:text-text">
                          {new Date().toLocaleDateString("fr-FR")}
                        </p>
                      </div>
                    </div>

                    {/* Blockchain Proof */}
                    {result.data.tx_hash && (
                      <div className="mt-4 bg-white dark:bg-gray-800 rounded-lg p-4 border-2 border-blue-300 dark:border-blue-600">
                        <p className="text-xs text-muted-light dark:text-muted uppercase font-bold tracking-wide mb-3">
                          ⛓️ Preuve Blockchain
                        </p>
                        <HashDisplay hash={result.data.tx_hash} label="Transaction de renouvellement" />
                      </div>
                    )}

                    {/* New Passport Hash */}
                    {result.data.nouveau_hmac_hash && (
                      <div className="mt-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border border-blue-200 dark:border-blue-700">
                        <p className="text-xs text-muted-light dark:text-muted font-mono mb-2">Hash HMAC du Nouveau Passeport</p>
                        <p className="text-xs font-mono text-text-light dark:text-text break-all">
                          {result.data.nouveau_hmac_hash}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            {result && result.code !== 200 && <AlertResult {...result} />}
          </div>
        );
      case "revoke":
        return (
          <div className="max-w-2xl">
            <h2 className="text-2xl font-bold mb-6 text-text-light dark:text-text">Révocation de Passeport</h2>
            <div className="bg-surface-light dark:bg-surface-dark border border-gray-200 dark:border-gray-700 rounded-xl p-6">
              <p className="text-text-light dark:text-text mb-4">
                Initier une demande de révocation 
                <span className="text-sm text-muted-light dark:text-muted block mt-1">
                  • VOLÉ/PERDU/MODIFICATION INFO: Auto-approuvé (pas d'admin requis)<br/>
                  • FALSIFIÉ/DÉCÈS/JUDICIAIRE: Validation admin requise
                </span>
              </p>
              <form onSubmit={submitRevoke} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text-light dark:text-text mb-2">
                    N° passeport
                  </label>
                  <input
                    type="text"
                    value={revoke.num_passeport}
                    onChange={(e) => setRevoke({ ...revoke, num_passeport: e.target.value })}
                    className="w-full px-3 py-2 bg-background-light dark:bg-background border border-gray-300 dark:border-gray-600 rounded-lg text-text-light dark:text-text placeholder-muted-light dark:placeholder-muted focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Comme sur le document"
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
                    <option value="MODIFICATION_INFO">MODIFICATION INFO CLIENT</option>
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
              Saisissez le numéro de passeport — pas besoin du hash HMAC.
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
              <div className="space-y-4 mt-6">
                <PassportDetailCards data={lookupRes} onSelectPassportVersion={onSelectPassportVersionConsult} />
                
                {/* History and Travel Buttons */}
                <div className="flex gap-3 flex-wrap">
                  <button
                    onClick={() => loadCINHistory(lookupRes.offchain.cin)}
                    disabled={loading}
                    className="flex-1 min-w-[200px] bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                  >
                    {loading ? "Chargement..." : "📋 Historique complet (CIN)"}
                  </button>
                  <button
                    onClick={() => loadTravelHistory(lookupRes.offchain.num_passeport, lookupRes.offchain.mrz)}
                    disabled={loading}
                    className="flex-1 min-w-[200px] bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                  >
                    {loading ? "Chargement..." : "✈️ Historique de voyage"}
                  </button>
                </div>
              </div>
            )}

            {/* CIN History Display */}
            {cinHistory && (
              <div className="mt-6 bg-surface-light dark:bg-surface-dark border border-gray-200 dark:border-gray-700 rounded-xl p-6">
                <h3 className="text-lg font-bold mb-4 text-text-light dark:text-text">
                  Historique complet pour CIN: {cinHistory.cin}
                </h3>
                <div className="space-y-3">
                  {cinHistory.history.map((passport, idx) => (
                    <div key={idx} className="border border-gray-300 dark:border-gray-600 rounded-lg p-4 bg-background-light dark:bg-background">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-semibold text-text-light dark:text-text">
                            Passeport {idx + 1}: {passport.num_passeport}
                          </p>
                          <p className="text-sm text-muted-light dark:text-muted">MRZ: {passport.mrz}</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          passport.status === "ACTIF" 
                            ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300"
                            : passport.status.includes("REVOQUE")
                            ? "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300"
                            : "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300"
                        }`}>
                          {passport.status}
                        </span>
                      </div>
                      <div className="text-xs text-muted-light dark:text-muted space-y-1">
                        <p>Créé: {new Date(passport.created_at).toLocaleDateString("fr-FR")}</p>
                        <p>Hash: {passport.hmac_hash.substring(0, 16)}...</p>
                        {passport.revocation && (
                          <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded">
                            <p><strong>Raison:</strong> {passport.revocation.raison}</p>
                            <p><strong>Approuvé:</strong> {passport.revocation.allow_replacement ? "Oui" : "Non"}</p>
                          </div>
                        )}
                        {passport.lifecycle.supersedes && (
                          <p>↓ Remplace: {passport.lifecycle.supersedes.substring(0, 16)}...</p>
                        )}
                        {passport.lifecycle.superseded_by && (
                          <p>↓ Remplacé par: {passport.lifecycle.superseded_by.substring(0, 16)}...</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Travel History Display */}
            {travelHistory && (
              <div className="mt-6 bg-surface-light dark:bg-surface-dark border border-gray-200 dark:border-gray-700 rounded-xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-bold text-text-light dark:text-text">
                      ✈️ Historique de Voyage
                    </h3>
                    <p className="text-sm text-muted-light dark:text-muted mt-1">
                      Enregistrements des mouvements de ce passeport
                    </p>
                  </div>
                  {travelHistory.onchain_count != null && (
                    <span className="bg-blockchain/15 dark:bg-blockchain/25 text-blockchain-light dark:text-blockchain px-3 py-1 rounded-full text-sm font-semibold">
                      {travelHistory.onchain_count} sur chaîne
                    </span>
                  )}
                </div>
                
                {travelHistory.offchain && travelHistory.offchain.length > 0 ? (
                  <div className="grid grid-cols-1 gap-4">
                    {travelHistory.offchain.map((travel, idx) => (
                      <div
                        key={travel._id || travel.tx_hash || idx}
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
                            <p>🔗 Tx: {travel.tx_hash.substring(0, 20)}...</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-muted-light dark:text-muted text-lg">
                      ✈️ Aucun voyage enregistré pour ce passeport
                    </p>
                    <p className="text-sm text-muted-light dark:text-muted mt-2">
                      Les mouvements frontières apparaîtront ici une fois enregistrés.
                    </p>
                  </div>
                )}
              </div>
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

