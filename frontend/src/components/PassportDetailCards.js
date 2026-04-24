import HashDisplay from "./HashDisplay";
import StatusBadge from "./StatusBadge";
import VerifyResultTable from "./VerifyResultTable";

function fmtDateFromUnix(sec) {
  if (sec == null || sec === "") return "—";
  const n = Number(sec);
  if (Number.isNaN(n)) return "—";
  return new Date(n * 1000).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function Row({ label, hint, children }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[minmax(8rem,11rem)_1fr] gap-1 sm:gap-3 py-2 border-b border-gray-200/80 dark:border-gray-600/80 last:border-0">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-light dark:text-muted">
        {label}
        {hint ? (
          <span className="mt-1 block font-normal normal-case tracking-normal text-[10px] leading-snug text-muted-light/90 dark:text-muted/90">
            {hint}
          </span>
        ) : null}
      </dt>
      <dd className="text-sm text-text-light dark:text-text break-words">{children}</dd>
    </div>
  );
}

/**
 * @param {{ offchain?: object, onchain?: object, lifecycle?: object, renewal_chain?: array, active_passport?: object, verification_scanned?: object, verification_active?: object, active_hmac_hash?: string }} data — réponse GET /passport/lookup ou GET /passport/:hash
 * @param {(credentials: { num_passeport: string, mrz: string }) => void} [onSelectPassportVersion] — clic sur une ligne de la chaîne de renouvellements : recharger la fiche pour cette version
 */
