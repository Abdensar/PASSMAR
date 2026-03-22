const mongoose = require("mongoose");

const passportOffchainSchema = new mongoose.Schema(
  {
    hmac_hash: { type: String, required: true, unique: true },
    nom: { type: String, required: true },
    prenom: { type: String, required: true },
    date_naissance: { type: Date, required: true },
    lieu_naissance: { type: String, required: true },
    cin: { type: String, required: true, unique: true },
    photo_url: { type: String, default: "" },
    biometrie: { type: String, default: "" },
    adresse: { type: String, default: "" },
    nationalite: { type: String, default: "Marocaine" },
    id_agent_createur: { type: String, ref: "Agent", required: true },
    tx_hash_creation: { type: String, default: "" },
    created_at: { type: Date, default: Date.now },
  },
  { collection: "passeport_offchain" }
);

module.exports = mongoose.model("PassportOffchain", passportOffchainSchema);
