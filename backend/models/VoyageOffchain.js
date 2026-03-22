const mongoose = require("mongoose");

const voyageOffchainSchema = new mongoose.Schema(
  {
    tx_hash: { type: String, required: true, unique: true },
    hmac_hash: { type: String, ref: "PassportOffchain", required: true },
    id_agent: { type: String, ref: "Agent", required: true },
    type_mvt: { type: String, enum: ["ENT", "SOR"], required: true },
    checkpoint: { type: String, required: true },
    details: { type: String, default: "" },
    destination: { type: String, default: "" },
    provenance: { type: String, default: "" },
    created_at: { type: Date, default: Date.now },
  },
  { collection: "voyage_offchain" }
);

module.exports = mongoose.model("VoyageOffchain", voyageOffchainSchema);
