const mongoose = require("mongoose");
const PassportOffchain = require("../models/PassportOffchain");
const Renouvellement = require("../models/Renouvellement");
const Agent = require("../models/Agent");
const RevocationRequest = require("../models/RevocationRequest");
const authService = require("./authService");
const blockchainService = require("./blockchainService");
const { encryptField, decryptField } = require("../utils/encryption");

function toUnixSeconds(d) {
  return Math.floor(new Date(d).getTime() / 1000);
}

/** Treat missing is_current as true (documents before lifecycle migration). */
function isOffchainCurrent(doc) {
  if (!doc) return false;
  return doc.is_current !== false;
}

/** Normalise uint256 / BigNumber ethers → nombre Unix (secondes). */
function toChainInt(v) {
  if (v == null || v === "") return null;
  if (typeof v === "bigint") return Number(v);
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "object" && typeof v.toNumber === "function") {
    try {
      return v.toNumber();
    } catch {
      /* fallthrough */
    }
  }
  if (typeof v === "object" && (v._hex != null || v.hex != null)) {
    const h = v._hex || v.hex;
    const n = parseInt(String(h), 16);
    return Number.isFinite(n) ? n : null;
  }
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function mapOnchainFromRow(row) {
  if (!row) return null;
  const statutEffectif = row.statutEffectif ?? row[8];
  const renewed = typeof row.renewed === "boolean" ? row.renewed : row[7];
  const de = toChainInt(row.dateEmission ?? row[4]);
  const dx = toChainInt(row.dateExpiration ?? row[5]);
  return {
    statut_effectif: statutEffectif,
    interdiction_sortie:
      typeof row.interdictionSortie === "boolean" ? row.interdictionSortie : row[2],
    date_emission: de,
    date_expiration: dx,
    eth_agent_emetteur: row.ethAgentEmetteur ?? row[6],
    raison_revocation: row.raisonRevocation ?? row[3],
    renewed: Boolean(renewed),
  };
}

async function enrichOnchainWithAgentIdentifiant(onMap) {
  if (!onMap || !onMap.eth_agent_emetteur) return onMap;
  const eth = String(onMap.eth_agent_emetteur).toLowerCase();
  const agent = await Agent.findOne({ eth_address: eth }).select("identifiant").lean();
  return {
    ...onMap,
    agent_emetteur_identifiant: agent?.identifiant || null,
  };
}

async function enrichOffchainCreatorIdent(doc) {
  if (!doc?.id_agent_createur) return doc;
  const ag = await Agent.findById(doc.id_agent_createur).select("identifiant").lean();
  return { ...doc, agent_createur_identifiant: ag?.identifiant || null };
}

/** Ajoute motif + tx du renouvellement pour chaque version après la première. */
async function attachRenewalMotifsToChain(summaries) {
  const out = summaries.map((s) => ({ ...s }));
  for (let i = 1; i < out.length; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    const r = await Renouvellement.findOne({
      hash_precedent: out[i - 1].hmac_hash,
      hash_nouveau: out[i].hmac_hash,
    })
      .select("motif tx_hash")
      .lean();
    out[i].renewal_motif = r?.motif || null;
    out[i].renewal_tx_hash = r?.tx_hash || null;
  }
  return out;
}

/** Chaîne complète des versions (plus ancienne → passeport actuel), à partir de n'importe quelle version. */
async function buildRenewalChainSummaries(startOff) {
  let oldest = startOff;
  while (oldest && oldest.supersedes) {
    // eslint-disable-next-line no-await-in-loop
    const prev = await PassportOffchain.findOne({ hmac_hash: oldest.supersedes }).lean();
    if (!prev) break;
    oldest = prev;
  }
  const summaries = [];
  let cur = oldest;
  for (;;) {
    summaries.push({
      hmac_hash: cur.hmac_hash,
      num_passeport: cur.num_passeport,
      mrz: cur.mrz,
      is_current: isOffchainCurrent(cur),
      created_at: cur.created_at,
    });
    if (!cur.superseded_by) break;
    // eslint-disable-next-line no-await-in-loop
    const next = await PassportOffchain.findOne({ hmac_hash: cur.superseded_by }).lean();
    if (!next) break;
    cur = next;
  }
  return summaries;
}

