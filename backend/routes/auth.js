const express = require("express");
const Agent = require("../models/Agent");
const authService = require("../services/authService");
const auditService = require("../services/auditService");
const { loginLimiter } = require("../middleware/rateLimiter");
const { authenticate } = require("../middleware/authCookie");

const router = express.Router();

const COOKIE_BASE = {
  httpOnly: true,
  secure: process.env.COOKIE_SECURE === "true",
  sameSite: "lax",
  path: "/",
};

function durationToMs(value) {
  const match = /^(\d+)(s|m|h|d)?$/.exec(String(value).trim());
  if (!match) throw new Error("Invalid duration: " + value);
  const amount = Number(match[1]);
  const unit = match[2] || "s";
  switch (unit) {
    case "s": return amount * 1000;
    case "m": return amount * 60 * 1000;
    case "h": return amount * 60 * 60 * 1000;
    case "d": return amount * 24 * 60 * 60 * 1000;
    default: throw new Error("Unsupported duration unit: " + unit);
  }
}

router.post("/login", loginLimiter, async (req, res) => {
  const ip = req.ip || req.socket.remoteAddress || "";
  const ua = req.get("user-agent") || "";
  const { identifiant, password, totp } = req.body || {};

  if (!identifiant || !password) {
    await auditService.log({
      id_agent: null,
      action: auditService.ACTIONS.LOGIN,
      ip_address: ip,
      user_agent: ua,
      resultat: "FAILED",
      details: "identifiant ou mot de passe manquant",
    });
    return res.status(400).json({ error: "identifiant et mot de passe requis" });
  }

  try {
    const agent = await Agent.findOne({ identifiant: String(identifiant).trim() }).select(
      "+pwd_hash +totp_secret"
    );
    if (!agent || !agent.is_active) {
      await auditService.log({
        id_agent: null,
        action: auditService.ACTIONS.LOGIN,
        ip_address: ip,
        user_agent: ua,
        resultat: "FAILED",
        details: "identifiant inconnu ou compte désactivé",
      });
      return res.status(401).json({ error: "Identifiants invalides" });
    }

    const ok = await authService.comparePassword(password, agent.pwd_hash);
    if (!ok) {
      await auditService.log({
        id_agent: agent._id,
        action: auditService.ACTIONS.LOGIN,
        ip_address: ip,
        user_agent: ua,
        resultat: "FAILED",
        details: "mot de passe incorrect",
      });
      return res.status(401).json({ error: "Identifiants invalides" });
    }

    if (agent.role === "ADMIN" && agent.totp_enabled) {
      if (!totp || !authService.verifyTotp(agent.totp_secret, totp)) {
        await auditService.log({
          id_agent: agent._id,
          action: auditService.ACTIONS.LOGIN,
          ip_address: ip,
          user_agent: ua,
          resultat: "FAILED",
          details: "2FA invalide ou manquant",
        });
        return res.status(401).json({ error: "Code 2FA requis ou invalide (obligatoire pour ADMIN)" });
      }
    }

    const access = authService.signAccessToken(agent);
    const refresh = authService.signRefreshToken(agent);

    const accessMaxAge = durationToMs(authService.JWT_EXPIRY);
    const refreshMaxAge = durationToMs(authService.REFRESH_EXPIRY);

    res.cookie("access_token", access, { ...COOKIE_BASE, maxAge: accessMaxAge });
    res.cookie("refresh_token", refresh, { ...COOKIE_BASE, maxAge: refreshMaxAge });

    agent.last_login = new Date();
    await agent.save();

    await auditService.log({
      id_agent: agent._id,
      action: auditService.ACTIONS.LOGIN,
      ip_address: ip,
      user_agent: ua,
      resultat: "SUCCESS",
    });

    const safe = agent.toObject();
    delete safe.pwd_hash;
    delete safe.totp_secret;

    return res.json({
      agent: safe,
      expires_in: authService.JWT_EXPIRY,
    });
  } catch (e) {
    await auditService.log({
      id_agent: null,
      action: auditService.ACTIONS.LOGIN,
      ip_address: ip,
      user_agent: ua,
      resultat: "FAILED",
      details: e.message,
    });
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

router.post("/logout", async (req, res) => {
  const ip = req.ip || "";
  const ua = req.get("user-agent") || "";
  let id = null;
  try {
    const t = req.cookies?.access_token;
    if (t) {
      const p = authService.verifyAccessToken(t);
      id = p.sub;
    }
  } catch {
    /* ignore */
  }
  res.clearCookie("access_token", { ...COOKIE_BASE });
  res.clearCookie("refresh_token", { ...COOKIE_BASE });
  await auditService.log({
    id_agent: id,
    action: auditService.ACTIONS.LOGOUT,
    ip_address: ip,
    user_agent: ua,
    resultat: "SUCCESS",
  });
  return res.json({ ok: true });
});

router.get("/me", authenticate, async (req, res) => {
  const a = req.agent.toObject ? req.agent.toObject() : req.agent;
  delete a.pwd_hash;
  delete a.totp_secret;
  return res.json({ agent: a });
});

router.post("/refresh", async (req, res) => {
  const ip = req.ip || "";
  const ua = req.get("user-agent") || "";
  const rt = req.cookies?.refresh_token;
  if (!rt) {
    return res.status(401).json({ error: "Refresh token manquant" });
  }
  try {
    const payload = authService.verifyRefreshToken(rt);
    const agent = await Agent.findById(payload.sub).select("-pwd_hash");
    if (!agent || !agent.is_active) {
      return res.status(401).json({ error: "Agent invalide" });
    }
    const access = authService.signAccessToken(agent);
    res.cookie("access_token", access, { ...COOKIE_BASE, maxAge: 8 * 60 * 60 * 1000 });
    await auditService.log({
      id_agent: agent._id,
      action: auditService.ACTIONS.REFRESH,
      ip_address: ip,
      user_agent: ua,
      resultat: "SUCCESS",
    });
    return res.json({ ok: true, expires_in: authService.JWT_EXPIRY });
  } catch (e) {
    await auditService.log({
      id_agent: null,
      action: auditService.ACTIONS.REFRESH,
      ip_address: ip,
      user_agent: ua,
      resultat: "FAILED",
      details: e.message,
    });
    return res.status(401).json({ error: "Refresh token invalide ou expiré" });
  }
});

module.exports = router;
