/**
 * À charger avant toute connexion MongoDB (SRV Atlas).
 * Corrige les échecs de résolution DNS côté Node sur certains réseaux Windows.
 */
const dns = require("dns");
const servers = process.env.DNS_SERVERS
  ? process.env.DNS_SERVERS.split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  : ["8.8.8.8", "8.8.4.4"];
dns.setServers(servers);

module.exports = { servers };