async function createPassport(payload, agent) {
  const {
    nom,
    prenom,
    cin,
    num_passeport,
    mrz,
    photo_url,
    biometrie,
    date_naissance,
    lieu_naissance,
    adresse,
    nationalite,
    date_expiration,
  } = payload;

  if (!nom || !prenom || !cin || !num_passeport || !mrz || !date_naissance || !lieu_naissance) {
    const err = new Error("CHAMPS_REQUIS");
    err.status = 400;
    throw err;
  }
  if (!date_expiration) {
    const err = new Error("DATE_EXPIRATION_REQUISE");
    err.status = 400;
    throw err;
  }

  const hmac_hash = authService.generatePassportHmac(num_passeport, mrz);
  const cinTrim = String(cin).trim();

  const existsHash = await PassportOffchain.findOne({ hmac_hash }).lean();
  if (existsHash) {
    const err = new Error("PASSPORT_OR_CIN_EXISTS");
    err.status = 409;
    throw err;
  }

  // HYBRID LOGIC FIRST: Check if CIN exists on a REVOKED passport (replacement scenario)
  let oldHashForSupersedes = null;
  const cinOnRevoked = await PassportOffchain.findOne({
    cin: cinTrim,
    is_current: false,
  }).lean();

  if (cinOnRevoked) {
    // Get revocation details to check reason
    const revocationReq = await RevocationRequest.findOne({
      hmac_hash: cinOnRevoked.hmac_hash,
      statut: "CONFIRME",
    }).lean();

    if (revocationReq) {
      // Fast path: PERDU/VOLE - auto-allow new passport creation
      if (["PERDU", "VOLE"].includes(revocationReq.raison)) {
        oldHashForSupersedes = cinOnRevoked.hmac_hash;
        // ✅ Allow creation - will link via supersedes chain
      } else {
        // Slow path: FALSIFIE/DECES/JUDICIAIRE - require admin approval
        // Check if admin has approved replacement
        if (!revocationReq.allow_replacement) {
          const err = new Error("REVOCATION_REQUIRES_ADMIN_APPROVAL");
          err.status = 409;
          err.details = `Ce passeport a été révoqué pour raison: ${revocationReq.raison}. L'administration doit approuver le remplacement avant création.`;
          throw err;
        }
        oldHashForSupersedes = cinOnRevoked.hmac_hash;
        // ✅ Allow creation - admin has pre-approved
      }
    } else {
      // CIN on non-active passport but no confirmed revocation found
      const err = new Error("PASSPORT_OR_CIN_EXISTS");
      err.status = 409;
      throw err;
    }
  }

  // NOW check if CIN is taken by ANOTHER active passport (only if not in revocation replacement scenario)
  if (!oldHashForSupersedes) {
    const cinTaken = await PassportOffchain.findOne({
      cin: cinTrim,
      is_current: { $ne: false },
    }).lean();
    if (cinTaken) {
      const err = new Error("PASSPORT_OR_CIN_EXISTS");
      err.status = 409;
      throw err;
    }
  }

  const exists = await blockchainService.safeCall(() => blockchainService.existsOnChain(hmac_hash));
  if (!exists.ok) {
    const err = new Error("BLOCKCHAIN_UNAVAILABLE");
    err.status = 503;
    err.details = exists.error;
    throw err;
  }
  if (exists.data) {
    const err = new Error("HASH_ONCHAIN_EXISTS");
    err.status = 409;
    throw err;
  }

  const dateEmission = Math.floor(Date.now() / 1000);
  const dateExpiration = toUnixSeconds(date_expiration);
  if (dateExpiration <= dateEmission) {
    const err = new Error("DATE_EXPIRATION_INVALIDE");
    err.status = 400;
    throw err;
  }

  const ethAgent = String(agent.eth_address).toLowerCase();
  const bc = await blockchainService.safeCall(() =>
    blockchainService.createPassportOnChain(hmac_hash, dateEmission, dateExpiration, ethAgent)
  );
  if (!bc.ok) {
    const err = new Error("BLOCKCHAIN_TX_FAILED");
    err.status = 503;
    err.details = bc.error;
    throw err;
  }

  const txHash = bc.data.txHash;

  try {
    const newPassportData = {
      hmac_hash,
      nom,
      prenom,
      num_passeport: String(num_passeport).trim(),
      mrz: String(mrz).trim(),
      date_naissance,
      lieu_naissance,
      cin: cinTrim,
      photo_url: encryptField(photo_url || ""),
      biometrie: encryptField(biometrie || ""),
      adresse: adresse || "",
      nationalite: nationalite || "Marocaine",
      id_agent_createur: agent._id,
      tx_hash_creation: txHash,
      is_current: true,
    };

    // Link to old revoked passport if this is a replacement
    if (oldHashForSupersedes) {
      newPassportData.supersedes = oldHashForSupersedes;
      // Also update old passport to point to new one AND mark as inactive
      await PassportOffchain.updateOne(
        { hmac_hash: oldHashForSupersedes },
        {
          $set: {
            superseded_by: hmac_hash,
            is_current: false,
          },
        }
      );
    }

    await PassportOffchain.create(newPassportData);
  } catch (e) {
    const err = new Error("MONGO_AFTER_CHAIN_FAILURE");
    err.status = 500;
    err.details = e.message;
    throw err;
  }

  return { hmac_hash, tx_hash_creation: txHash };
}

