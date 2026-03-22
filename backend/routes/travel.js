const express = require("express");
const travelService = require("../services/travelService");
const auditService = require("../services/auditService");
const { authenticate } = require("../middleware/authCookie");
const { requireRoles } = require("../middleware/rbac");
const { defaultWriteLimiter } = require("../middleware/rateLimiter");

const router = express.Router();

router.post("/travel", authenticate, requireRoles("DOUANE"), defaultWriteLimiter, async (req, res) => {
  const ip = req.ip || "";
  const ua = req.get("user-agent") || "";
  try {
    const out = await travelService.addTravel(req.body, req.agent);
    await auditService.log({
      id_agent: req.agent._id,
      action: auditService.ACTIONS.ADD_TRAVEL,
      target_hash: out.hmac_hash,
      ip_address: ip,
      user_agent: ua,
      resultat: "SUCCESS",
      details: out.tx_hash,
    });
    return res.json(out);
  } catch (e) {
    await auditService.log({
      id_agent: req.agent._id,
      action: auditService.ACTIONS.ADD_TRAVEL,
      ip_address: ip,
      user_agent: ua,
      resultat: "FAILED",
      details: e.message,
    });
    const code = e.status || 500;
    return res.status(code).json({
      error: e.message,
      details: e.details,
      statut_effectif: e.statut_effectif,
      tx_hash: e.tx_hash,
    });
  }
});

router.post(
  "/foreign-travel",
  authenticate,
  requireRoles("DOUANE"),
  defaultWriteLimiter,
  async (req, res) => {
    const ip = req.ip || "";
    const ua = req.get("user-agent") || "";
    try {
      const out = await travelService.addForeignTravel(req.body, req.agent);
      await auditService.log({
        id_agent: req.agent._id,
        action: auditService.ACTIONS.FOREIGN_TRAVEL,
        ip_address: ip,
        user_agent: ua,
        resultat: "SUCCESS",
        details: out.id,
      });
      return res.status(201).json(out);
    } catch (e) {
      await auditService.log({
        id_agent: req.agent._id,
        action: auditService.ACTIONS.FOREIGN_TRAVEL,
        ip_address: ip,
        user_agent: ua,
        resultat: "FAILED",
        details: e.message,
      });
      const code = e.status || 500;
      return res.status(code).json({ error: e.message });
    }
  }
);

router.get(
  "/:hash/travels",
  authenticate,
  requireRoles("DOUANE", "POLICE"),
  async (req, res) => {
    const ip = req.ip || "";
    const ua = req.get("user-agent") || "";
    const { hash } = req.params;
    try {
      const data = await travelService.getTravelHistory(hash);
      await auditService.log({
        id_agent: req.agent._id,
        action: auditService.ACTIONS.LIST_TRAVELS,
        target_hash: hash,
        ip_address: ip,
        user_agent: ua,
        resultat: "SUCCESS",
      });
      return res.json(data);
    } catch (e) {
      await auditService.log({
        id_agent: req.agent._id,
        action: auditService.ACTIONS.LIST_TRAVELS,
        target_hash: hash,
        ip_address: ip,
        user_agent: ua,
        resultat: "FAILED",
        details: e.message,
      });
      const code = e.status || 500;
      return res.status(code).json({ error: e.message, details: e.details });
    }
  }
);

module.exports = router;
