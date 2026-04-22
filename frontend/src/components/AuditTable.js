import { useEffect, useState } from "react";
import { api, formatError } from "../services/apiClient";

export default function AuditTable() {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [err, setErr] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await api.get("/admin/audit?limit=100");
        if (!cancelled) {
          setRows(data.items || []);
          setTotal(data.total || 0);
        }
      } catch (e) {
        if (!cancelled) setErr(formatError(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="bg-surface-light dark:bg-surface-dark border border-gray-200 dark:border-gray-700 rounded-xl p-6">
      <h2 className="text-2xl font-bold mb-6 text-text-light dark:text-text">Journal d'audit ({total})</h2>
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
                <td className="px-4 py-3 text-sm text-text-light dark:text-text">{r.id_agent || "—"}</td>
                <td className="px-4 py-3 text-sm text-text-light dark:text-text">{r.action}</td>
                <td className="px-4 py-3 text-sm text-text-light dark:text-text">{r.resultat}</td>
                <td className="px-4 py-3 text-sm text-text-light dark:text-text truncate max-w-xs">{r.details}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