async function verifyPassport(num_passeport, mrz) {
  if (!num_passeport || !mrz) {
    return {
      code: "BAD_REQUEST",
      message: "num_passeport et mrz requis",
      http: 400,
    };
  }
  const hmac_hash = authService.generatePassportHmac(num_passeport, mrz);

  const bc = await blockchainService.safeCall(() => blockchainService.getPassportOnChain(hmac_hash));
  if (!bc.ok) {
    const er = String(bc.error || "");
    if (er.includes("NOT_FOUND")) {
      return {
        code: "HASH_INTROUVABLE",
        message: "Document suspect — falsification possible",
        http: 404,
        hmac_hash,
      };
    }
    return {
      code: "BLOCKCHAIN_OFFLINE",
      message: "Blockchain indisponible — procédure manuelle",
      http: 503,
      details: bc.error,
    };
  }

  const row = bc.data;
  const statutEffectif = row.statutEffectif ?? row[8];
  const interdiction =
    typeof row.interdictionSortie === "boolean" ? row.interdictionSortie : row[2];

  if (statutEffectif === "ACTIF" && interdiction) {
    return {
      code: "INTERDIT_SORTIE",
      message: "Interdiction de sortie — autorité judiciaire",
      http: 200,
      hmac_hash,
      statut_effectif: statutEffectif,
      interdiction_sortie: true,
    };
  }

  if (statutEffectif === "ACTIF") {
    return {
      code: "VALIDE",
      message: "Passeport valide — passage autorisé",
      http: 200,
      hmac_hash,
      statut_effectif: statutEffectif,
      interdiction_sortie: false,
    };
  }

  const renewedOnChain = typeof row.renewed === "boolean" ? row.renewed : row[7];

  if (statutEffectif === "EXPIRE") {
    if (renewedOnChain) {
      return {
        code: "REMPLACE",
        message: "Passeport remplacé par un renouvellement — utiliser le nouveau numéro/MRZ",
        http: 200,
        hmac_hash,
        statut_effectif: statutEffectif,
        renewed: true,
      };
    }
    return {
      code: "EXPIRE",
      message: "Passeport expiré — renouvellement requis",
      http: 200,
      hmac_hash,
      statut_effectif: statutEffectif,
    };
  }

  if (statutEffectif === "REVOQUE") {
    const raison =
      typeof row.raisonRevocation === "string" ? row.raisonRevocation : row[3];
    return {
      code: "REVOQUE",
      message: "Passeport révoqué — alerter superviseur",
      http: 200,
      hmac_hash,
      statut_effectif: statutEffectif,
      raison_revocation: raison || "",
    };
  }

  if (statutEffectif === "PERDU") {
    return {
      code: "PERDU",
      message: "Statut PERDU",
      http: 200,
      hmac_hash,
      statut_effectif: statutEffectif,
    };
  }

  return {
    code: "HASH_INTROUVABLE",
    message: "Document suspect — falsification possible",
    http: 404,
    hmac_hash,
  };
}

