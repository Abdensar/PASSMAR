const mongoose = require("mongoose");

const passportOffchainSchema = new mongoose.Schema(
  {
    hmac_hash: { type: String, required: true, unique: true },
    nom: { type: String, required: true },
    prenom: { type: String, required: true },
    num_passeport: { type: String, required: true, trim: true, uppercase: true },
    mrz: { type: String, required: true },
    date_naissance: { type: Date, required: true },
    lieu_naissance: { type: String, required: true },
    /** Same CIN across renewed versions — uniqueness enforced in createPassport for current only. */
    cin: { type: String, required: true },
    photo_url: { type: String, default: "" },
    biometrie: { type: String, default: "" },
    adresse: { type: String, default: "" },
    nationalite: { type: String, default: "Marocaine" },
    id_agent_createur: { type: String, ref: "Agent", required: true },
    tx_hash_creation: { type: String, default: "" },
    created_at: { type: Date, default: Date.now },
    /** Current off-chain row for this passport hash; false after renewal supersedes this row. */
    is_current: { type: Boolean, default: true },
    /** If renewed, HMAC of the replacement passport (off-chain + on-chain). */
    superseded_by: { type: String, default: null },
    /** If this row is the replacement, HMAC of the previous passport. */
    supersedes: { type: String, default: null },
  },
  { collection: "passeport_offchain" }
);

passportOffchainSchema.index(
  { num_passeport: 1 },
  { unique: true }
);

module.exports = mongoose.model("PassportOffchain", passportOffchainSchema);
