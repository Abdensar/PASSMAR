const mongoose = require("mongoose");
const { randomUUID } = require("crypto");

const agentSchema = new mongoose.Schema(
  {
    _id: { type: String, default: () => randomUUID() },
    id_autorite: { type: String, ref: "Autorite", required: true },
    identifiant: { type: String, required: true, unique: true, trim: true },
    pwd_hash: { type: String, required: true },
    role: {
      type: String,
      enum: ["DOUANE", "POLICE", "ADMIN"],
      required: true,
    },
    eth_address: { type: String, required: true, unique: true, lowercase: true },
    is_active: { type: Boolean, default: true },
    totp_secret: { type: String, default: null, select: false },
    totp_enabled: { type: Boolean, default: false },
    created_at: { type: Date, default: Date.now },
    last_login: { type: Date, default: null },
  },
  { _id: false }
);

module.exports = mongoose.model("Agent", agentSchema);
