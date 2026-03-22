const mongoose = require("mongoose");
const { randomUUID } = require("crypto");

const renouvellementSchema = new mongoose.Schema(
  {
    _id: { type: String, default: () => randomUUID() },
    hash_precedent: { type: String, required: true },
    hash_nouveau: { type: String, required: true },
    id_agent: { type: String, ref: "Agent", required: true },
    date_renouv: { type: Date, default: Date.now },
    motif: {
      type: String,
      enum: ["EXPIRATION", "PERTE", "DETERIORATION"],
      required: true,
    },
    tx_hash: { type: String, default: "" },
  },
  { _id: false, collection: "renouvellement" }
);

module.exports = mongoose.model("Renouvellement", renouvellementSchema);
