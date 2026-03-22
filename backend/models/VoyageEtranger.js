const mongoose = require("mongoose");
const { randomUUID } = require("crypto");

const voyageEtrangerSchema = new mongoose.Schema(
  {
    _id: { type: String, default: () => randomUUID() },
    id_agent: { type: String, ref: "Agent", required: true },
    nationalite: { type: String, required: true },
    num_passeport_etr: { type: String, required: true },
    type_mvt: { type: String, enum: ["ENT", "SOR"], required: true },
    checkpoint: { type: String, required: true },
    date_passage: { type: Date, required: true },
    details: { type: String, default: "" },
    created_at: { type: Date, default: Date.now },
  },
  { _id: false, collection: "voyage_etranger" }
);

module.exports = mongoose.model("VoyageEtranger", voyageEtrangerSchema);
