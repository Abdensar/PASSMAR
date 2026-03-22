/**
 * Premier administrateur si aucun agent n'existe.
 * Usage: définir MONGODB_URI, SEED_ADMIN_PASSWORD, SEED_ETH_ADDRESS dans .env puis:
 *   node scripts/seedAdmin.js
 */
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);
require("dotenv").config();
require("../config/dnsBootstrap");
const mongoose = require("mongoose");
const Autorite = require("../models/Autorite");
const Agent = require("../models/Agent");
const authService = require("../services/authService");

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI requis");
  await mongoose.connect(uri);
  const count = await Agent.countDocuments();
  if (count > 0) {
    console.log("Des agents existent déjà — seed ignoré.");
    process.exit(0);
  }
  const pwd = process.env.SEED_ADMIN_PASSWORD;
  const eth = process.env.SEED_ETH_ADDRESS;
  if (!pwd || !eth) {
    throw new Error("SEED_ADMIN_PASSWORD et SEED_ETH_ADDRESS requis");
  }
  const aut = await Autorite.create({
    nom_autorite: "Administration centrale",
    type_autorite: "ADMIN",
    adresse_ip: "",
  });
  const sec = authService.generateTotpSecret();
  const pwd_hash = await authService.hashPassword(pwd);
  await Agent.create({
    id_autorite: aut._id,
    identifiant: process.env.SEED_ADMIN_IDENTIFIANT || "admin",
    pwd_hash,
    role: "ADMIN",
    eth_address: String(eth).toLowerCase(),
    totp_secret: sec.base32,
    totp_enabled: true,
  });
  console.log("Admin créé. Identifiant:", process.env.SEED_ADMIN_IDENTIFIANT || "admin");
  console.log("Scannez ce secret TOTP (base32) dans votre appli d’authentification:", sec.base32);
  console.log("Ou URL otpauth:", sec.otpauth_url);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
