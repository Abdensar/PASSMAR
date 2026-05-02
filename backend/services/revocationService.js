const RevocationRequest = require("../models/RevocationRequest");
const PassportOffchain = require("../models/PassportOffchain");
const blockchainService = require("./blockchainService");
const authService = require("./authService");

const RAISON_LABEL = {
  VOLE: "VOLÉ",
  PERDU: "PERDU",
  FALSIFIE: "FALSIFIÉ",
  DECES: "DÉCÈS",
  JUDICIAIRE: "JUDICIAIRE",
  MODIFICATION_INFO: "MODIFICATION INFO CLIENT",
};

async function initiateRevoke({ hmac_hash, num_passeport, mrz, raison }, agent) {
  let targetHash = hmac_hash ? String(hmac_hash).trim() : "";
  const num = num_passeport ? String(num_passeport).trim() : "";
  const mrzVal = mrz ? String(mrz).trim() : "";
  if (!targetHash && num && mrzVal) {
    targetHash = authService.generatePassportHmac(num, mrzVal);
  }
  if (!targetHash || !raison) {
    const err = new Error("CHAMPS_REQUIS");
    err.status = 400;
    throw err;
  }
  const allowed = Object.keys(RAISON_LABEL);
  if (!allowed.includes(raison)) {
    const err = new Error("RAISON_INVALIDE");
    err.status = 400;
    throw err;
  }

  const off = await PassportOffchain.findOne({ hmac_hash: targetHash });
  if (!off) {
    const err = new Error("NOT_FOUND");
    err.status = 404;
    throw err;
  }
  if (off.is_current === false) {
    const err = new Error("PASSEPORT_NON_ACTIF_OFFCHAIN");
    err.status = 409;
    err.details = off.superseded_by
      ? `Initiez la révocation sur le passeport courant (hash ${off.superseded_by}).`
      : "Ce passeport n'est plus la version courante.";
    throw err;
  }

  const bc = await blockchainService.safeCall(() => blockchainService.getPassportOnChain(targetHash));
  if (bc.ok) {
    const row = bc.data;
    const renewed = typeof row.renewed === "boolean" ? row.renewed : row[7];
    if (renewed) {
      const err = new Error("PASSEPORT_REMPLACE");
      err.status = 409;
      err.details =
        "Ce passeport a été renouvelé sur la chaîne. Utilisez le hash / document actif pour une révocation.";
      throw err;
    }
  }

  const ex = await RevocationRequest.findOne({
    hmac_hash: targetHash,
    statut: "EN_ATTENTE",
  });
  if (ex) {
    const err = new Error("REVOCATION_ALREADY_PENDING");
    err.status = 409;
    throw err;
  }

  const doc = await RevocationRequest.create({
    hmac_hash: targetHash,
    id_agent_initiator: agent._id,
    raison,
    statut: "EN_ATTENTE",
  });
  return { id_demande: doc._id, statut: doc.statut, hmac_hash: targetHash };
}

async function listPending() {
  return RevocationRequest.find({ statut: "EN_ATTENTE" })
    .sort({ date_demande: -1 })
    .lean();
}

async function listConfirmedNeedsReplacement() {
  return RevocationRequest.find({
    statut: "CONFIRME",
    raison: { $in: ["FALSIFIE", "DECES", "JUDICIAIRE"] },
    allow_replacement: false,
  })
    .sort({ date_confirmation: -1 })
    .lean();
}

async function listAll({ limit = 100, skip = 0 } = {}) {
  const [items, total] = await Promise.all([
    RevocationRequest.find({})
      .sort({ date_demande: -1 })
      .skip(skip)
      .limit(Math.min(limit, 200))
      .lean(),
    RevocationRequest.countDocuments({}),
  ]);
  return { items, total };
}

async function confirmRevoke({ id_demande }, admin) {
  if (!id_demande) {
    const err = new Error("CHAMPS_REQUIS");
    err.status = 400;
    throw err;
  }
  const reqDoc = await RevocationRequest.findById(id_demande);
  if (!reqDoc) {
    const err = new Error("NOT_FOUND");
    err.status = 404;
    throw err;
  }
  if (reqDoc.statut !== "EN_ATTENTE") {
    const err = new Error("STATUT_INVALIDE");
    err.status = 409;
    throw err;
  }

  const raisonStr = RAISON_LABEL[reqDoc.raison] || reqDoc.raison;
  const bc = await blockchainService.safeCall(() =>
    blockchainService.confirmRevocationOnChain(reqDoc.hmac_hash, raisonStr)
  );
  if (!bc.ok) {
    const err = new Error("BLOCKCHAIN_TX_FAILED");
    err.status = 503;
    err.details = bc.error;
    throw err;
  }

  reqDoc.statut = "CONFIRME";
  reqDoc.id_agent_confirm = admin._id;
  reqDoc.date_confirmation = new Date();
  reqDoc.tx_hash_revocation = bc.data.txHash;
  await reqDoc.save();

  // Mark old passport as inactive now that revocation is confirmed
  const PassportOffchain = require("../models/PassportOffchain");
  await PassportOffchain.updateOne(
    { hmac_hash: reqDoc.hmac_hash },
    { $set: { is_current: false } }
  );

  return {
    id_demande: reqDoc._id,
    hmac_hash: reqDoc.hmac_hash,
    statut: "REVOQUE",
    tx_hash: bc.data.txHash,
  };
}

async function rejectRevoke({ id_demande, notes }, admin) {
  if (!id_demande) {
    const err = new Error("CHAMPS_REQUIS");
    err.status = 400;
    throw err;
  }
  const reqDoc = await RevocationRequest.findById(id_demande);
  if (!reqDoc) {
    const err = new Error("NOT_FOUND");
    err.status = 404;
    throw err;
  }
  if (reqDoc.statut !== "EN_ATTENTE") {
    const err = new Error("STATUT_INVALIDE");
    err.status = 409;
    throw err;
  }
  reqDoc.statut = "REJETE";
  reqDoc.id_agent_confirm = admin._id;
  reqDoc.date_confirmation = new Date();
  reqDoc.notes = notes || "";
  await reqDoc.save();
  return { id_demande: reqDoc._id, statut: "REJETE" };
}

module.exports = {
  initiateRevoke,
  listPending,
  listConfirmedNeedsReplacement,
  listAll,
  confirmRevoke,
  rejectRevoke,
};
