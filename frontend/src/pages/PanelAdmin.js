import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, formatError } from "../services/apiClient";
import SidebarLayout from "../components/SidebarLayout";
import AlertResult from "../components/AlertResult";
import AuditTable from "../components/AuditTable";
import toast from 'react-hot-toast';

export default function PanelAdmin({ agent, onLogout }) {
  const nav = useNavigate();
  const [currentPage, setCurrentPage] = useState("stats");
  const [agents, setAgents] = useState([]);
  const [pending, setPending] = useState([]);
  const [confirmedNeedsReplacement, setConfirmedNeedsReplacement] = useState([]);
  const [stats, setStats] = useState(null);
  const [result, setResult] = useState(null);
  const [createdAgent, setCreatedAgent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newAgent, setNewAgent] = useState({
    identifiant: "",
    password: "",
    role: "DOUANE",
    nom_autorite: "Poste frontière",
  });
  const [revocationSearch, setRevocationSearch] = useState("");
  const [ban, setBan] = useState({ num_passeport: "", interdiction: true });
  const [confirmId, setConfirmId] = useState("");
  const [reject, setReject] = useState({ id_demande: "", notes: "" });

  const navigationItems = [
    { key: 'stats', icon: '📈', label: 'Statistiques' },
    { key: 'agents', icon: '👥', label: 'Agents' },
    { key: 'revocations', icon: '⚖️', label: 'Révocations' },
    { key: 'travelban', icon: '🚫', label: 'Interdiction' },
    { key: 'audit', icon: '📊', label: 'Audit Log' },
  ];

  async function doLogout() {
    await api.logout();
    onLogout();
    nav("/login");
  }

  async function refreshLists() {
    setLoading(true);
    try {
      const [a, p, c, s] = await Promise.all([
        api.get("/admin/agents"),
        api.get("/revocation/pending"),
        api.get("/revocation/confirmed-needs-replacement"),
        api.get("/admin/stats"),
      ]);
      setAgents(a.items || []);
      setPending(p.items || []);
      setConfirmedNeedsReplacement(c.items || []);
      setStats(s);
    } catch (ex) {
      toast.error(formatError(ex));
    } finally {
      setLoading(false);
    }
  }

  async function refreshStats() {
    try {
      const s = await api.get("/admin/stats");
      setStats(s);
    } catch (ex) {
      toast.error(formatError(ex));
    }
  }

  useEffect(() => {
    if (currentPage === "stats") {
      refreshStats();
    } else {
      refreshLists();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (currentPage === "stats") {
      refreshStats();
    }
    if (currentPage === "agents" || currentPage === "revocations") {
      refreshLists();
    }
    const interval = setInterval(() => {
      if (currentPage === "agents" || currentPage === "revocations") {
        refreshLists();
      }
    }, 12000);
    return () => clearInterval(interval);
  }, [currentPage]);

  async function createAgent(e) {
    e.preventDefault();
    setResult(null);
    setCreatedAgent(null);
    setLoading(true);
    try {
      const payload = { ...newAgent, type_autorite: newAgent.role };
      const out = await api.post("/admin/agents", payload);
      setCreatedAgent({ ...out.agent, authority_name: newAgent.nom_autorite });
      toast.success("Agent créé avec succès !");
      setShowCreateModal(false);
      setNewAgent({
        identifiant: "",
        password: "",
        role: "DOUANE",
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

  async function approveReplacement(id) {
    if (!window.confirm("Approuver le remplacement de ce passeport révoqué ?")) return;
    setResult(null);
    setLoading(true);
    try {
      const out = await api.post("/passport/revoke/approve-replacement", {
        id_demande: id,
        notes: "Approved for replacement by admin",
      });
      setResult({ code: 200, message: "Remplacement approuvé", data: out });
      toast.success("Remplacement approuvé !");
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
      setResult({ code: 200, message: "Interdiction mise à jour", data: out });
      toast.success("Interdiction mise à jour !");
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
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Gestion des Agents</h2>
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-primary hover:bg-primary/90 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
              >
                Créer Agent
              </button>
            </div>
            {createdAgent && (
              <div className="mb-6 rounded-2xl border border-valid-light/40 bg-valid-light/10 p-6 text-valid-light dark:border-valid/40 dark:bg-valid/10">
                <h3 className="text-xl font-semibold mb-2">Nouveau agent créé</h3>
                <p className="text-sm text-white mb-4">{createdAgent.identifiant} a été ajouté avec succès.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="rounded-xl bg-white/10 p-4">
                    <span className="block text-xs uppercase text-gray-400">Rôle</span>
                    <p className="font-semibold">{createdAgent.role}</p>
                  </div>
                  <div className="rounded-xl bg-white/10 p-4">
                    <span className="block text-xs uppercase text-gray-400">Autorité</span>
                    <p className="font-semibold">{createdAgent.authority_name || createdAgent.id_autorite?.nom_autorite || newAgent.nom_autorite}</p>
                  </div>
                </div>
              </div>
            )}
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
          <div className="max-w-6xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">Gestion des Révocations</h2>
              <button
                onClick={refreshLists}
                disabled={loading}
                className="bg-blockchain hover:bg-blockchain/90 disabled:opacity-50 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
              >
                Rafraîchir
              </button>
            </div>
            
            {/* Pending Revocations */}
            <div className="mb-8">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-4">
                <div>
                  <h3 className="text-xl font-semibold text-white">Demandes en Attente de Confirmation</h3>
                  <p className="text-gray-400">Filtrer par numéro de passeport, raison ou nom d'agent.</p>
                </div>
                <input
                  type="text"
                  value={revocationSearch}
                  onChange={(e) => setRevocationSearch(e.target.value)}
                  placeholder="Recherche de révocation..."
                  className="w-full md:w-80 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="space-y-4">
                {pending
                  .filter((r) => {
                    const query = revocationSearch.toLowerCase();
                    if (!query) return true;
                    return [
                      r._id,
                      r.raison,
                      r.passport?.num_passeport,
                      r.passport?.nom,
                      r.passport?.prenom,
                      r.initiator?.identifiant,
                    ]
                      .filter(Boolean)
                      .some((value) => String(value).toLowerCase().includes(query));
                  })
                  .map((r) => (
                    <div key={r._id} className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
                    <div className="flex flex-col gap-4 lg:flex-row lg:justify-between lg:items-start mb-4">
                      <div>
                        <h4 className="text-lg font-semibold text-white mb-2">Demande #{r._id}</h4>
                        <p className="text-gray-300 mb-2">Raison: {r.raison}</p>
                        {r.initiator ? (
                          <p className="text-sm text-gray-400 mb-2">Demandeur: {r.initiator.identifiant} ({r.initiator.role})</p>
                        ) : null}
                        {r.passport ? (
                          <div className="rounded-xl bg-white/5 border border-white/10 p-4 mb-2">
                            <div className="flex items-center justify-between gap-4 mb-2">
                              <div>
                                <p className="text-sm text-gray-300">Passeport</p>
                                <p className="text-base font-semibold text-white">{r.passport.num_passeport}</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => navigator.clipboard.writeText(r.passport.num_passeport)}
                                className="rounded-lg bg-gray-700 px-3 py-2 text-xs font-semibold text-white hover:bg-gray-600 transition-colors"
                              >
                                Copier
                              </button>
                            </div>
                            <p className="text-sm text-gray-400">{r.passport.nom} {r.passport.prenom}</p>
                          </div>
                        ) : (
                          <p className="text-sm text-gray-400 mb-2">Passeport inconnu</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => confirmRevoke(r._id)}
                          disabled={loading}
                          className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                        >
                          Confirmer Révocation
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
                {pending.filter((r) => {
                    const query = revocationSearch.toLowerCase();
                    if (!query) return true;
                    return [
                      r._id,
                      r.raison,
                      r.passport?.num_passeport,
                      r.passport?.nom,
                      r.passport?.prenom,
                      r.initiator?.identifiant,
                    ]
                      .filter(Boolean)
                      .some((value) => String(value).toLowerCase().includes(query));
                  }).length === 0 && (
                  <div className="text-center py-8 bg-gray-800/30 rounded-xl">
                    <p className="text-gray-400">Aucune demande de révocation en attente</p>
                  </div>
                )}
              </div>
            </div>

            {/* Confirmed Revocations Needing Replacement Approval */}
            <div>
              <h3 className="text-xl font-semibold text-white mb-4">Révocations Confirmées - Approbation de Remplacement Requise</h3>
              <div className="space-y-4">
                {confirmedNeedsReplacement
                  .filter((r) => {
                    const query = revocationSearch.toLowerCase();
                    if (!query) return true;
                    return [
                      r._id,
                      r.raison,
                      r.passport?.num_passeport,
                      r.passport?.nom,
                      r.passport?.prenom,
                      r.initiator?.identifiant,
                    ]
                      .filter(Boolean)
                      .some((value) => String(value).toLowerCase().includes(query));
                  })
                  .map((r) => (
                    <div key={r._id} className="bg-orange-900/20 border border-orange-700 rounded-xl p-6">
                    <div className="flex flex-col gap-4 lg:flex-row lg:justify-between lg:items-start mb-4">
                      <div>
                        <h4 className="text-lg font-semibold text-white mb-2">Révocation Confirmée #{r._id}</h4>
                        <p className="text-gray-300 mb-2">Raison: {r.raison}</p>
                        {r.initiator ? (
                          <p className="text-sm text-orange-200 mb-2">Demandeur: {r.initiator.identifiant} ({r.initiator.role})</p>
                        ) : null}
                        {r.passport ? (
                          <div className="rounded-xl bg-white/5 border border-white/10 p-4 mb-2">
                            <div className="flex items-center justify-between gap-4 mb-2">
                              <div>
                                <p className="text-sm text-orange-200">Passeport</p>
                                <p className="text-base font-semibold text-white">{r.passport.num_passeport}</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => navigator.clipboard.writeText(r.passport.num_passeport)}
                                className="rounded-lg bg-orange-600 px-3 py-2 text-xs font-semibold text-white hover:bg-orange-500 transition-colors"
                              >
                                Copier
                              </button>
                            </div>
                            <p className="text-sm text-orange-300">{r.passport.nom} {r.passport.prenom}</p>
                          </div>
                        ) : null}
                        <p className="text-sm text-orange-300 mb-2">Confirmée le: {new Date(r.date_confirmation).toLocaleDateString('fr-FR')}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => approveReplacement(r._id)}
                          disabled={loading}
                          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                        >
                          Approuver Remplacement
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {confirmedNeedsReplacement.filter((r) => {
                    const query = revocationSearch.toLowerCase();
                    if (!query) return true;
                    return [
                      r._id,
                      r.raison,
                      r.passport?.num_passeport,
                      r.passport?.nom,
                      r.passport?.prenom,
                      r.initiator?.identifiant,
                    ]
                      .filter(Boolean)
                      .some((value) => String(value).toLowerCase().includes(query));
                  }).length === 0 && (
                  <div className="text-center py-8 bg-gray-800/30 rounded-xl">
                    <p className="text-gray-400">Aucune révocation ne nécessite d'approbation de remplacement</p>
                  </div>
                )}
              </div>
            </div>
            
            {result && <AlertResult {...result} />}
          </div>
        );
      case "travelban":
        return (
          <div className="max-w-4xl">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white">Interdiction de sortie</h2>
                <p className="text-gray-400 max-w-2xl">Appliquez ou retirez l'interdiction de sortie pour un passeport actif en utilisant son numéro.</p>
              </div>
            </div>
            <div className="bg-surface-light dark:bg-surface-dark border border-gray-200 dark:border-gray-700 rounded-xl p-6">
              <form onSubmit={applyBan} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Numéro de passeport</label>
                  <input
                    type="text"
                    value={ban.num_passeport}
                    onChange={(e) => setBan({ ...ban, num_passeport: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Exemple: AB123456"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Action</label>
                  <select
                    value={ban.interdiction ? "true" : "false"}
                    onChange={(e) => setBan({ ...ban, interdiction: e.target.value === "true" })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="true">Appliquer l'interdiction</option>
                    <option value="false">Retirer l'interdiction</option>
                  </select>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-primary hover:bg-primary/90 disabled:opacity-50 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                  >
                    {loading ? 'En cours...' : 'Enregistrer'}
                  </button>
                  <p className="text-sm text-gray-400">
                    Cette action mettra à jour le statut d'interdiction sur la blockchain pour le passeport actif associé.
                  </p>
                </div>
              </form>
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
              <div className="space-y-1">
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
                <p className="text-xs text-gray-400">Le rôle est utilisé pour déterminer automatiquement le type d'autorité.</p>
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
