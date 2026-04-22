const Agent = require("../models/Agent");
const Autorite = require("../models/Autorite");
const authService = require("./authService");
const { ethers } = require("ethers");

async function getAvailableEthAddress() {
  const url = process.env.GANACHE_URL || "http://127.0.0.1:7545";
  const provider = new ethers.providers.JsonRpcProvider(url);
  const accounts = await provider.listAccounts();
  // Get all used addresses
  const used = await Agent.find({}, 'eth_address').lean();
  const usedAddresses = new Set(used.map(a => a.eth_address.toLowerCase()));
  // Find first unused
  for (const acc of accounts) {
    if (!usedAddresses.has(acc.toLowerCase())) {
      return acc;
    }
  }
  // If all used, generate random (fallback)
  return ethers.Wallet.createRandom().address;
}

async function ensureAutorite({ nom_autorite, type_autorite, adresse_ip }) {
  let a = await Autorite.findOne({ type_autorite, nom_autorite });
  if (!a) {
    a = await Autorite.create({
      nom_autorite: nom_autorite || `Autorité ${type_autorite}`,
      type_autorite,
      adresse_ip: adresse_ip || "",
    });
  }
  return a;
}

async function createAgent(payload) {
  const {
    identifiant,
    password,
    role,
    id_autorite,
    nom_autorite,
    type_autorite,
    adresse_ip,
  } = payload;

  if (!identifiant || !password || !role) {
    const err = new Error("CHAMPS_REQUIS");
    err.status = 400;
    throw err;
  }

  let autoriteId = id_autorite;
  if (!autoriteId) {
    if (!type_autorite) {
      const err = new Error("AUTORITE_REQUISE");
      err.status = 400;
      throw err;
    }
    const aut = await ensureAutorite({
      nom_autorite: nom_autorite,
      type_autorite,
      adresse_ip,
    });
    autoriteId = aut._id;
  } else {
    const exists = await Autorite.findById(id_autorite);
    if (!exists) {
      const err = new Error("AUTORITE_INCONNUE");
      err.status = 400;
      throw err;
    }
  }

  const pwd_hash = await authService.hashPassword(password);
  const eth_address = await getAvailableEthAddress();

  let totp_secret = null;
  let totp_enabled = false;
  let otpauth_url = null;
  if (role === "ADMIN") {
    const sec = authService.generateTotpSecret();
    totp_secret = sec.base32;
    totp_enabled = true;
    otpauth_url = sec.otpauth_url;
  }

  try {
    const agent = await Agent.create({
      id_autorite: autoriteId,
      identifiant: String(identifiant).trim(),
      pwd_hash,
      role,
      eth_address,
      totp_secret,
      totp_enabled,
    });
    const safe = agent.toObject();
    delete safe.pwd_hash;
    delete safe.totp_secret;
    return { agent: safe, otpauth_url: role === "ADMIN" ? otpauth_url : null };
  } catch (e) {
    if (e.code === 11000) {
      const err = new Error("DUPLICATE");
      err.status = 409;
      throw err;
    }
    throw e;
  }
}

async function listAgents() {
  return Agent.find({})
    .populate('id_autorite')
    .select("-pwd_hash -totp_secret")
    .sort({ created_at: -1 })
    .lean();
}

async function updateAgent(id, patch) {
  const agent = await Agent.findById(id);
  if (!agent) {
    const err = new Error("NOT_FOUND");
    err.status = 404;
    throw err;
  }
  if (typeof patch.is_active === "boolean") agent.is_active = patch.is_active;
  if (patch.role && ["DOUANE", "POLICE", "ADMIN"].includes(patch.role)) {
    agent.role = patch.role;
  }
  if (patch.eth_address) agent.eth_address = String(patch.eth_address).trim().toLowerCase();
  if (patch.password) agent.pwd_hash = await authService.hashPassword(patch.password);
  await agent.save();
  const o = agent.toObject();
  delete o.pwd_hash;
  delete o.totp_secret;
  return o;
}

async function statsOverview() {
  const [agents, passports, voyages, audits] = await Promise.all([
    Agent.countDocuments({}),
    require("../models/PassportOffchain").countDocuments({}),
    require("../models/VoyageOffchain").countDocuments({}),
    require("../models/AuditLog").countDocuments({}),
  ]);
  return { agents, passports, voyages, audit_entries: audits };
}

module.exports = { createAgent, listAgents, updateAgent, statsOverview, ensureAutorite };
