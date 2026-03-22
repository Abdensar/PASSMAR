const mongoose = require("mongoose");
const { randomUUID } = require("crypto");

const autoriteSchema = new mongoose.Schema(
  {
    _id: { type: String, default: () => randomUUID() },
    nom_autorite: { type: String, required: true },
    type_autorite: {
      type: String,
      enum: ["DOUANE", "POLICE", "ADMIN"],
      required: true,
    },
    adresse_ip: { type: String, default: "" },
    created_at: { type: Date, default: Date.now },
  },
  { _id: false }
);

module.exports = mongoose.model("Autorite", autoriteSchema);
