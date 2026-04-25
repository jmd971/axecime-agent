// api/admin/reset-demo.js — Supprime les faux dossiers de démo (Bug #3)
const { createClient } = require("redis");

const DEMO_NAMES = [
  { prenom: "Jean", nom: "Dupont" },
  { prenom: "Nadège", nom: "Martin" },
  { prenom: "Christophe", nom: "Beaumont" },
];

async function getClient() {
  const client = createClient({ url: process.env.REDIS_URL });
  client.on("error", err => console.error("Redis error:", err));
  await client.connect();
  return client;
}

function isDemo(d) {
  if (!d) return false;
  return DEMO_NAMES.some(n =>
    (d.prenom || "").trim().toLowerCase() === n.prenom.toLowerCase() &&
    (d.nom || "").trim().toLowerCase() === n.nom.toLowerCase()
  );
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Méthode non autorisée" });

  let client;
  try {
    client = await getClient();
    const ids = await client.lRange("dossiers:ids", 0, -1);
    const removed = [];

    for (const id of ids || []) {
      const raw = await client.get("dossier:" + id);
      const d = raw ? JSON.parse(raw) : null;
      if (isDemo(d)) {
        await client.del("dossier:" + id);
        await client.lRem("dossiers:ids", 0, id);
        removed.push({ id, prenom: d.prenom, nom: d.nom });
      }
    }

    await client.quit();
    return res.status(200).json({ success: true, removed, count: removed.length });
  } catch (err) {
    console.error("Erreur reset-demo:", err);
    if (client) try { await client.quit(); } catch (e) {}
    return res.status(500).json({ error: err.message });
  }
};
