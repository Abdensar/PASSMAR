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
function calculateCheckDigit(data) {
  const weights = [7, 3, 1];
  let sum = 0;
  for (let i = 0; i < data.length; i += 1) {
    const char = data[i];
    let value = 0;
    if (char >= '0' && char <= '9') {
      value = Number(char);
    } else if (char >= 'A' && char <= 'Z') {
      value = char.charCodeAt(0) - 55;
    } else if (char === '<') {
      value = 0;
    } else {
      continue;
    }
    sum += value * weights[i % 3];
  }
  return sum % 10;
}

function formatMrzDate(dateStr) {
  const date = new Date(dateStr);
  const yy = String(date.getFullYear()).slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yy}${mm}${dd}`;
}

function generatePassportHmac(numPasseport, mrz) {
  const payload = `${String(numPasseport).trim()}|${String(mrz).trim()}`;
  return crypto.createHmac('sha256', getHmacSecret()).update(payload).digest('hex');
}

function generateMoroccanMRZ({
  surname,
  givenName,
  passportNumber,
  nationality = 'MAR',
  birthDate,
  sex,
  expiryDate,
  personalNumber = '',
}) {
  const docType = 'P';
  const countryCode = 'MAR';

  let primaryIdentifier = String(surname || '').toUpperCase().replace(/ /g, '<');
  let secondaryIdentifier = String(givenName || '').toUpperCase().replace(/ /g, '<');
  let nameString = `${secondaryIdentifier}<<${primaryIdentifier}`;
  if (nameString.length > 39) {
    nameString = nameString.substring(0, 39);
  } else {
    nameString = nameString.padEnd(39, '<');
  }

  const line1 = `${docType}<${countryCode}${nameString}`;

  let passport = String(passportNumber || '').toUpperCase().replace(/ /g, '<');
  if (passport.length > 9) passport = passport.substring(0, 9);
  else passport = passport.padEnd(9, '<');
  const passportCheckDigit = calculateCheckDigit(passport);

  const nationalityCode = String(nationality || 'MAR').toUpperCase();
  const dob = formatMrzDate(String(birthDate || ''));
  const dobCheckDigit = calculateCheckDigit(dob);
  const gender = String(sex || 'M').toUpperCase().startsWith('F') ? 'F' : 'M';
  const expDate = formatMrzDate(String(expiryDate || ''));
  const expCheckDigit = calculateCheckDigit(expDate);

  let personal = String(personalNumber || '').toUpperCase();
  if (personal.length > 14) personal = personal.substring(0, 14);
  else personal = personal.padEnd(14, '<');
  const personalCheckDigit = personal.replace(/</g, '').length > 0 ? String(calculateCheckDigit(personal)) : '<';

  const line2Base = `${passport}${passportCheckDigit}${nationalityCode}${dob}${dobCheckDigit}${gender}${expDate}${expCheckDigit}${personal}${personalCheckDigit}`;
  const compositeCheckDigit = calculateCheckDigit(line2Base);
  const line2 = `${line2Base}${compositeCheckDigit}2`;

  return {
    mrz: `${line1}\n${line2}`,
    line1,
    line2,
  };
}

function generateRenewalMRZ(oldMrz, newPassportNumber) {
  if (!oldMrz || !newPassportNumber) return null;
  const lines = String(oldMrz).split(/\r?\n/);
  const line1 = String(lines[0] || "");
  const line2 = String(lines[1] || "");
  if (line2.length < 43) return null;

  const nationalityCode = line2.slice(10, 13) || 'MAR';
  const dob = line2.slice(13, 19);
  const dobCheckDigit = line2.slice(19, 20) || '<';
  const gender = line2.slice(20, 21) || 'M';
  const expDate = line2.slice(21, 27);
  const expCheckDigit = line2.slice(27, 28) || '<';
  let personal = line2.slice(28, 42) || '';
  if (personal.length > 14) personal = personal.substring(0, 14);
  else personal = personal.padEnd(14, '<');
  const personalCheckDigit = line2.slice(42, 43) || '<';

  let passport = String(newPassportNumber || '').toUpperCase().replace(/ /g, '<');
  if (passport.length > 9) passport = passport.substring(0, 9);
  else passport = passport.padEnd(9, '<');
  const passportCheckDigit = calculateCheckDigit(passport);

  const line2Base = `${passport}${passportCheckDigit}${nationalityCode}${dob}${dobCheckDigit}${gender}${expDate}${expCheckDigit}${personal}${personalCheckDigit}`;
  const compositeCheckDigit = calculateCheckDigit(line2Base);
  const newLine2 = `${line2Base}${compositeCheckDigit}2`;

  return {
    mrz: `${line1}\n${newLine2}`,
    line1,
    line2: newLine2,
  };
}

/**
 * Generate a random MRZ-like string for internal use (renewals)
 */
function generateRandomMRZ() {
  return crypto.randomBytes(32).toString('hex').toUpperCase();
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
  generateRandomMRZ,
  generateRenewalMRZ,
  generateMoroccanMRZ,
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