async function getPassportByCredentials(num_passeport, mrz) {
  if (!num_passeport || !mrz) {
    const err = new Error("CHAMPS_REQUIS");
    err.status = 400;
    throw err;
  }
  const hmac_hash = authService.generatePassportHmac(num_passeport, mrz);
  return getByHashForAgent(hmac_hash);
}

async function getByHashForAgent(hmac_hash) {
  const off = await PassportOffchain.findOne({ hmac_hash }).lean();
  if (!off) {
    const err = new Error("NOT_FOUND_OFFCHAIN");
    err.status = 404;
    throw err;
  }
  const bc = await blockchainService.safeCall(() => blockchainService.getPassportOnChain(hmac_hash));
  if (!bc.ok) {
    const err = new Error("BLOCKCHAIN_UNAVAILABLE");
    err.status = 503;
    err.details = bc.error;
    throw err;
  }
  const row = bc.data;
  const copy = {
    ...off,
    photo_url: decryptField(off.photo_url),
    biometrie: decryptField(off.biometrie),
  };
  delete copy.__v;
  const copyWithCreator = await enrichOffchainCreatorIdent(copy);

  let remplace_par = null;
  if (off.superseded_by) {
    const next = await PassportOffchain.findOne({ hmac_hash: off.superseded_by })
      .select("hmac_hash num_passeport mrz is_current")
      .lean();
    if (next) {
      remplace_par = {
        hmac_hash: next.hmac_hash,
        num_passeport: next.num_passeport,
        mrz: next.mrz,
        is_current: isOffchainCurrent(next),
      };
    } else {
      remplace_par = { hmac_hash: off.superseded_by, note: "Ligne off-chain introuvable pour le nouveau hash" };
    }
  }

  const chainBase = await buildRenewalChainSummaries(off);
  const renewal_chain = await attachRenewalMotifsToChain(chainBase);
  const activeHmac = renewal_chain.length ? renewal_chain[renewal_chain.length - 1].hmac_hash : off.hmac_hash;

  const verification_scanned = await verifyPassport(String(off.num_passeport).trim(), String(off.mrz).trim());

  const activeOffLean = await PassportOffchain.findOne({ hmac_hash: activeHmac }).lean();
  const verification_active = activeOffLean
    ? await verifyPassport(String(activeOffLean.num_passeport).trim(), String(activeOffLean.mrz).trim())
    : verification_scanned;

  let active_passport = null;
  if (activeOffLean && activeHmac !== off.hmac_hash) {
    const bcAct = await blockchainService.safeCall(() => blockchainService.getPassportOnChain(activeHmac));
    if (bcAct.ok) {
      const offAct = {
        ...activeOffLean,
        photo_url: decryptField(activeOffLean.photo_url),
        biometrie: decryptField(activeOffLean.biometrie),
      };
      delete offAct.__v;
      const offActEnriched = await enrichOffchainCreatorIdent(offAct);
      active_passport = {
        offchain: offActEnriched,
        onchain: await enrichOnchainWithAgentIdentifiant(mapOnchainFromRow(bcAct.data)),
      };
    }
  }

  let onMain = mapOnchainFromRow(row);
  onMain = await enrichOnchainWithAgentIdentifiant(onMain);

  return {
    offchain: copyWithCreator,
    onchain: onMain,
    lifecycle: {
      is_current: isOffchainCurrent(off),
      superseded_by: off.superseded_by || null,
      supersedes: off.supersedes || null,
      remplace_par,
    },
    renewal_chain,
    active_hmac_hash: activeHmac,
    verification_scanned,
    verification_active,
    active_passport,
  };
}