export default function PassportDetailCards({ data, onSelectPassportVersion }) {
  if (!data?.offchain) return null;

  const off = data.offchain;
  const on = data.onchain || {};
  const lc = data.lifecycle || {};
  const chain = Array.isArray(data.renewal_chain) ? data.renewal_chain : [];
  const chainRowClickable = typeof onSelectPassportVersion === "function";
  const activeBundle = data.active_passport;
  const vs = data.verification_scanned;
  const va = data.verification_active;
  const isSameDocumentAsActive =
    (data.active_hmac_hash && data.active_hmac_hash === off.hmac_hash) ||
    (vs && va && vs.hmac_hash === va.hmac_hash);

  const expChain = on.date_expiration != null ? fmtDateFromUnix(on.date_expiration) : "—";
  const emisChain = on.date_emission != null ? fmtDateFromUnix(on.date_emission) : "—";

  return (
    <div className="space-y-4 mt-6">
      {vs && va && (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-surface-light dark:bg-surface-dark overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-primary-light/10 dark:bg-primary/15">
            <h3 className="text-sm font-semibold text-text-light dark:text-text">Contrôle documentaire</h3>
            <p className="text-xs text-muted-light dark:text-muted mt-1">
              Comparaison entre le document scanné et le passeport actuellement valide en base.
            </p>
          </div>
          {isSameDocumentAsActive ? (
            <p className="p-4 text-sm text-emerald-700 dark:text-emerald-300">
              Ce document correspond à la <strong>version actuelle</strong> du passeport (aucun renouvellement ultérieur).
            </p>
          ) : (
            <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-200 dark:divide-gray-700">
              <div className="p-2">
                <p className="text-xs font-semibold text-muted-light dark:text-muted px-2 pt-2 pb-1">
                  Document présenté (saisi)
                </p>
                <VerifyResultTable data={vs} />
              </div>
              <div className="p-2">
                <p className="text-xs font-semibold text-muted-light dark:text-muted px-2 pt-2 pb-1">
                  Passeport actif (valable aux contrôles)
                </p>
                <VerifyResultTable data={va} />
              </div>
            </div>
          )}
        </div>
      )}

      {chain.length > 1 && (
        <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-surface-light dark:bg-surface-dark overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-amber-500/10 dark:bg-amber-900/20">
            <h3 className="text-sm font-semibold text-text-light dark:text-text">Historique des renouvellements</h3>
            <p className="text-xs text-muted-light dark:text-muted mt-1">
              De la plus ancienne version à la version actuelle ({chain.length} version{chain.length > 1 ? "s" : ""}
              ).
            </p>
            {chainRowClickable && (
              <p className="text-xs text-primary dark:text-primary-light mt-2 font-medium">
                Astuce : cliquez une ligne pour afficher la fiche de cette version (sans resaisir n° et MRZ).
              </p>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-background-light dark:bg-background/80 text-muted-light dark:text-muted uppercase text-xs">
                <tr>
                  <th className="px-3 py-2">#</th>
                  <th className="px-3 py-2">N° passeport</th>
                  <th className="px-3 py-2">MRZ</th>
                  <th className="px-3 py-2">Motif renouv.</th>
                  <th className="px-3 py-2">Statut</th>
                  <th className="px-3 py-2">Créé le</th>
                </tr>
              </thead>
              <tbody className="text-text-light dark:text-text">
                {chain.map((step, i) => (
                  <tr
                    key={step.hmac_hash}
                    tabIndex={chainRowClickable ? 0 : undefined}
                    onKeyDown={(e) => {
                      if (!chainRowClickable) return;
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onSelectPassportVersion({
                          num_passeport: step.num_passeport,
                          mrz: step.mrz,
                        });
                      }
                    }}
                    onClick={() => {
                      if (!chainRowClickable) return;
                      onSelectPassportVersion({
                        num_passeport: step.num_passeport,
                        mrz: step.mrz,
                      });
                    }}
                    className={`border-t border-gray-100 dark:border-gray-700/80 ${
                      step.is_current ? "bg-emerald-500/10 dark:bg-emerald-900/15" : ""
                    } ${
                      chainRowClickable
                        ? "cursor-pointer hover:bg-amber-500/15 dark:hover:bg-amber-900/25 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary"
                        : ""
                    }`}
                  >
                    <td className="px-3 py-2 whitespace-nowrap">{i + 1}</td>
                    <td className="px-3 py-2 font-mono text-xs">{step.num_passeport}</td>
                    <td className="px-3 py-2 font-mono text-xs max-w-xs truncate" title={step.mrz}>
                      {step.mrz}
                    </td>
                    <td className="px-3 py-2 text-xs max-w-[10rem] sm:max-w-xs" title={step.renewal_motif || ""}>
                      {i === 0 ? "—" : step.renewal_motif || "—"}
                    </td>
                    <td className="px-3 py-2">
                      {step.is_current ? (
                        <span className="text-emerald-700 dark:text-emerald-300 font-medium text-xs">Actuel</span>
                      ) : (
                        <span className="text-muted-light dark:text-muted text-xs">Remplacé</span>
                      )}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs">
                      {step.created_at ? new Date(step.created_at).toLocaleString("fr-FR") : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {lc && Object.keys(lc).length > 0 && (
        <div
          className={`rounded-xl border-2 p-4 ${
            lc.is_current
              ? "border-emerald-500/40 bg-emerald-500/10 dark:bg-emerald-900/20"
              : "border-amber-500/50 bg-amber-500/10 dark:bg-amber-900/20"
          }`}
        >
          <p className="font-semibold text-text-light dark:text-text">
            {lc.is_current ? "Passeport — version courante" : "Passeport — version remplacée (historique)"}
          </p>
          {!lc.is_current && lc.superseded_by && (
            <p className="mt-2 text-sm text-text-light dark:text-text">
              Document actuel : n°{" "}
              <span className="font-mono font-medium">{lc.remplace_par?.num_passeport || "—"}</span>
              {lc.remplace_par?.mrz && (
                <>
                  <span className="text-muted-light dark:text-muted"> · MRZ </span>
                  <span className="font-mono text-xs break-all">{lc.remplace_par.mrz}</span>
                </>
              )}
            </p>
          )}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-surface-light dark:bg-surface-dark shadow-sm overflow-hidden">
          <div className="bg-primary-light/15 dark:bg-primary/20 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-text-light dark:text-text">
              Données porteur — document saisi
            </h3>
          </div>
          <dl className="px-4 py-2">
            <Row label="Nom complet">
              {off.nom} {off.prenom}
            </Row>
            <Row label="N° passeport">
              <span className="font-mono font-medium">{off.num_passeport}</span>
            </Row>
            <Row label="MRZ">
              <span className="font-mono text-xs leading-relaxed">{off.mrz}</span>
            </Row>
            <Row label="CIN">{off.cin}</Row>
            <Row label="Naissance">
              {off.date_naissance
                ? new Date(off.date_naissance).toLocaleDateString("fr-FR")
                : "—"}
            </Row>
            <Row label="Lieu">{off.lieu_naissance || "—"}</Row>
            <Row label="Adresse">{off.adresse || "—"}</Row>
            <Row label="Nationalité">{off.nationalite || "—"}</Row>
            {off.agent_createur_identifiant ? (
              <Row label="Création (agent interne)">{off.agent_createur_identifiant}</Row>
            ) : null}
          </dl>
        </section>

        <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-surface-light dark:bg-surface-dark shadow-sm overflow-hidden">
          <div className="bg-blockchain/15 dark:bg-blockchain/25 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-text-light dark:text-text">Statut blockchain — document saisi</h3>
            <p className="text-[11px] text-muted-light dark:text-muted mt-2 leading-relaxed">
              Ces champs reflètent l’état enregistré sur la chaîne pour le <strong>hash</strong> du document que vous
              avez saisi (une version renouvelée peut encore être consultable à titre historique).
            </p>
          </div>
          <dl className="px-4 py-2">
            <Row label="Statut effectif">
              <StatusBadge statut={on.statut_effectif || "—"} />
            </Row>
            <Row
              label="Renouvelé (chaîne)"
              hint="Vrai si la blockchain indique que ce titre a été remplacé par un renouvellement : ce n’est plus le document actif pour voyager."
            >
              {on.renewed ? "Oui" : "Non"}
            </Row>
            <Row
              label="Interdiction de sortie"
              hint="Indicateur on-chain de restriction de sortie ; si oui, le contrôle doit appliquer la procédure SOR / blocage selon les règles en vigueur."
            >
              {on.interdiction_sortie ? "Oui" : "Non"}
            </Row>
            <Row
              label="Émission (chaîne)"
              hint="Date de début de validité enregistrée sur la chaîne pour cette version (liée au hash saisi)."
            >
              {emisChain}
            </Row>
            <Row
              label="Expiration (chaîne)"
              hint="Date de fin de validité on-chain pour cette version ; une version plus récente peut exister si le passeport a été renouvelé."
            >
              {expChain}
            </Row>
            <Row
              label="Agent émetteur"
              hint="Compte Ethereum ayant enregistré cette entrée ; l’identifiant agent est affiché s’il est lié en base."
            >
              {on.agent_emetteur_identifiant ? (
                <span className="block mb-1 font-medium">{on.agent_emetteur_identifiant}</span>
              ) : null}
              {on.eth_agent_emetteur ? (
                <span className="font-mono text-xs break-all text-muted-light dark:text-muted">
                  {String(on.eth_agent_emetteur)}
                </span>
              ) : (
                "—"
              )}
            </Row>
            {on.raison_revocation ? (
              <Row label="Raison révocation">{on.raison_revocation}</Row>
            ) : null}
          </dl>
        </section>
      </div>

      {activeBundle?.offchain && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-text-light dark:text-text">
            Passeport actuel (après renouvellements)
          </h3>
          <div className="grid gap-4 lg:grid-cols-2">
            <section className="rounded-xl border border-emerald-500/30 dark:border-emerald-600/40 bg-surface-light dark:bg-surface-dark shadow-sm overflow-hidden">
              <div className="bg-emerald-500/15 dark:bg-emerald-900/25 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                <h4 className="text-sm font-semibold text-text-light dark:text-text">Données porteur — version actuelle</h4>
              </div>
              <dl className="px-4 py-2">
                <Row label="Nom complet">
                  {activeBundle.offchain.nom} {activeBundle.offchain.prenom}
                </Row>
                <Row label="N° passeport">
                  <span className="font-mono font-medium">{activeBundle.offchain.num_passeport}</span>
                </Row>
                <Row label="MRZ">
                  <span className="font-mono text-xs leading-relaxed">{activeBundle.offchain.mrz}</span>
                </Row>
                <Row label="CIN">{activeBundle.offchain.cin}</Row>
              </dl>
            </section>
            <section className="rounded-xl border border-emerald-500/30 dark:border-emerald-600/40 bg-surface-light dark:bg-surface-dark shadow-sm overflow-hidden">
              <div className="bg-emerald-500/15 dark:bg-emerald-900/25 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                <h4 className="text-sm font-semibold text-text-light dark:text-text">Statut blockchain — version actuelle</h4>
              </div>
              <dl className="px-4 py-2">
                <Row label="Statut effectif">
                  <StatusBadge statut={activeBundle.onchain?.statut_effectif || "—"} />
                </Row>
                <Row label="Renouvelé (chaîne)">{activeBundle.onchain?.renewed ? "Oui" : "Non"}</Row>
                <Row label="Interdiction de sortie">{activeBundle.onchain?.interdiction_sortie ? "Oui" : "Non"}</Row>
                <Row label="Émission (chaîne)">
                  {activeBundle.onchain?.date_emission != null
                    ? fmtDateFromUnix(activeBundle.onchain.date_emission)
                    : "—"}
                </Row>
                <Row label="Expiration (chaîne)">
                  {activeBundle.onchain?.date_expiration != null
                    ? fmtDateFromUnix(activeBundle.onchain.date_expiration)
                    : "—"}
                </Row>
                <Row label="Agent émetteur">
                  {activeBundle.onchain?.agent_emetteur_identifiant ? (
                    <span className="block mb-1 font-medium">{activeBundle.onchain.agent_emetteur_identifiant}</span>
                  ) : null}
                  {activeBundle.onchain?.eth_agent_emetteur ? (
                    <span className="font-mono text-xs break-all text-muted-light dark:text-muted">
                      {String(activeBundle.onchain.eth_agent_emetteur)}
                    </span>
                  ) : (
                    "—"
                  )}
                </Row>
              </dl>
            </section>
          </div>
        </div>
      )}

      <details className="rounded-xl border border-gray-200 dark:border-gray-700 bg-background-light/50 dark:bg-background/30 px-4 py-3 group">
        <summary className="cursor-pointer text-sm font-medium text-muted-light dark:text-muted list-none flex items-center gap-2">
          <span className="transition group-open:rotate-90 text-primary">▸</span>
          Identifiants techniques (HMAC, transactions)
        </summary>
        <div className="mt-4 space-y-3 pt-2 border-t border-gray-200 dark:border-gray-700">
          {off.hmac_hash && <HashDisplay hash={off.hmac_hash} label="HMAC (référence système)" />}
          {off.tx_hash_creation && <HashDisplay hash={off.tx_hash_creation} label="Tx création passeport" />}
        </div>
      </details>
    </div>
  );
}
