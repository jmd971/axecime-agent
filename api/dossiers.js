// api/dossiers.js — Utilise REDIS_URL (Vercel Redis store)
const { createClient } = require("redis");

async function getClient() {
  const client = createClient({ url: process.env.REDIS_URL });
  client.on("error", err => console.error("Redis error:", err));
  await client.connect();
  return client;
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  let client;
  try {
    client = await getClient();

    if (req.method === "GET") {
      const ids = await client.lRange("dossiers:ids", 0, -1);
      if (!ids || ids.length === 0) {
        await client.quit();
        return res.status(200).json([]);
      }
      const dossiers = await Promise.all(
        ids.map(async id => {
          const raw = await client.get("dossier:" + id);
          return raw ? JSON.parse(raw) : null;
        })
      );
      await client.quit();
      return res.status(200).json(dossiers.filter(Boolean).reverse());
    }

    if (req.method === "POST") {
      const dossier = req.body;
      if (!dossier || !dossier.id) {
        await client.quit();
        return res.status(400).json({ error: "Données manquantes" });
      }
      await client.set("dossier:" + dossier.id, JSON.stringify(dossier));
      await client.lPush("dossiers:ids", dossier.id);
      await client.quit();
      return res.status(201).json(dossier);
    }

    await client.quit();
    return res.status(405).json({ error: "Méthode non autorisée" });

  } catch (err) {
    console.error("Erreur dossiers:", err);
    if (client) try { await client.quit(); } catch(e) {}
    return res.status(500).json({ error: err.message });
  }
};