async function renewPassport(payload, agent) {
  const {
    num_passeport,
    mrz,
    nouveau_num_passeport,
    nouveau_mrz,
    date_expiration,
    motif,
  } = payload;
  if (!num_passeport || !mrz || !nouveau_num_passeport || !nouveau_mrz || !date_expiration || !motif) {
    const err = new Error("CHAMPS_REQUIS");
    err.status = 400;
    throw err;
  }

  const oldHash = authService.generatePassportHmac(num_passeport, mrz);
  const newHash = authService.generatePassportHmac(nouveau_num_passeport, nouveau_mrz);

  const off = await PassportOffchain.findOne({ hmac_hash: oldHash });
  if (!off) {
    const err = new Error("NOT_FOUND");
    err.status = 404;
    throw err;
  }
  if (!isOffchainCurrent(off)) {
    const err = new Error("PASSEPORT_NON_ACTIF_OFFCHAIN");
    err.status = 409;
    err.details = off.superseded_by
      ? `Ce passeport n'est plus la version courante. Utilisez le hash actif: ${off.superseded_by}`
      : "Ce passeport n'est plus la version courante.";
    throw err;
  }

  // FIX 1: CHECK FOR PENDING/CONFIRMED REVOCATION
  // User cannot renew a passport that has an active revocation request
  const revocationRequest = await RevocationRequest.findOne({
    hmac_hash: oldHash,
    statut: { $in: ["EN_ATTENTE", "CONFIRME"] }
  });
  if (revocationRequest) {
    const err = new Error("REVOCATION_PENDING_OR_CONFIRMED");
    err.status = 409;
    
    if (revocationRequest.statut === "EN_ATTENTE") {
      // Revocation still pending admin review
      err.details = `Une demande de révocation est en attente pour ce passeport (ID: ${revocationRequest._id}). Attendez la décision de l'admin avant de renouveler.`;
    } else if (["PERDU", "VOLE"].includes(revocationRequest.raison)) {
      // Fast path: For lost/stolen, guide user to CREATE instead
      err.details = `Ce passeport a été marqué comme ${revocationRequest.raison === "PERDU" ? "PERDU" : "VOLÉ"}. Créez un NOUVEAU passeport au lieu de le renouveler. Utilisez le même CIN via POST /passport/create.`;
    } else {
      // Slow path: For other reasons, require admin assistance
      err.details = `Ce passeport a été révoqué pour raison: ${revocationRequest.raison}. Contactez l'administration pour assistance.`;
    }
    throw err;
  }

  const existsNew = await PassportOffchain.findOne({ hmac_hash: newHash });
  if (existsNew) {
    const err = new Error("NEW_HASH_EXISTS");
    err.status = 409;
    throw err;
  }

  const newDateEmission = Math.floor(Date.now() / 1000);
  const newDateExpiration = toUnixSeconds(date_expiration);
  if (newDateExpiration <= newDateEmission) {
    const err = new Error("DATE_EXPIRATION_INVALIDE");
    err.status = 400;
    throw err;
  }

  const preRenew = await blockchainService.safeCall(() => blockchainService.getPassportOnChain(oldHash));
  if (preRenew.ok) {
    const r = preRenew.data;
    const statutEffectif = r.statutEffectif ?? r[8];

    // FIX 2: CHECK ON-CHAIN STATUS - CANNOT RENEW IF REVOQUE/PERDU
    // After revocation is confirmed, status becomes REVOQUE on-chain
    if (statutEffectif === "REVOQUE") {
      const err = new Error("PASSEPORT_REVOQUE");
      err.status = 409;
      // Try to get revocation reason from on-chain data for better guidance
      const raison = r.raisonRevocation ?? r[3];
      if (["PERDU", "VOLE"].includes(raison)) {
        err.details = `Ce passeport a été marqué comme ${raison === "PERDU" ? "PERDU" : "VOLÉ"} sur la chaîne. Créez un NOUVEAU passeport au lieu de le renouveler. Utilisez le même CIN via POST /passport/create.`;
      } else {
        err.details = `Ce passeport a été révoqué sur la chaîne (raison: ${raison}). Contactez l'administration pour assistance.`;
      }
      throw err;
    }

    if (statutEffectif === "PERDU") {
      const err = new Error("PASSEPORT_PERDU_ONCHAIN");
      err.status = 409;
      err.details = "Ce passeport est marqué comme PERDU sur la chaîne. Créez un NOUVEAU passeport au lieu de le renouveler. Utilisez le même CIN via POST /passport/create.";
      throw err;
    }

    // Check if already renewed
    const renewedOld = typeof r.renewed === "boolean" ? r.renewed : r[7];
    if (renewedOld) {
      const err = new Error("PASSEPORT_DEJA_RENOUVELE");
      err.status = 409;
      err.details =
        "Ce passeport a deja ete renouvelle on-chain. Utilisez le couple numero/MRZ du passeport actif.";
      throw err;
    }
  }

  const ethAgent = String(agent.eth_address).toLowerCase();

  const bc = await blockchainService.safeCall(() =>
    blockchainService.renewOnChain(oldHash, newHash, newDateEmission, newDateExpiration, ethAgent)
  );
  if (!bc.ok) {
    const chainError = String(bc.error || "");
    const err = new Error("BLOCKCHAIN_TX_FAILED");
    err.status = 503;
    err.details = chainError;

    if (chainError.includes("ALREADY_RENEWED")) {
      err.message = "PASSEPORT_DEJA_RENOUVELE";
      err.status = 409;
      err.details =
        "Ce passeport a deja ete renouvelle. Utilisez le passeport actif le plus recent.";
    } else if (chainError.includes("OLD_EXPIRED")) {
      err.message = "ANCIEN_PASSEPORT_EXPIRE";
      err.status = 409;
      err.details =
        "L'ancien passeport est expire on-chain. Renouvelez a partir du passeport actif courant.";
    } else if (chainError.includes("OLD_NOT_ACTIF")) {
      err.message = "ANCIEN_PASSEPORT_NON_ACTIF";
      err.status = 409;
      err.details =
        "L'ancien passeport n'est plus ACTIF on-chain (revoque/perdu/invalide).";
    }
    throw err;
  }

  const txHash = bc.data.txHash;

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const oldUpdate = await PassportOffchain.updateOne(
        { hmac_hash: oldHash, is_current: { $ne: false } },
        { $set: { is_current: false, superseded_by: newHash } },
        { session }
      );
      if (oldUpdate.matchedCount === 0) {
        const err = new Error("CONCURRENT_RENEWAL");
        err.status = 409;
        throw err;
      }

      await Renouvellement.create(
        [
          {
            hash_precedent: oldHash,
            hash_nouveau: newHash,
            id_agent: agent._id,
            motif,
            tx_hash: txHash,
          },
        ],
        { session }
      );

      await PassportOffchain.create(
        [
          {
            hmac_hash: newHash,
            nom: off.nom,
            prenom: off.prenom,
            num_passeport: String(nouveau_num_passeport).trim(),
            mrz: String(nouveau_mrz).trim(),
            date_naissance: off.date_naissance,
            lieu_naissance: off.lieu_naissance,
            cin: off.cin,
            photo_url: off.photo_url,
            biometrie: off.biometrie,
            adresse: off.adresse,
            nationalite: off.nationalite,
            id_agent_createur: agent._id,
            tx_hash_creation: txHash,
            is_current: true,
            supersedes: oldHash,
          },
        ],
        { session }
      );
    });
  } catch (e) {
    if (e && (e.code === 11000 || String(e.message).includes("E11000"))) {
      const err = new Error("OFFCHAIN_WRITE_CONFLICT");
      err.status = 409;
      err.details =
        "Ecriture MongoDB impossible (conflit). La chaine peut etre a jour — verifier les donnees et contacter un admin si besoin.";
      throw err;
    }
    throw e;
  } finally {
    session.endSession();
  }

  return {
    ancien_hmac_hash: oldHash,
    nouveau_hmac_hash: newHash,
    tx_hash: txHash,
    nouveau_num_passeport: String(nouveau_num_passeport).trim(),
    nouveau_mrz: String(nouveau_mrz).trim(),
  };
}

