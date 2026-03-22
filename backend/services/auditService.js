const AuditLog = require("../models/AuditLog");

const ACTIONS = {
  LOGIN: "LOGIN",
  LOGOUT: "LOGOUT",
  REFRESH: "REFRESH",
  CREATE_PASSPORT: "CREATE_PASSPORT",
  VERIFY_PASSPORT: "VERIFY_PASSPORT",
  GET_PASSPORT: "GET_PASSPORT",
  RENEW_PASSPORT: "RENEW_PASSPORT",
  INITIATE_REVOKE: "INITIATE_REVOKE",
  CONFIRM_REVOKE: "CONFIRM_REVOKE",
  REJECT_REVOKE: "REJECT_REVOKE",
  ADD_TRAVEL: "ADD_TRAVEL",
  LIST_TRAVELS: "LIST_TRAVELS",
  FOREIGN_TRAVEL: "FOREIGN_TRAVEL",
  SET_TRAVEL_BAN: "SET_TRAVEL_BAN",
  CREATE_AGENT: "CREATE_AGENT",
  UPDATE_AGENT: "UPDATE_AGENT",
  LIST_AUDIT: "LIST_AUDIT",
  LIST_AGENTS: "LIST_AGENTS",
  LIST_REVOCATIONS: "LIST_REVOCATIONS",
  STATS: "STATS",
};

async function log({
  id_agent = null,
  action,
  target_hash = "",
  ip_address = "",
  user_agent = "",
  resultat,
  details = "",
}) {
  try {
    await AuditLog.create({
      id_agent,
      action,
      target_hash,
      ip_address,
      user_agent,
      resultat,
      details: details ? String(details).slice(0, 2000) : "",
    });
  } catch (e) {
    console.error("audit log failure", e.message);
  }
}

async function list(filters = {}, { limit = 200, skip = 0 } = {}) {
  const q = {};
  if (filters.id_agent) q.id_agent = filters.id_agent;
  if (filters.action) q.action = filters.action;
  if (filters.resultat) q.resultat = filters.resultat;
  if (filters.from || filters.to) {
    q.created_at = {};
    if (filters.from) q.created_at.$gte = new Date(filters.from);
    if (filters.to) q.created_at.$lte = new Date(filters.to);
  }
  const [items, total] = await Promise.all([
    AuditLog.find(q).sort({ created_at: -1 }).skip(skip).limit(Math.min(limit, 500)).lean(),
    AuditLog.countDocuments(q),
  ]);
  return { items, total };
}

module.exports = { log, list, ACTIONS };
