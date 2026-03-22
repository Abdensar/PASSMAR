const { rateLimit, ipKeyGenerator } = require("express-rate-limit");

/** Clé = id agent si authentifié, sinon IP normalisée (IPv6-safe). */
function keyAgentOrIp(req) {
  if (req.agent && req.agent._id) {
    return String(req.agent._id);
  }
  return ipKeyGenerator(req.ip || "127.0.0.1");
}

const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Trop de tentatives de connexion. Réessayez dans une minute." },
});

const verifyLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Limite de vérifications atteinte pour cette adresse IP." },
});

function createPerAgentLimiter(maxPerWindow) {
  return rateLimit({
    windowMs: 60 * 1000,
    max: maxPerWindow,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: keyAgentOrIp,
    message: { error: "Limite de requêtes atteinte pour cet agent." },
  });
}

const createPassportLimiter = createPerAgentLimiter(10);

const defaultWriteLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: keyAgentOrIp,
  message: { error: "Trop de requêtes. Réessayez plus tard." },
});

const adminLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: keyAgentOrIp,
  message: { error: "Limite administrateur atteinte." },
});

module.exports = {
  loginLimiter,
  verifyLimiter,
  createPassportLimiter,
  defaultWriteLimiter,
  adminLimiter,
};
