const express = require("express");
const adminService = require("../services/adminService");
const auditService = require("../services/auditService");
const { authenticate } = require("../middleware/authCookie");
const { requireRoles } = require("../middleware/rbac");
const { adminLimiter } = require("../middleware/rateLimiter");

const router = express.Router();

router.get("/agents", authenticate, requireRoles("ADMIN"), adminLimiter, async (req, res) => {
  const ip = req.ip || "";
  const ua = req.get("user-agent") || "";
  try {
    const items = await adminService.listAgents();
    await auditService.log({
      id_agent: req.agent._id,
      action: auditService.ACTIONS.LIST_AGENTS,
      ip_address: ip,
      user_agent: ua,
      resultat: "SUCCESS",
    });
    return res.json({ items });
  } catch (e) {
    await auditService.log({
      id_agent: req.agent._id,
      action: auditService.ACTIONS.LIST_AGENTS,
      ip_address: ip,
      user_agent: ua,
      resultat: "FAILED",
      details: e.message,
    });
    return res.status(500).json({ error: e.message });
  }
});

router.post("/agents", authenticate, requireRoles("ADMIN"), adminLimiter, async (req, res) => {
  const ip = req.ip || "";
  const ua = req.get("user-agent") || "";
  try {
    const out = await adminService.createAgent(req.body);
    await auditService.log({
      id_agent: req.agent._id,
      action: auditService.ACTIONS.CREATE_AGENT,
      ip_address: ip,
      user_agent: ua,
      resultat: "SUCCESS",
      details: out.agent.identifiant,
    });
    return res.status(201).json(out);
  } catch (e) {
    await auditService.log({
      id_agent: req.agent._id,
      action: auditService.ACTIONS.CREATE_AGENT,
      ip_address: ip,
      user_agent: ua,
      resultat: "FAILED",
      details: e.message,
    });
    const code = e.status || 500;
    return res.status(code).json({ error: e.message });
  }
});

router.patch("/agents/:id", authenticate, requireRoles("ADMIN"), adminLimiter, async (req, res) => {
  const ip = req.ip || "";
  const ua = req.get("user-agent") || "";
  try {
    const agent = await adminService.updateAgent(req.params.id, req.body);
    await auditService.log({
      id_agent: req.agent._id,
      action: auditService.ACTIONS.UPDATE_AGENT,
      ip_address: ip,
      user_agent: ua,
      resultat: "SUCCESS",
      details: req.params.id,
    });
    return res.json({ agent });
  } catch (e) {
    await auditService.log({
      id_agent: req.agent._id,
      action: auditService.ACTIONS.UPDATE_AGENT,
      ip_address: ip,
      user_agent: ua,
      resultat: "FAILED",
      details: e.message,
    });
    const code = e.status || 500;
    return res.status(code).json({ error: e.message });
  }
});

router.get("/audit", authenticate, requireRoles("ADMIN"), adminLimiter, async (req, res) => {
  const ip = req.ip || "";
  const ua = req.get("user-agent") || "";
  try {
    const data = await auditService.list(
      {
        id_agent: req.query.id_agent,
        action: req.query.action,
        resultat: req.query.resultat,
        from: req.query.from,
        to: req.query.to,
      },
      { limit: Number(req.query.limit || 200), skip: Number(req.query.skip || 0) }
    );
    await auditService.log({
      id_agent: req.agent._id,
      action: auditService.ACTIONS.LIST_AUDIT,
      ip_address: ip,
      user_agent: ua,
      resultat: "SUCCESS",
    });
    return res.json(data);
  } catch (e) {
    await auditService.log({
      id_agent: req.agent._id,
      action: auditService.ACTIONS.LIST_AUDIT,
      ip_address: ip,
      user_agent: ua,
      resultat: "FAILED",
      details: e.message,
    });
    return res.status(500).json({ error: e.message });
  }
});

router.get("/stats", authenticate, requireRoles("ADMIN"), adminLimiter, async (req, res) => {
  const ip = req.ip || "";
  const ua = req.get("user-agent") || "";
  try {
    const stats = await adminService.statsOverview();
    await auditService.log({
      id_agent: req.agent._id,
      action: auditService.ACTIONS.STATS,
      ip_address: ip,
      user_agent: ua,
      resultat: "SUCCESS",
    });
    return res.json(stats);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

module.exports = router;
