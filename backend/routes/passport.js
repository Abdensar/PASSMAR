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

/** Consulter le passeport complet (off-chain + on-chain + cycle de vie) par numéro + MRZ — même logique métier que par hash. */
router.get("/lookup", authenticate, requireRoles("DOUANE", "POLICE"), verifyLimiter, async (req, res) => {
  const ip = req.ip || "";
  const ua = req.get("user-agent") || "";
  const { num, mrz } = req.query;
  let target = "";
  try {
    const data = await passportService.getPassportByCredentials(num, mrz);
    target = data?.offchain?.hmac_hash || "";
    await auditService.log({
      id_agent: req.agent._id,
      action: auditService.ACTIONS.GET_PASSPORT,
      target_hash: target,
      ip_address: ip,
      user_agent: ua,
      resultat: "SUCCESS",
      details: "lookup",
    });
    return res.json(data);
  } catch (e) {
    await auditService.log({
      id_agent: req.agent._id,
      action: auditService.ACTIONS.GET_PASSPORT,
      target_hash: target,
      ip_address: ip,
      user_agent: ua,
      resultat: "FAILED",
      details: e.message,
    });
    const code = e.status || 500;
    return res.status(code).json({ error: e.message, details: e.details });
  }
});

router.get("/history/cin/:cin", authenticate, requireRoles("DOUANE", "POLICE"), async (req, res) => {
  const ip = req.ip || "";
  const ua = req.get("user-agent") || "";
  try {
    const { cin } = req.params;
    const data = await passportService.getCINHistory(cin);
    await auditService.log({
      id_agent: req.agent._id,
      action: auditService.ACTIONS.GET_PASSPORT,
      ip_address: ip,
      user_agent: ua,
      resultat: "SUCCESS",
      details: `CIN history for ${cin}`,
    });
    return res.json(data);
  } catch (e) {
    await auditService.log({
      id_agent: req.agent._id,
      action: auditService.ACTIONS.GET_PASSPORT,
      ip_address: ip,
      user_agent: ua,
      resultat: "FAILED",
      details: e.message,
    });
    const code = e.status || 500;
    return res.status(code).json({ error: e.message, details: e.details });
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
        target_hash: out.hmac_hash || req.body.hmac_hash || "",
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
      return res.status(code).json({ error: e.message, details: e.details });
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

// ADMIN ENDPOINT: Approve replacement passport after revocation
// Used for FALSIFIE/DECES/JUDICIAIRE cases requiring manual approval
router.post("/revoke/approve-replacement", authenticate, requireRoles("ADMIN"), defaultWriteLimiter, async (req, res) => {
  const ip = req.ip || "";
  const ua = req.get("user-agent") || "";
  try {
    const { id_demande, notes } = req.body;
    
    if (!id_demande) {
      return res.status(400).json({ error: "CHAMPS_REQUIS", details: "id_demande required" });
    }

    const RevocationRequest = require("../models/RevocationRequest");
    const revReq = await RevocationRequest.findById(id_demande);
    
    if (!revReq) {
      return res.status(404).json({ error: "NOT_FOUND", details: "Revocation request not found" });
    }

    if (revReq.statut !== "CONFIRME") {
      return res.status(409).json({ 
        error: "STATUT_INVALIDE", 
        details: "Only CONFIRME revocations can be approved for replacement" 
      });
    }

    if (!["FALSIFIE", "DECES", "JUDICIAIRE"].includes(revReq.raison)) {
      return res.status(409).json({
        error: "RAISON_AUTO_APPROVED",
        details: `Revocation reason ${revReq.raison} is auto-approved. No manual approval needed.`
      });
    }

    // Approve the replacement
    revReq.allow_replacement = true;
    revReq.replacement_approved_at = new Date();
    revReq.replacement_approved_by = req.agent._id;
    revReq.replacement_notes = notes || "";
    await revReq.save();

    await auditService.log({
      id_agent: req.agent._id,
      action: auditService.ACTIONS.CONFIRM_REVOKE, // Reuse action for audit purposes
      target_hash: revReq.hmac_hash,
      ip_address: ip,
      user_agent: ua,
      resultat: "SUCCESS",
      details: `Replacement approved for revocation ${revReq.raison}`,
    });

    return res.json({
      id_demande: revReq._id,
      statut: revReq.statut,
      allow_replacement: true,
      replacement_approved_at: revReq.replacement_approved_at,
      message: "Replacement approved. User can now create new passport with same CIN.",
    });
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

const RESERVED_HASH_SEGMENTS = new Set(["travel", "foreign-travel", "renew", "create", "lookup", "verify"]);

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

// DEBUG ENDPOINT: Check database state for a CIN
router.get("/debug/cin/:cin", authenticate, requireRoles("ADMIN"), async (req, res) => {
  try {
    const PassportOffchain = require("../models/PassportOffchain");
    const RevocationRequest = require("../models/RevocationRequest");
    
    const { cin } = req.params;
    const passports = await PassportOffchain.find({ cin }).lean();
    const revocations = await RevocationRequest.find({
      hmac_hash: { $in: passports.map(p => p.hmac_hash) }
    }).lean();
    
    return res.json({
      cin,
      passports: passports.map(p => ({
        hmac_hash: p.hmac_hash,
        num_passeport: p.num_passeport,
        is_current: p.is_current,
        superseded_by: p.superseded_by,
        supersedes: p.supersedes,
        created_at: p.created_at,
      })),
      revocations: revocations.map(r => ({
        _id: r._id,
        hmac_hash: r.hmac_hash,
        raison: r.raison,
        statut: r.statut,
        date_demande: r.date_demande,
        date_confirmation: r.date_confirmation,
      })),
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

module.exports = router;
