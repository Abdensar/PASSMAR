/**
 * One-time migration: drop unique index on `cin` so multiple passport versions
 * (same citizen, renewed) can coexist. Run after deploying schema change:
 *   node scripts/migratePassportLifecycleIndexes.js
 */
require("dotenv").config();
const mongoose = require("mongoose");
const { connectDb } = require("../config/db");

async function main() {
  await connectDb();
  const coll = mongoose.connection.collection("passeport_offchain");
  const indexes = await coll.indexes();
  for (const idx of indexes) {
    const key = idx.key || {};
    if (key.cin === 1 && idx.unique) {
      await coll.dropIndex(idx.name);
      console.log("Dropped unique index:", idx.name);
    }
  }
  await coll.updateMany(
    { is_current: { $exists: false } },
    { $set: { is_current: true } }
  );
  console.log("Backfilled is_current=true where missing.");
  await mongoose.disconnect();
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