async function setTravelBan(hmac_hash, interdiction, _admin) {
  const off = await PassportOffchain.findOne({ hmac_hash });
  if (!off) {
    const err = new Error("NOT_FOUND");
    err.status = 404;
    throw err;
  }
  if (!isOffchainCurrent(off)) {
    const err = new Error("PASSEPORT_NON_ACTIF_OFFCHAIN");
    err.status = 409;
    err.details = off.superseded_by
      ? `Interdiction de sortie: utiliser le passeport courant (hash ${off.superseded_by}).`
      : "Version de passeport non courante.";
    throw err;
  }

  const preBc = await blockchainService.safeCall(() => blockchainService.getPassportOnChain(hmac_hash));
  if (preBc.ok) {
    const row0 = preBc.data;
    const renewed0 = typeof row0.renewed === "boolean" ? row0.renewed : row0[7];
    if (renewed0) {
      const err = new Error("PASSEPORT_REMPLACE");
      err.status = 409;
      err.details =
        "Ce hash correspond a un passeport deja renouvele. Appliquez l'interdiction sur le passeport actif.";
      throw err;
    }
  }

  const bc = await blockchainService.safeCall(() =>
    blockchainService.setTravelBanOnChain(hmac_hash, Boolean(interdiction))
  );
  if (!bc.ok) {
    const err = new Error("BLOCKCHAIN_TX_FAILED");
    err.status = 503;
    err.details = bc.error;
    throw err;
  }
  return { hmac_hash, interdiction_sortie: Boolean(interdiction), tx_hash: bc.data.txHash };
}

