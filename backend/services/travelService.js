const VoyageOffchain = require("../models/VoyageOffchain");
const VoyageEtranger = require("../models/VoyageEtranger");
const authService = require("./authService");
const blockchainService = require("./blockchainService");

async function assertPassportAllowsTravel(hmac_hash, type_mvt) {
  const bc = await blockchainService.safeCall(() => blockchainService.getPassportOnChain(hmac_hash));
  if (!bc.ok) {
    const err = new Error("BLOCKCHAIN_UNAVAILABLE");
    err.status = 503;
    err.details = bc.error;
    throw err;
  }
  const row = bc.data;
  const statut = row.statutEffectif ?? row[8];
  const interdiction = row.interdictionSortie ?? row[2];

  if (statut !== "ACTIF") {
    const err = new Error("PASSPORT_NOT_ACTIF");
    err.status = 403;
    err.statut_effectif = statut;
    throw err;
  }
  if (type_mvt === "SOR" && interdiction) {
    const err = new Error("TRAVEL_BAN");
    err.status = 403;
    throw err;
  }
}

async function addTravel(payload, agent) {
  const { num_passeport, mrz, type_mvt, checkpoint, destination, provenance, details } = payload;
  if (!num_passeport || !mrz || !type_mvt || !checkpoint) {
    const err = new Error("CHAMPS_REQUIS");
    err.status = 400;
    throw err;
  }
  if (type_mvt !== "ENT" && type_mvt !== "SOR") {
    const err = new Error("BAD_MOVT");
    err.status = 400;
    throw err;
  }

  const hmac_hash = authService.generatePassportHmac(num_passeport, mrz);
  await assertPassportAllowsTravel(hmac_hash, type_mvt);

  const ts = Math.floor(Date.now() / 1000);
  const ethAgent = String(agent.eth_address).toLowerCase();

  const bc = await blockchainService.safeCall(() =>
    blockchainService.addTravelOnChain(hmac_hash, type_mvt, ts, ethAgent)
  );
  if (!bc.ok) {
    const err = new Error("BLOCKCHAIN_TX_FAILED");
    err.status = 503;
    err.details = bc.error;
    throw err;
  }

  const txHash = bc.data.txHash;

  try {
    await VoyageOffchain.create({
      tx_hash: txHash,
      hmac_hash,
      id_agent: agent._id,
      type_mvt,
      checkpoint,
      details: details || "",
      destination: type_mvt === "SOR" ? destination || "" : "",
      provenance: type_mvt === "ENT" ? provenance || "" : "",
    });
  } catch (e) {
    const err = new Error("MONGO_TRAVEL_FAILURE");
    err.status = 500;
    err.details = e.message;
    err.tx_hash = txHash;
    throw err;
  }

  return { tx_hash: txHash, hmac_hash, type_mvt, enregistre: true };
}

async function getTravelHistory(hmac_hash) {
  const off = await VoyageOffchain.find({ hmac_hash }).sort({ created_at: 1 }).lean();
  const bc = await blockchainService.safeCall(() => blockchainService.getTravelHistoryOnChain(hmac_hash));
  if (!bc.ok) {
    const err = new Error("BLOCKCHAIN_UNAVAILABLE");
    err.status = 503;
    err.details = bc.error;
    throw err;
  }
  const chainList = bc.data || [];
  return {
    hmac_hash,
    offchain: off,
    onchain_count: chainList.length,
    onchain: chainList.map((t, i) => ({
      index: i,
      type_mvt: t.typeMvt ?? t[0],
      timestamp: Number(t.timestamp ?? t[1]),
      eth_agent: t.ethAgentSig ?? t[2],
    })),
  };
}

async function addForeignTravel(payload, agent) {
  const { nationalite, num_passeport_etr, type_mvt, checkpoint, date_passage, details } = payload;
  if (!nationalite || !num_passeport_etr || !type_mvt || !checkpoint || !date_passage) {
    const err = new Error("CHAMPS_REQUIS");
    err.status = 400;
    throw err;
  }
  if (type_mvt !== "ENT" && type_mvt !== "SOR") {
    const err = new Error("BAD_MOVT");
    err.status = 400;
    throw err;
  }
  const doc = await VoyageEtranger.create({
    id_agent: agent._id,
    nationalite,
    num_passeport_etr: String(num_passeport_etr).trim(),
    type_mvt,
    checkpoint,
    date_passage: new Date(date_passage),
    details: details || "",
  });
  return { id: doc._id };
}

module.exports = { addTravel, getTravelHistory, addForeignTravel, assertPassportAllowsTravel };
