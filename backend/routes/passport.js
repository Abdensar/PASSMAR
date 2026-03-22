const express = require("express");
const passportService = require("../services/passportService");
const revocationService = require("../services/revocationService");
const auditService = require("../services/auditService");
const { authenticate } = require("../middleware/authCookie");
const { requireRoles } = require("../middleware/rbac");
const {
  verifyLimiter,
  createPassportLimiter,
  defaultWriteLimiter,
} = require("../middleware/rateLimiter");

const router = express.Router();

router.post(
  "/create",
  authenticate,
  requireRoles("DOUANE"),
  createPassportLimiter,
  async (req, res) => {
    const ip = req.ip || "";
    const ua = req.get("user-agent") || "";
    try {
      const out = await passportService.createPassport(req.body, req.agent);
      await auditService.log({
        id_agent: req.agent._id,
        action: auditService.ACTIONS.CREATE_PASSPORT,
        target_hash: out.hmac_hash,
        ip_address: ip,
        user_agent: ua,
        resultat: "SUCCESS",
      });
      return res.status(201).json(out);
    } catch (e) {
      await auditService.log({
        id_agent: req.agent._id,
        action: auditService.ACTIONS.CREATE_PASSPORT,
        ip_address: ip,
        user_agent: ua,
        resultat: "FAILED",
        details: e.message,
      });
      const code = e.status || 500;
      return res.status(code).json({
        error: e.message,
        details: e.details,
      });
    }
  }
);

