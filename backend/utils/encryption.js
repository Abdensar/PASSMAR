const crypto = require("crypto");

const ALGO = "aes-256-gcm";
const IV_LEN = 16;
const AUTH_TAG_LEN = 16;

function getKey() {
  const raw = process.env.AES_256_KEY;
  if (!raw || raw.length < 32) {
    return null;
  }
  return crypto.createHash("sha256").update(raw).digest();
}

function encryptField(plain) {
  if (!plain) return "";
  const key = getKey();
  if (!key) return plain;
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(String(plain), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64");
}

function decryptField(stored) {
  if (!stored) return "";
  const key = getKey();
  if (!key) return stored;
  try {
    const buf = Buffer.from(String(stored), "base64");
    if (buf.length < IV_LEN + AUTH_TAG_LEN + 1) return stored;
    const iv = buf.subarray(0, IV_LEN);
    const tag = buf.subarray(IV_LEN, IV_LEN + AUTH_TAG_LEN);
    const data = buf.subarray(IV_LEN + AUTH_TAG_LEN);
    const decipher = crypto.createDecipheriv(ALGO, key, iv);
    decipher.setAuthTag(tag);
    return decipher.update(data, undefined, "utf8") + decipher.final("utf8");
  } catch {
    return stored;
  }
}

module.exports = { encryptField, decryptField };
