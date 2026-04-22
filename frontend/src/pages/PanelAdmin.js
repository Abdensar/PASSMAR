import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, formatError } from "../services/apiClient";
import SidebarLayout from "../components/SidebarLayout";
import AlertResult from "../components/AlertResult";
import HashDisplay from "../components/HashDisplay";
import AuditTable from "../components/AuditTable";
import toast from 'react-hot-toast';

export default function PanelAdmin({ agent, onLogout }) {
  const nav = useNavigate();
  const [currentPage, setCurrentPage] = useState("agents");
  const [agents, setAgents] = useState([]);
  const [pending, setPending] = useState([]);
  const [stats, setStats] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newAgent, setNewAgent] = useState({
    identifiant: "",
    password: "",
    role: "DOUANE",
    type_autorite: "DOUANE",
    nom_autorite: "Poste frontière",
  });
  const [ban, setBan] = useState({ hmac_hash: "", interdiction: true });
  const [confirmId, setConfirmId] = useState("");
  const [reject, setReject] = useState({ id_demande: "", notes: "" });

  const navigationItems = [
    { key: 'agents', icon: '👥', label: 'Agents' },
    { key: 'revocations', icon: '⚖️', label: 'Révocations' },
    { key: 'audit', icon: '📊', label: 'Audit Log' },
    { key: 'stats', icon: '📈', label: 'Statistiques' },
  ];

  async function doLogout() {
    await api.logout();
    onLogout();
    nav("/login");
  }

  async function refreshLists() {
    setLoading(true);
    try {
      const [a, p, s] = await Promise.all([
        api.get("/admin/agents"),
        api.get("/revocation/pending"),
        api.get("/admin/stats"),
      ]);
      setAgents(a.items || []);
      setPending(p.items || []);
      setStats(s);
    } catch (ex) {
      toast.error(formatError(ex));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshLists();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function createAgent(e) {
    e.preventDefault();
    setResult(null);
    setLoading(true);
    try {
      const out = await api.post("/admin/agents", newAgent);
      setResult({ code: 200, message: `Agent créé : ${out.agent?.identifiant}`, data: out });
      toast.success("Agent créé avec succès !");
      setShowCreateModal(false);
      setNewAgent({
        identifiant: "",
        password: "",
        role: "DOUANE",
        type_autorite: "DOUANE",
        nom_autorite: "Poste frontière",
      });
      refreshLists();
    } catch (ex) {
      setResult({ code: ex.response?.status || 500, message: formatError(ex) });
      toast.error(formatError(ex));
    } finally {
      setLoading(false);
    }
  }

  async function toggleAgent(id, is_active) {
    setLoading(true);
    try {
      await api.patch(`/admin/agents/${id}`, { is_active });
      toast.success(`Agent ${is_active ? 'activé' : 'désactivé'} !`);
      refreshLists();
    } catch (ex) {
      toast.error(formatError(ex));
    } finally {
      setLoading(false);
    }
  }

  async function confirmRevoke(id) {
    setResult(null);
    setLoading(true);
    try {
      const out = await api.post("/passport/revoke/confirm", { id_demande: id });
      setResult({ code: 200, message: "Révocation confirmée", data: out });
      toast.success("Révocation confirmée !");
      refreshLists();
    } catch (ex) {
      setResult({ code: ex.response?.status || 500, message: formatError(ex) });
      toast.error(formatError(ex));
    } finally {
      setLoading(false);
    }
  }

  async function rejectRevoke(id, notes) {
    setResult(null);
    setLoading(true);
    try {
      const out = await api.post("/passport/revoke/reject", { id_demande: id, notes });
      setResult({ code: 200, message: "Révocation rejetée", data: out });
      toast.success("Révocation rejetée !");
      refreshLists();
    } catch (ex) {
      setResult({ code: ex.response?.status || 500, message: formatError(ex) });
      toast.error(formatError(ex));
    } finally {
      setLoading(false);
    }
  }

  async function applyBan(e) {
    e.preventDefault();
    setResult(null);
    setLoading(true);
    try {
      const out = await api.patch("/passport/travel-ban", ban);
      setResult({ code: 200, message: "Interdiction appliquée", data: out });
      toast.success("Interdiction appliquée !");
    } catch (ex) {
      setResult({ code: ex.response?.status || 500, message: formatError(ex) });
      toast.error(formatError(ex));
    } finally {
      setLoading(false);
    }
  }

  const renderContent = () => {
    switch (currentPage) {
      case "agents":
        return (
          <div className="max-w-6xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">Gestion des Agents</h2>
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-primary hover:bg-primary/90 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
              >
                Créer Agent
              </button>
            </div>
            <div className="bg-surface-light dark:bg-surface-dark border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
              <table className="w-full">
                <thead className="bg-[#FAE19E] dark:bg-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-text-light dark:text-text">Identifiant</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-text-light dark:text-text">Rôle</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-text-light dark:text-text">Autorité</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-text-light dark:text-text">Actif</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-text-light dark:text-text">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-600 bg-[#FDF6E3]/30 dark:bg-transparent">
                  {agents.map((ag) => (
                    <tr key={ag._id} className="hover:bg-[#FAE19E]/20 dark:hover:bg-surface">
                      <td className="px-4 py-3 text-sm text-text-light dark:text-text">{ag.identifiant}</td>
                      <td className="px-4 py-3 text-sm text-text-light dark:text-text">{ag.role}</td>
                      <td className="px-4 py-3 text-sm text-text-light dark:text-text">{ag.id_autorite?.nom_autorite}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs ${ag.is_active ? 'bg-valid-light/20 dark:bg-valid/20 text-valid-light dark:text-valid' : 'bg-red-500/20 text-red-400 dark:text-red-300'}`}>
                          {ag.is_active ? 'Actif' : 'Inactif'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <button
                          onClick={() => toggleAgent(ag._id, !ag.is_active)}
                          className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                            ag.is_active
                              ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30 dark:text-red-300'
                              : 'bg-valid-light/20 dark:bg-valid/20 text-valid-light dark:text-valid hover:bg-valid-light/30 dark:hover:bg-valid/30'
                          }`}
                        >
                          {ag.is_active ? 'Désactiver' : 'Activer'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {result && <AlertResult {...result} />}
          </div>
        );
      case "revocations":
        return (
          <div className="max-w-4xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">Demandes de Révocation</h2>
              <button
                onClick={refreshLists}
                disabled={loading}
                className="bg-blockchain hover:bg-blockchain/90 disabled:opacity-50 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
              >
                Rafraîchir
              </button>
            </div>
            <div className="space-y-4">
              {pending.map((r) => (
                <div key={r._id} className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-2">Demande #{r._id}</h3>
                      <p className="text-gray-300 mb-2">Raison: {r.raison}</p>
                      <HashDisplay hash={r.hmac_hash} label="Hash du Passeport" />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => confirmRevoke(r._id)}
                        disabled={loading}
                        className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                      >
                        Confirmer
                      </button>
                      <button
                        onClick={() => rejectRevoke(r._id, 'Rejetée par admin')}
                        disabled={loading}
                        className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                      >
                        Rejeter
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {pending.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-gray-400">Aucune demande de révocation en attente</p>
                </div>
              )}
            </div>
            {result && <AlertResult {...result} />}
          </div>
        );
      case "audit":
        return <AuditTable />;
      case "stats":
        return (
          <div className="max-w-6xl">
            <h2 className="text-2xl font-bold text-text-light dark:text-text mb-6">Statistiques</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              <div className="bg-[#FDF6E3]/80 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-text-light dark:text-text mb-2">Total Passeports</h3>
                <p className="text-3xl font-bold text-primary">{stats?.passports || 0}</p>
              </div>
              <div className="bg-[#FDF6E3]/80 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-text-light dark:text-text mb-2">Total Voyages</h3>
                <p className="text-3xl font-bold text-valid">{stats?.voyages || 0}</p>
              </div>
              <div className="bg-[#FDF6E3]/80 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-text-light dark:text-text mb-2">Logs d’Audit</h3>
                <p className="text-3xl font-bold text-red-500">{stats?.audit_entries || 0}</p>
              </div>
              <div className="bg-[#FDF6E3]/80 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-text-light dark:text-text mb-2">Total Agents</h3>
                <p className="text-3xl font-bold text-gold">{stats?.agents || 0}</p>
              </div>
            </div>
            <div className="bg-[#FDF6E3]/80 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-text-light dark:text-text mb-4">Détails</h3>
              <pre className="text-xs text-text-light dark:text-gray-300 bg-[#E8D5B7]/50 dark:bg-gray-900 p-4 rounded overflow-auto">
                {JSON.stringify(stats, null, 2)}
              </pre>
            </div>
          </div>
        );
      default:
        return <div>Page non trouvée</div>;
    }
  };

  return (
    <>
      <SidebarLayout
        role="ADMIN"
        agentName={agent?.identifiant}
        onLogout={doLogout}
        navigationItems={navigationItems}
        onNavigate={setCurrentPage}
      >
        {renderContent()}
      </SidebarLayout>

      {/* Create Agent Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-white mb-4">Créer un Agent</h3>
            <form onSubmit={createAgent} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Identifiant</label>
                <input
                  type="text"
                  value={newAgent.identifiant}
                  onChange={(e) => setNewAgent({ ...newAgent, identifiant: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Mot de passe</label>
                <input
                  type="password"
                  value={newAgent.password}
                  onChange={(e) => setNewAgent({ ...newAgent, password: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Rôle</label>
                <select
                  value={newAgent.role}
                  onChange={(e) => setNewAgent({ ...newAgent, role: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="DOUANE">DOUANE</option>
                  <option value="POLICE">POLICE</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Type autorité</label>
                <select
                  value={newAgent.type_autorite}
                  onChange={(e) => setNewAgent({ ...newAgent, type_autorite: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="DOUANE">DOUANE</option>
                  <option value="POLICE">POLICE</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Nom autorité</label>
                <input
                  type="text"
                  value={newAgent.nom_autorite}
                  onChange={(e) => setNewAgent({ ...newAgent, nom_autorite: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-primary hover:bg-primary/90 disabled:opacity-50 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Création...
                    </>
                  ) : (
                    'Créer'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
