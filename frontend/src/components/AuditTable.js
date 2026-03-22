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
    <div className="card">
      <h2>Journal d’audit ({total})</h2>
      {err && <p className="error">{err}</p>}
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Agent</th>
              <th>Action</th>
              <th>Résultat</th>
              <th>Détails</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r._id}>
                <td>{new Date(r.created_at).toLocaleString()}</td>
                <td>{r.id_agent || "—"}</td>
                <td>{r.action}</td>
                <td>{r.resultat}</td>
                <td className="ellipsis">{r.details}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
