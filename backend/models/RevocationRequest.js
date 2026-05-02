const mongoose = require("mongoose");
const { randomUUID } = require("crypto");

const revocationRequestSchema = new mongoose.Schema(
  {
    _id: { type: String, default: () => randomUUID() },
    hmac_hash: { type: String, required: true },
    id_agent_initiator: { type: String, ref: "Agent", required: true },
    id_agent_confirm: { type: String, ref: "Agent", default: null },
    raison: {
      type: String,
      enum: ["VOLE", "PERDU", "FALSIFIE", "DECES", "JUDICIAIRE", "MODIFICATION_INFO"],
      required: true,
    },
    statut: {
      type: String,
      enum: ["EN_ATTENTE", "CONFIRME", "REJETE"],
      default: "EN_ATTENTE",
    },
    date_demande: { type: Date, default: Date.now },
    date_confirmation: { type: Date, default: null },
    notes: { type: String, default: "" },
    tx_hash_revocation: { type: String, default: "" },
    // For post-revocation replacement tracking (FALSIFIE/DECES/JUDICIAIRE cases)
    allow_replacement: { type: Boolean, default: false },
    replacement_approved_at: { type: Date, default: null },
    replacement_approved_by: { type: String, ref: "Agent", default: null },
    replacement_notes: { type: String, default: "" },
  },
  { _id: false, collection: "revocation_request" }
);

module.exports = mongoose.model("RevocationRequest", revocationRequestSchema);
