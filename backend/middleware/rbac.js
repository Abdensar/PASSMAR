function requireRoles(...allowed) {
  const set = new Set(allowed.flat());
  return (req, res, next) => {
    if (!req.agent) {
      return res.status(401).json({ error: "Non authentifié" });
    }
    if (!set.has(req.agent.role)) {
      return res.status(403).json({ error: "Permission refusée pour ce rôle" });
    }
    return next();
  };
}

module.exports = { requireRoles };
