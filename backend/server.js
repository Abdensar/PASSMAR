require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const { connectDb } = require("./config/db");
const blockchainService = require("./services/blockchainService");

const authRoutes = require("./routes/auth");
const passportRoutes = require("./routes/passport");
const travelRoutes = require("./routes/travel");
const revocationRoutes = require("./routes/revocation");
const adminRoutes = require("./routes/admin");

const app = express();
const PORT = process.env.PORT || 5000;

app.set("trust proxy", 1);

app.use(
  cors({
    origin: process.env.FRONTEND_ORIGIN || "http://localhost:3000",
    credentials: true,
  })
);
app.use(express.json({ limit: "2mb" }));
app.use(cookieParser());

app.get("/health", (req, res) => {
  res.json({ ok: true, service: "passmar-api" });
});

app.use("/auth", authRoutes);
app.use("/passport", travelRoutes);
app.use("/passport", passportRoutes);
app.use("/revocation", revocationRoutes);
app.use("/admin", adminRoutes);

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Erreur interne" });
});

async function start() {
  await connectDb();
  try {
    blockchainService.connect();
    console.log("Blockchain: connecté (ethers)");
  } catch (e) {
    console.warn("Blockchain: connexion impossible —", e.message);
  }
  app.listen(PORT, () => {
    console.log(`API sur le port ${PORT}`);
  });
}

start().catch((e) => {
  console.error(e);
  process.exit(1);
});
