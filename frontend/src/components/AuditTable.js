import { useEffect, useState } from "react";
import { api, formatError } from "../services/apiClient";

const ACTION_OPTIONS = [
  "ALL",
  "LOGIN",
  "LOGOUT",
  "REFRESH",
  "CREATE_PASSPORT",
  "VERIFY_PASSPORT",
  "GET_PASSPORT",
  "RENEW_PASSPORT",
  "INITIATE_REVOKE",
  "CONFIRM_REVOKE",
  "REJECT_REVOKE",
  "ADD_TRAVEL",
  "LIST_TRAVELS",
  "FOREIGN_TRAVEL",
  "SET_TRAVEL_BAN",
  "CREATE_AGENT",
  "UPDATE_AGENT",
  "LIST_AUDIT",
  "LIST_AGENTS",
  "LIST_REVOCATIONS",
  "STATS",
];
const RESULT_OPTIONS = ["ALL", "SUCCESS", "FAILED"];

export default function AuditTable() {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [err, setErr] = useState("");
  const [page, setPage] = useState(0);
  const [pageInput, setPageInput] = useState("1");
  const [limit] = useState(50);
  const [actionFilter, setActionFilter] = useState("ALL");
  const [resultFilter, setResultFilter] = useState("ALL");
  const [agentNameFilter, setAgentNameFilter] = useState("");
  const [refreshToken, setRefreshToken] = useState(0);

  const fetchAudit = async () => {
    try {
      const params = new URLSearchParams();
      params.set("limit", limit);
      params.set("skip", page * limit);
      if (actionFilter !== "ALL") params.set("action", actionFilter);
      if (resultFilter !== "ALL") params.set("resultat", resultFilter);
      if (agentNameFilter.trim()) params.set("agent_name", agentNameFilter.trim());
      const data = await api.get(`/admin/audit?${params.toString()}`);
      setRows(data.items || []);
      setTotal(data.total || 0);
      setErr("");
    } catch (e) {
      setErr(formatError(e));
    }
  };

  useEffect(() => {
    fetchAudit();
    const interval = setInterval(fetchAudit, 15000);
    return () => clearInterval(interval);
  }, [page, actionFilter, resultFilter, agentNameFilter, refreshToken]);

  useEffect(() => {
    setPageInput(String(page + 1));
  }, [page]);

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const start = page * limit + 1;
  const end = Math.min(total, (page + 1) * limit);

  return (
    <div className="bg-surface-light dark:bg-surface-dark border border-gray-200 dark:border-gray-700 rounded-xl p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-text-light dark:text-text">Journal d'audit ({total})</h2>
          <p className="text-sm text-gray-400">Affichage {start}-{end} sur {total} entrées.</p>
        </div>
        <button
          onClick={() => setRefreshToken((prev) => prev + 1)}
          className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 transition-colors"
        >
          Rafraîchir
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Action</label>
          <select
            value={actionFilter}
            onChange={(e) => {
              setPage(0);
              setActionFilter(e.target.value);
            }}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {ACTION_OPTIONS.map((action) => (
              <option key={action} value={action}>
                {action}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Résultat</label>
          <select
            value={resultFilter}
            onChange={(e) => {
              setPage(0);
              setResultFilter(e.target.value);
            }}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {RESULT_OPTIONS.map((result) => (
              <option key={result} value={result}>
                {result}
              </option>
            ))}
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-300 mb-2">Agent</label>
          <input
            type="text"
            value={agentNameFilter}
            placeholder="Recherche par nom d'agent"
            onChange={(e) => {
              setPage(0);
              setAgentNameFilter(e.target.value);
            }}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      {err && <p className="text-red-400 dark:text-red-300 mb-4">{err}</p>}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-[#FAE19E] dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-text-light dark:text-text">Date</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-text-light dark:text-text">Agent</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-text-light dark:text-text">Action</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-text-light dark:text-text">Résultat</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-text-light dark:text-text">Détails</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-600 bg-transparent">
            {rows.map((r) => (
              <tr key={r._id} className="hover:bg-[#FAE19E]/20 dark:hover:bg-surface">
                <td className="px-4 py-3 text-sm text-text-light dark:text-text">{new Date(r.created_at).toLocaleString()}</td>
                <td className="px-4 py-3 text-sm text-text-light dark:text-text">{r.id_agent?.identifiant || r.id_agent || "—"}</td>
                <td className="px-4 py-3 text-sm text-text-light dark:text-text">{r.action}</td>
                <td className="px-4 py-3 text-sm text-text-light dark:text-text">{r.resultat}</td>
                <td className="px-4 py-3 text-sm text-text-light dark:text-text truncate max-w-xs">{r.details}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="text-sm text-gray-400">Page {page + 1} / {totalPages}</div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setPage(0)}
              disabled={page === 0}
              className="rounded-lg bg-gray-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 hover:bg-gray-600 transition-colors"
            >
              Première
            </button>
            <button
              onClick={() => setPage((prev) => Math.max(prev - 1, 0))}
              disabled={page === 0}
              className="rounded-lg bg-gray-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 hover:bg-gray-600 transition-colors"
            >
              Précédent
            </button>
            <button
              onClick={() => setPage((prev) => Math.min(prev + 1, totalPages - 1))}
              disabled={page >= totalPages - 1}
              className="rounded-lg bg-gray-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 hover:bg-gray-600 transition-colors"
            >
              Suivant
            </button>
            <button
              onClick={() => setPage(totalPages - 1)}
              disabled={page >= totalPages - 1}
              className="rounded-lg bg-gray-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 hover:bg-gray-600 transition-colors"
            >
              Dernière
            </button>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-gray-600 bg-gray-800 px-3 py-2">
            <label className="text-sm text-gray-300" htmlFor="page-input">
              Aller à
            </label>
            <input
              id="page-input"
              type="number"
              min="1"
              max={totalPages}
              value={pageInput}
              onChange={(e) => setPageInput(e.target.value)}
              className="w-20 rounded-lg border border-gray-500 bg-gray-900 px-2 py-1 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              onClick={() => {
                const targetPage = Math.min(totalPages, Math.max(1, Number(pageInput) || 1));
                setPage(targetPage - 1);
              }}
              className="rounded-lg bg-primary px-3 py-1 text-sm font-semibold text-white hover:bg-primary/90 transition-colors"
            >
              Aller
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
