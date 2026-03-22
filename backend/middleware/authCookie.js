const Agent = require("../models/Agent");
const authService = require("../services/authService");

async function authenticate(req, res, next) {
  const token = req.cookies?.access_token;
  if (!token) {
    return res.status(401).json({ error: "Non authentifié" });
  }
  try {
    const payload = authService.verifyAccessToken(token);
    const agent = await Agent.findById(payload.sub).select("-pwd_hash");
    if (!agent || !agent.is_active) {
      return res.status(401).json({ error: "Agent invalide ou désactivé" });
    }
    req.agent = agent;
    return next();
  } catch {
    return res.status(401).json({ error: "Token invalide ou expiré" });
  }
}

function optionalAuthenticate(req, res, next) {
  const token = req.cookies?.access_token;
  if (!token) return next();
  try {
    const payload = authService.verifyAccessToken(token);
    Agent.findById(payload.sub)
      .select("-pwd_hash")
      .then((agent) => {
        if (agent && agent.is_active) req.agent = agent;
        next();
      })
      .catch(() => next());
  } catch {
    next();
  }
}

module.exports = { authenticate, optionalAuthenticate };
