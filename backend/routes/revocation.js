const express = require("express");
const revocationService = require("../services/revocationService");
const auditService = require("../services/auditService");
const { authenticate } = require("../middleware/authCookie");
const { requireRoles } = require("../middleware/rbac");
const { adminLimiter } = require("../middleware/rateLimiter");

const router = express.Router();

router.get("/pending", authenticate, requireRoles("ADMIN"), adminLimiter, async (req, res) => {
  const ip = req.ip || "";
  const ua = req.get("user-agent") || "";
  try {
    const items = await revocationService.listPending();
    await auditService.log({
      id_agent: req.agent._id,
      action: auditService.ACTIONS.LIST_REVOCATIONS,
      ip_address: ip,
      user_agent: ua,
      resultat: "SUCCESS",
      details: "pending",
    });
    return res.json({ items });
  } catch (e) {
    await auditService.log({
      id_agent: req.agent._id,
      action: auditService.ACTIONS.LIST_REVOCATIONS,
      ip_address: ip,
      user_agent: ua,
      resultat: "FAILED",
      details: e.message,
    });
    return res.status(500).json({ error: e.message });
  }
});

router.get("/all", authenticate, requireRoles("ADMIN"), adminLimiter, async (req, res) => {
  const ip = req.ip || "";
  const ua = req.get("user-agent") || "";
  try {
    const limit = Number(req.query.limit || 100);
    const skip = Number(req.query.skip || 0);
    const data = await revocationService.listAll({ limit, skip });
    await auditService.log({
      id_agent: req.agent._id,
      action: auditService.ACTIONS.LIST_REVOCATIONS,
      ip_address: ip,
      user_agent: ua,
      resultat: "SUCCESS",
      details: "all",
    });
    return res.json(data);
  } catch (e) {
    await auditService.log({
      id_agent: req.agent._id,
      action: auditService.ACTIONS.LIST_REVOCATIONS,
      ip_address: ip,
      user_agent: ua,
      resultat: "FAILED",
      details: e.message,
    });
    return res.status(500).json({ error: e.message });
  }
});

module.exports = router;