router.get("/verify", authenticate, requireRoles("DOUANE", "POLICE"), verifyLimiter, async (req, res) => {
  const ip = req.ip || "";
  const ua = req.get("user-agent") || "";
  const { num, mrz } = req.query;
  try {
    const r = await passportService.verifyPassport(num, mrz);
    await auditService.log({
      id_agent: req.agent._id,
      action: auditService.ACTIONS.VERIFY_PASSPORT,
      target_hash: r.hmac_hash || "",
      ip_address: ip,
      user_agent: ua,
      resultat: r.http >= 400 ? "FAILED" : "SUCCESS",
      details: r.http >= 400 ? r.message : r.code,
    });
    return res.status(r.http).json(r);
  } catch (e) {
    await auditService.log({
      id_agent: req.agent._id,
      action: auditService.ACTIONS.VERIFY_PASSPORT,
      ip_address: ip,
      user_agent: ua,
      resultat: "FAILED",
      details: e.message,
    });
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

router.post("/renew", authenticate, requireRoles("DOUANE"), defaultWriteLimiter, async (req, res) => {
  const ip = req.ip || "";
  const ua = req.get("user-agent") || "";
  try {
    const out = await passportService.renewPassport(req.body, req.agent);
    await auditService.log({
      id_agent: req.agent._id,
      action: auditService.ACTIONS.RENEW_PASSPORT,
      target_hash: out.nouveau_hmac_hash,
      ip_address: ip,
      user_agent: ua,
      resultat: "SUCCESS",
    });
    return res.json(out);
  } catch (e) {
    await auditService.log({
      id_agent: req.agent._id,
      action: auditService.ACTIONS.RENEW_PASSPORT,
      ip_address: ip,
      user_agent: ua,
      resultat: "FAILED",
      details: e.message,
    });
    const code = e.status || 500;
    return res.status(code).json({ error: e.message, details: e.details });
  }
});

router.post(
  "/revoke/initiate",
  authenticate,
  requireRoles("DOUANE", "ADMIN"),
  defaultWriteLimiter,
  async (req, res) => {
    const ip = req.ip || "";
    const ua = req.get("user-agent") || "";
    try {
      const out = await revocationService.initiateRevoke(req.body, req.agent);
      await auditService.log({
        id_agent: req.agent._id,
        action: auditService.ACTIONS.INITIATE_REVOKE,
        target_hash: req.body.hmac_hash,
        ip_address: ip,
        user_agent: ua,
        resultat: "SUCCESS",
      });
      return res.status(201).json(out);
    } catch (e) {
      await auditService.log({
        id_agent: req.agent._id,
        action: auditService.ACTIONS.INITIATE_REVOKE,
        target_hash: req.body?.hmac_hash,
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

router.post("/revoke/confirm", authenticate, requireRoles("ADMIN"), defaultWriteLimiter, async (req, res) => {
  const ip = req.ip || "";
  const ua = req.get("user-agent") || "";
  try {
    const out = await revocationService.confirmRevoke(req.body, req.agent);
    await auditService.log({
      id_agent: req.agent._id,
      action: auditService.ACTIONS.CONFIRM_REVOKE,
      target_hash: out.hmac_hash,
      ip_address: ip,
      user_agent: ua,
      resultat: "SUCCESS",
    });
    return res.json(out);
  } catch (e) {
    await auditService.log({
      id_agent: req.agent._id,
      action: auditService.ACTIONS.CONFIRM_REVOKE,
      ip_address: ip,
      user_agent: ua,
      resultat: "FAILED",
      details: e.message,
    });
    const code = e.status || 500;
    return res.status(code).json({ error: e.message, details: e.details });
  }
});

router.post("/revoke/reject", authenticate, requireRoles("ADMIN"), defaultWriteLimiter, async (req, res) => {
  const ip = req.ip || "";
  const ua = req.get("user-agent") || "";
  try {
    const out = await revocationService.rejectRevoke(req.body, req.agent);
    await auditService.log({
      id_agent: req.agent._id,
      action: auditService.ACTIONS.REJECT_REVOKE,
      ip_address: ip,
      user_agent: ua,
      resultat: "SUCCESS",
      details: out.id_demande,
    });
    return res.json(out);
  } catch (e) {
    await auditService.log({
      id_agent: req.agent._id,
      action: auditService.ACTIONS.REJECT_REVOKE,
      ip_address: ip,
      user_agent: ua,
      resultat: "FAILED",
      details: e.message,
    });
    const code = e.status || 500;
    return res.status(code).json({ error: e.message });
  }
});

router.patch("/travel-ban", authenticate, requireRoles("ADMIN"), defaultWriteLimiter, async (req, res) => {
  const ip = req.ip || "";
  const ua = req.get("user-agent") || "";
  try {
    const { hmac_hash, interdiction } = req.body;
    const out = await passportService.setTravelBan(hmac_hash, interdiction, req.agent);
    await auditService.log({
      id_agent: req.agent._id,
      action: auditService.ACTIONS.SET_TRAVEL_BAN,
      target_hash: hmac_hash,
      ip_address: ip,
      user_agent: ua,
      resultat: "SUCCESS",
    });
    return res.json(out);
  } catch (e) {
    await auditService.log({
      id_agent: req.agent._id,
      action: auditService.ACTIONS.SET_TRAVEL_BAN,
      ip_address: ip,
      user_agent: ua,
      resultat: "FAILED",
      details: e.message,
    });
    const code = e.status || 500;
    return res.status(code).json({ error: e.message, details: e.details });
  }
});

const RESERVED_HASH_SEGMENTS = new Set(["travel", "foreign-travel", "renew", "create"]);

router.get("/:hash", authenticate, requireRoles("DOUANE", "POLICE"), async (req, res) => {
  const ip = req.ip || "";
  const ua = req.get("user-agent") || "";
  const { hash } = req.params;
  if (RESERVED_HASH_SEGMENTS.has(String(hash).toLowerCase())) {
    return res.status(404).json({ error: "Route non trouvée" });
  }
  try {
    const data = await passportService.getByHashForAgent(hash);
    await auditService.log({
      id_agent: req.agent._id,
      action: auditService.ACTIONS.GET_PASSPORT,
      target_hash: hash,
      ip_address: ip,
      user_agent: ua,
      resultat: "SUCCESS",
    });
    return res.json(data);
  } catch (e) {
    await auditService.log({
      id_agent: req.agent._id,
      action: auditService.ACTIONS.GET_PASSPORT,
      target_hash: hash,
      ip_address: ip,
      user_agent: ua,
      resultat: "FAILED",
      details: e.message,
    });
    const code = e.status || 500;
    return res.status(code).json({ error: e.message, details: e.details });
  }
});

module.exports = router;
