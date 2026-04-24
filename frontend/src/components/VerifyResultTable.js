import HashDisplay from "./HashDisplay";

/**
 * Présentation structurée du résultat GET /passport/verify (sans JSON brut).
 */
export default function VerifyResultTable({ data }) {
  if (!data) return null;

  const rows = [
    { label: "Code résultat", value: data.code || "—" },
    { label: "Statut effectif", value: data.statut_effectif || "—" },
    { label: "Détail", value: data.message || "—" },
  ];
  if (data.interdiction_sortie != null) {
    rows.push({
      label: "Interdiction de sortie",
      value: data.interdiction_sortie ? "Oui" : "Non",
    });
  }
  if (data.raison_revocation) {
    rows.push({ label: "Raison révocation", value: data.raison_revocation });
  }

  return (
    <div className="rounded-b-xl border-t-0 overflow-hidden">
      <div className="bg-primary-light/5 dark:bg-primary/10 px-4 py-2 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-light dark:text-muted">
          Détail technique
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.label}
                className="border-b border-gray-100 dark:border-gray-700/80 last:border-0 hover:bg-background-light/80 dark:hover:bg-background/40"
              >
                <th className="text-left font-medium text-muted-light dark:text-muted px-4 py-3 align-top w-44 whitespace-nowrap">
                  {r.label}
                </th>
                <td className="px-4 py-3 text-text-light dark:text-text">{r.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data.hmac_hash && (
        <div className="px-4 pb-4 pt-2 border-t border-gray-200 dark:border-gray-700 bg-background-light/30 dark:bg-background/20">
          <HashDisplay hash={data.hmac_hash} label="Empreinte HMAC (référence système)" />
        </div>
      )}
    </div>
  );
}
