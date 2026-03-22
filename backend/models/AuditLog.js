const mongoose = require("mongoose");
const { randomUUID } = require("crypto");

const auditLogSchema = new mongoose.Schema(
  {
    _id: { type: String, default: () => randomUUID() },
    id_agent: { type: String, ref: "Agent", default: null },
    action: { type: String, required: true },
    target_hash: { type: String, default: "" },
    ip_address: { type: String, default: "" },
    user_agent: { type: String, default: "" },
    resultat: { type: String, enum: ["SUCCESS", "FAILED"], required: true },
    details: { type: String, default: "" },
    created_at: { type: Date, default: Date.now },
  },
  { _id: false, collection: "audit_log" }
);

module.exports = mongoose.model("AuditLog", auditLogSchema);
