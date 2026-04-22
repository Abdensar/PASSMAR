const PassportOffchain = require("../models/PassportOffchain");
const Renouvellement = require("../models/Renouvellement");
const authService = require("./authService");
const blockchainService = require("./blockchainService");
const { encryptField, decryptField } = require("../utils/encryption");

function toUnixSeconds(d) {
  return Math.floor(new Date(d).getTime() / 1000);
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

  const existsMongo = await PassportOffchain.findOne({
    $or: [{ hmac_hash }, { cin: String(cin).trim() }],
  }).lean();
  if (existsMongo) {
    const err = new Error("PASSPORT_OR_CIN_EXISTS");
    err.status = 409;
    throw err;
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
    await PassportOffchain.create({
      hmac_hash,
      nom,
      prenom,
      num_passeport: String(num_passeport).trim(),
      mrz: String(mrz).trim(),
      date_naissance,
      lieu_naissance,
      cin: String(cin).trim(),
      photo_url: encryptField(photo_url || ""),
      biometrie: encryptField(biometrie || ""),
      adresse: adresse || "",
      nationalite: nationalite || "Marocaine",
      id_agent_createur: agent._id,
      tx_hash_creation: txHash,
    });
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

  if (statutEffectif === "EXPIRE") {
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
  const statutEffectif = row.statutEffectif ?? row[8];
  const renewed = typeof row.renewed === "boolean" ? row.renewed : row[7];
  const copy = {
    ...off,
    photo_url: decryptField(off.photo_url),
    biometrie: decryptField(off.biometrie),
  };
  delete copy.__v;
  return {
    offchain: copy,
    onchain: {
      statut_effectif: statutEffectif,
      interdiction_sortie:
        typeof row.interdictionSortie === "boolean" ? row.interdictionSortie : row[2],
      date_emission:
        typeof row.dateEmission === "bigint"
          ? Number(row.dateEmission)
          : row.dateEmission ?? row[4],
      date_expiration:
        typeof row.dateExpiration === "bigint"
          ? Number(row.dateExpiration)
          : row.dateExpiration ?? row[5],
      eth_agent_emetteur: row.ethAgentEmetteur ?? row[6],
      raison_revocation: row.raisonRevocation ?? row[3],
      renewed: Boolean(renewed),
    },
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

  const existsNew = await PassportOffchain.findOne({ hmac_hash: newHash });
  if (existsNew) {
    const err = new Error("NEW_HASH_EXISTS");
    err.status = 409;
    throw err;
  }

  const newDateEmission = Math.floor(Date.now() / 1000);
  const newDateExpiration = toUnixSeconds(date_expiration);
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

  await Renouvellement.create({
    hash_precedent: oldHash,
    hash_nouveau: newHash,
    id_agent: agent._id,
    motif,
    tx_hash: txHash,
  });

  await PassportOffchain.create({
    hmac_hash: newHash,
    nom: off.nom,
    prenom: off.prenom,
    num_passeport: nouveau_num_passeport,
    mrz: nouveau_mrz,
    date_naissance: off.date_naissance,
    lieu_naissance: off.lieu_naissance,
    cin: off.cin,
    photo_url: off.photo_url,
    biometrie: off.biometrie,
    adresse: off.adresse,
    nationalite: off.nationalite,
    id_agent_createur: agent._id,
    tx_hash_creation: txHash,
  });

  return { ancien_hmac_hash: oldHash, nouveau_hmac_hash: newHash, tx_hash: txHash };
}

async function setTravelBan(hmac_hash, interdiction, _admin) {
  const off = await PassportOffchain.findOne({ hmac_hash });
  if (!off) {
    const err = new Error("NOT_FOUND");
    err.status = 404;
    throw err;
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

module.exports = {
  createPassport,
  verifyPassport,
  getByHashForAgent,
  renewPassport,
  setTravelBan,
  toUnixSeconds,
};
