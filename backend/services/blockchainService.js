const path = require("path");
const { ethers } = require("ethers");

let provider;
let wallet;
let contract;

function loadArtifact() {
  const artifactPath = path.join(
    __dirname,
    "..",
    "..",
    "blockchain",
    "artifacts",
    "contracts",
    "PassportRegistry.sol",
    "PassportRegistry.json"
  );
  // eslint-disable-next-line import/no-dynamic-require, global-require
  return require(artifactPath);
}

function connect() {
  const url = process.env.GANACHE_URL || "http://127.0.0.1:7545";
  const pk = process.env.DEPLOYER_PRIVATE_KEY;
  const addr = process.env.CONTRACT_ADDRESS;
  if (!pk) throw new Error("DEPLOYER_PRIVATE_KEY manquant");
  if (!addr) throw new Error("CONTRACT_ADDRESS manquant");
  provider = new ethers.providers.JsonRpcProvider(url);
  wallet = new ethers.Wallet(pk, provider);
  const { abi } = loadArtifact();
  contract = new ethers.Contract(addr, abi, wallet);
  return contract;
}

function getContract() {
  if (!contract) return connect();
  return contract;
}

async function safeCall(fn) {
  try {
    return { ok: true, data: await fn() };
  } catch (e) {
    const msg = e.error?.message || e.reason || e.message || "BLOCKCHAIN_ERROR";
    return { ok: false, error: msg };
  }
}

async function createPassportOnChain(hmacHash, dateEmission, dateExpiration, ethAgentEmetteur) {
  const c = getContract();
  const tx = await c.createPassport(hmacHash, dateEmission, dateExpiration, ethAgentEmetteur);
  const receipt = await tx.wait();
  return { txHash: receipt.transactionHash, receipt };
}

async function addTravelOnChain(hmacHash, typeMvt, timestamp, ethAgentSig) {
  const c = getContract();
  const tx = await c.addTravel(hmacHash, typeMvt, timestamp, ethAgentSig);
  const receipt = await tx.wait();
  return { txHash: receipt.transactionHash, receipt };
}

async function getPassportOnChain(hmacHash) {
  const c = getContract();
  return c.getPassport(hmacHash);
}

async function getTravelHistoryOnChain(hmacHash) {
  const c = getContract();
  return c.getTravelHistory(hmacHash);
}

async function confirmRevocationOnChain(hmacHash, raison) {
  const c = getContract();
  const tx = await c.confirmRevocation(hmacHash, raison);
  const receipt = await tx.wait();
  return { txHash: receipt.transactionHash, receipt };
}

async function renewOnChain(oldHash, newHash, newDateEmission, newDateExpiration, ethAgent) {
  const c = getContract();
  const tx = await c.renewPassport(oldHash, newHash, newDateEmission, newDateExpiration, ethAgent);
  const receipt = await tx.wait();
  return { txHash: receipt.transactionHash, receipt };
}

async function setTravelBanOnChain(hmacHash, banned) {
  const c = getContract();
  const tx = await c.setTravelBan(hmacHash, banned);
  const receipt = await tx.wait();
  return { txHash: receipt.transactionHash, receipt };
}

async function existsOnChain(hmacHash) {
  const c = getContract();
  return c.exists(hmacHash);
}

module.exports = {
  connect,
  getContract,
  safeCall,
  createPassportOnChain,
  addTravelOnChain,
  getPassportOnChain,
  getTravelHistoryOnChain,
  confirmRevocationOnChain,
  renewOnChain,
  setTravelBanOnChain,
  existsOnChain,
};
