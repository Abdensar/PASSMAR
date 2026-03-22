require("dotenv").config();
require("./config/dnsBootstrap");
const mongoose = require("mongoose");

console.log('Testing connection to:', process.env.MONGODB_URI);

mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ MongoDB Atlas connecté avec succès');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Erreur:', err.message);
    process.exit(1);
  });