const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const speakeasy = require("speakeasy");

const BCRYPT_ROUNDS = Number(process.env.BCRYPT_ROUNDS || 12);
const JWT_EXPIRY = process.env.JWT_EXPIRY || "15m";
const REFRESH_EXPIRY = process.env.REFRESH_EXPIRY || "8h";

function getHmacSecret() {
  const k = process.env.HMAC_SECRET_KEY;
  if (!k) throw new Error("HMAC_SECRET_KEY manquant");
  return k;
}

function getJwtSecret() {
  const k = process.env.JWT_SECRET;
  if (!k) throw new Error("JWT_SECRET manquant");
  return k;
}

function getRefreshSecret() {
  const k = process.env.JWT_REFRESH_SECRET;
  if (!k) throw new Error("JWT_REFRESH_SECRET manquant");
  return k;
}

/**
 * HMAC-SHA256(numéro_passeport + MRZ, SECRET_KEY) — jamais SHA-256 simple.
 */
function generatePassportHmac(numPasseport, mrz) {
  const payload = `${String(numPasseport).trim()}|${String(mrz).trim()}`;
  return crypto.createHmac("sha256", getHmacSecret()).update(payload).digest("hex");
}

async function hashPassword(plain) {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

async function comparePassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

function signAccessToken(agent) {
  return jwt.sign(
    {
      sub: agent._id,
      role: agent.role,
      identifiant: agent.identifiant,
    },
    getJwtSecret(),
    { expiresIn: JWT_EXPIRY }
  );
}

function signRefreshToken(agent) {
  return jwt.sign({ sub: agent._id, typ: "refresh" }, getRefreshSecret(), {
    expiresIn: REFRESH_EXPIRY,
  });
}

function verifyAccessToken(token) {
  return jwt.verify(token, getJwtSecret());
}

function verifyRefreshToken(token) {
  return jwt.verify(token, getRefreshSecret());
}

function generateTotpSecret() {
  return speakeasy.generateSecret({ length: 20, name: "PASSMAR Admin" });
}

function verifyTotp(secret, token) {
  if (!secret || !token) return false;
  return speakeasy.totp.verify({
    secret,
    encoding: "base32",
    token: String(token),
    window: 1,
  });
}

module.exports = {
  generatePassportHmac,
  hashPassword,
  comparePassword,
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  generateTotpSecret,
  verifyTotp,
  JWT_EXPIRY,
  REFRESH_EXPIRY,
};
