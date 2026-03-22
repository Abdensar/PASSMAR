require("./dnsBootstrap");
const mongoose = require("mongoose");

async function connectDb() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI manquant dans .env");
  }
  mongoose.set("strictQuery", true);
  await mongoose.connect(uri);
  const c = mongoose.connection;
  const host = c.host || "(SRV)";
  const dbName = c.name || "?";
  console.log(`MongoDB: connecté — ${host} / base « ${dbName} »`);
}

module.exports = { connectDb };
