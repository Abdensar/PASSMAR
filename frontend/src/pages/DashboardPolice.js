import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, formatError, fetchJson } from "../services/apiClient";
import SidebarLayout from "../components/SidebarLayout";
import AlertResult from "../components/AlertResult";
import HashDisplay from "../components/HashDisplay";
import StatusBadge from "../components/StatusBadge";
import toast from 'react-hot-toast';

export default function DashboardPolice({ agent, onLogout }) {
  const nav = useNavigate();
  const [currentPage, setCurrentPage] = useState("verify");
  const [hash, setHash] = useState("");
  const [history, setHistory] = useState(null);
  const [lookup, setLookup] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const navigationItems = [
    { key: 'verify', icon: '🔍', label: 'Vérifier Passeport' },
    { key: 'history', icon: '📜', label: 'Historique Voyages' },
  ];

  async function doLogout() {
    await api.logout();
    onLogout();
    nav("/login");
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

  async function loadPassport(e) {
    e.preventDefault();
    setResult(null);
    setLookup(null);
    setLoading(true);
    try {
      const out = await api.get(`/passport/${encodeURIComponent(hash)}`);
      setLookup(out);
      setResult({ code: 200, message: "Passeport trouvé", data: out });
    } catch (ex) {
      setResult({ code: ex.response?.status || 500, message: formatError(ex) });
      toast.error(formatError(ex));
    } finally {
      setLoading(false);
    }
  }

  const renderContent = () => {
    switch (currentPage) {
      case "verify":
        return <VerifyForm />;
      case "history":
        return (
          <div className="max-w-4xl">
            <h2 className="text-2xl font-bold mb-6 text-text-light dark:text-text">Historique des Voyages</h2>
            <div className="bg-surface-light dark:bg-surface-dark border border-gray-200 dark:border-gray-700 rounded-xl p-6">
              <form onSubmit={loadPassport} className="space-y-4">
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
                <div className="flex gap-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center gap-2"
                  >
                    {loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Chargement...
                      </>
                    ) : (
                      'Charger Passeport'
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={loadHistory}
                    disabled={loading}
                    className="bg-blockchain hover:bg-blockchain/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center gap-2"
                  >
                    {loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Chargement...
                      </>
                    ) : (
                      'Historique Voyages'
                    )}
                  </button>
                </div>
              </form>
            </div>
            {lookup && (
              <div className="mt-6">
                <div className="bg-surface-light dark:bg-surface-dark border border-gray-200 dark:border-gray-700 rounded-xl p-6">
                  <h3 className="text-lg font-semibold mb-4 text-text-light dark:text-text">Informations du Passeport</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm text-muted-light dark:text-muted">Numéro:</span>
                      <p className="text-white font-mono">{lookup.num_passeport || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-sm text-muted-light dark:text-muted">Statut:</span>
                      <div className="mt-1">
                        <StatusBadge statut={lookup.statut || 'ACTIF'} />
                      </div>
                    </div>
                    <div>
                      <span className="text-sm text-muted-light dark:text-muted">Expiration:</span>
                      <p className="text-white">{lookup.date_expiration ? new Date(lookup.date_expiration).toLocaleDateString('fr-FR') : 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-sm text-muted-light dark:text-muted">Interdiction de sortie:</span>
                      <p className="text-white">{lookup.interdiction_sortie ? 'Oui' : 'Non'}</p>
                    </div>
                  </div>
                  {lookup.hmac_hash && <HashDisplay hash={lookup.hmac_hash} label="Hash HMAC" />}
                  {lookup.txHash && <HashDisplay hash={lookup.txHash} label="Transaction Blockchain" />}
                </div>
              </div>
            )}
            {history && (
              <div className="mt-6">
                <div className="bg-surface-light dark:bg-surface-dark border border-gray-200 dark:border-gray-700 rounded-xl p-6">
                  <h3 className="text-lg font-semibold mb-4 text-text-light dark:text-text">Historique des Voyages</h3>
                  {history.length > 0 ? (
                    <div className="space-y-3">
                      {history.map((travel, index) => (
                        <div key={index} className="bg-gray-700/50 rounded-lg p-4">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <span className="text-sm text-muted-light dark:text-muted">Type:</span>
                              <p className="text-white">{travel.type_mvt === 'ENT' ? 'Entrée' : 'Sortie'}</p>
                            </div>
                            <div>
                              <span className="text-sm text-muted-light dark:text-muted">Checkpoint:</span>
                              <p className="text-white">{travel.checkpoint}</p>
                            </div>
                            <div>
                              <span className="text-sm text-muted-light dark:text-muted">Date:</span>
                              <p className="text-white">{new Date(travel.date_passage).toLocaleString('fr-FR')}</p>
                            </div>
                          </div>
                          {travel.details && (
                            <div className="mt-2">
                              <span className="text-sm text-muted-light dark:text-muted">Détails:</span>
                              <p className="text-white text-sm">{travel.details}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-400">Aucun voyage trouvé</p>
                  )}
                </div>
              </div>
            )}
            {result && <AlertResult {...result} />}
          </div>
        );
      default:
        return <div>Page non trouvée</div>;
    }
  };

  return (
    <SidebarLayout
      role="POLICE"
      agentName={agent?.identifiant}
      onLogout={doLogout}
      navigationItems={navigationItems}
      onNavigate={setCurrentPage}
    >
      {renderContent()}
    </SidebarLayout>
  );
}

// VerifyForm component integrated
function VerifyForm() {
  const [num, setNum] = useState("");
  const [mrz, setMrz] = useState("");
  const [res, setRes] = useState(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setErr("");
    setRes(null);
    setLoading(true);
    try {
      const q = new URLSearchParams({ num, mrz }).toString();
      const { status, data } = await fetchJson(`/passport/verify?${q}`, { method: "GET" });
      if (!data || typeof data !== "object") {
        setErr(`Réponse invalide (${status})`);
      } else {
        setRes(data);
      }
    } catch (ex) {
      setErr(formatError(ex));
    } finally {
      setLoading(false);
    }
  }

  const getStatusDisplay = (data) => {
    if (!data) return null;

    const status = data.statut_effectif || data.code || 'ACTIF';
    const isExpired = status === 'EXPIRE';
    const isRevoked = status === 'REVOQUE';
    const isSuspect = data.code === 'HASH_INTROUVABLE';
    const isInterdit = data.interdiction_sortie === true;

    let displayStatus = status;
    if (isExpired) displayStatus = 'EXPIRÉ';
    if (isRevoked) displayStatus = 'RÉVOQUÉ';
    if (isSuspect) displayStatus = 'SUSPECT';
    if (isInterdit) displayStatus = 'INTERDIT';

    let colorClass = 'bg-valid';
    let borderColor = 'border-valid';
    if (displayStatus === 'EXPIRÉ') {
      colorClass = 'bg-warning';
      borderColor = 'border-warning';
    } else if (displayStatus === 'RÉVOQUÉ' || displayStatus === 'SUSPECT' || displayStatus === 'INTERDIT') {
      colorClass = 'bg-red-500';
      borderColor = 'border-red-500';
    }

    return {
      status: displayStatus,
      colorClass,
      borderColor,
      icon: displayStatus === 'ACTIF' ? '✅' : displayStatus === 'EXPIRÉ' ? '⚠️' : '🚨',
      message: data.message || `Passeport ${displayStatus.toLowerCase()}`,
      details: data
    };
  };

  const statusInfo = res ? getStatusDisplay(res) : null;

  return (
    <div className="max-w-2xl">
      <h2 className="text-2xl font-bold mb-6 text-text-light dark:text-text">Vérifier l'Authenticité du Passeport</h2>
      <div className="bg-surface-light dark:bg-surface-dark border border-gray-200 dark:border-gray-700 rounded-xl p-6">
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-light dark:text-text mb-2">
              N° Passeport
            </label>
            <input
              type="text"
              value={num}
              onChange={(e) => setNum(e.target.value)}
              className="w-full px-3 py-2 bg-background-light dark:bg-background border border-gray-300 dark:border-gray-600 rounded-lg text-text-light dark:text-text placeholder-muted-light dark:placeholder-muted focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Numéro du passeport"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-light dark:text-text mb-2">
              MRZ
            </label>
            <input
              type="text"
              value={mrz}
              onChange={(e) => setMrz(e.target.value)}
              className="w-full px-3 py-2 bg-background-light dark:bg-background border border-gray-300 dark:border-gray-600 rounded-lg text-text-light dark:text-text placeholder-muted-light dark:placeholder-muted focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Code MRZ"
              required
            />
          </div>
          {err && (
            <div className="bg-red-500/10 border border-red-500 rounded-lg p-3">
              <p className="text-red-400 text-sm">{err}</p>
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Vérification...
              </>
            ) : (
              'Vérifier'
            )}
          </button>
        </form>
      </div>

      {statusInfo && (
        <div className={`mt-6 p-8 rounded-xl border-2 ${statusInfo.borderColor} bg-gray-800/50`}>
          <div className="text-center">
            <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full ${statusInfo.colorClass} text-white text-3xl mb-4`}>
              {statusInfo.icon}
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">{statusInfo.message}</h3>
            <StatusBadge statut={statusInfo.status} />
            {statusInfo.details.interdiction_sortie && (
              <p className="text-red-400 mt-2 font-semibold">🚫 Interdiction de sortie du territoire</p>
            )}
            {statusInfo.details.raison_revocation && (
              <p className="text-red-400 mt-2">Raison: {statusInfo.details.raison_revocation}</p>
            )}
          </div>
          {statusInfo.details.hmac_hash && (
            <div className="mt-6">
              <HashDisplay hash={statusInfo.details.hmac_hash} label="Hash du Passeport" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