/** Get complete CIN history - all passports for a CIN with their revocation status */
async function getCINHistory(cin) {
  if (!cin) {
    const err = new Error("CIN_REQUIS");
    err.status = 400;
    throw err;
  }

  const cinTrim = String(cin).trim();

  // Get all passports with this CIN
  const allPassports = await PassportOffchain.find({ cin: cinTrim })
    .sort({ created_at: 1 })
    .lean();

  if (!allPassports || allPassports.length === 0) {
    const err = new Error("NOT_FOUND");
    err.status = 404;
    throw err;
  }

  // For each passport, get revocation and renewal info
  const enrichedPassports = await Promise.all(
    allPassports.map(async (passport) => {
      // Get revocation details if any
      const revocationReq = await RevocationRequest.findOne({
        hmac_hash: passport.hmac_hash,
        statut: "CONFIRME",
      })
        .select("raison statut date_confirmation date_demande allow_replacement")
        .lean();

      // Build status
      let status = "ACTIF";
      if (passport.is_current === false) {
        if (revocationReq) {
          status = `REVOQUE (${revocationReq.raison})`;
        } else if (passport.superseded_by) {
          status = "REMPLACE";
        }
      }

      return {
        hmac_hash: passport.hmac_hash,
        num_passeport: passport.num_passeport,
        mrz: passport.mrz,
        created_at: passport.created_at,
        is_current: isOffchainCurrent(passport),
        status,
        lifecycle: {
          supersedes: passport.supersedes || null,
          superseded_by: passport.superseded_by || null,
        },
        revocation: revocationReq
          ? {
              raison: revocationReq.raison,
              date_demande: revocationReq.date_demande,
              date_confirmation: revocationReq.date_confirmation,
              allow_replacement: revocationReq.allow_replacement,
            }
          : null,
      };
    })
  );

  return {
    cin: cinTrim,
    total: enrichedPassports.length,
    current: enrichedPassports.find((p) => p.is_current),
    history: enrichedPassports,
  };
}

module.exports = {
  createPassport,
  verifyPassport,
  getPassportByCredentials,
  getByHashForAgent,
  renewPassport,
  setTravelBan,
  getCINHistory,
  toUnixSeconds,
  isOffchainCurrent,
};
