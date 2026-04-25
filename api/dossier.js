// api/dossier.js — Utilise REDIS_URL (Vercel Redis store)
const { createClient } = require("redis");

async function getClient() {
  const client = createClient({ url: process.env.REDIS_URL });
  client.on("error", err => console.error("Redis error:", err));
  await client.connect();
  return client;
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "PATCH, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method === "DELETE") {
    const id = (req.query && req.query.id) || (req.body && req.body.id);
    if (!id) return res.status(400).json({ error: "Paramètre id manquant" });

    let client;
    try {
      client = await getClient();
      const raw = await client.get("dossier:" + id);
      if (!raw) {
        await client.quit();
        return res.status(404).json({ error: "Dossier introuvable" });
      }
      await client.del("dossier:" + id);
      await client.lRem("dossiers:ids", 0, id);
      await client.quit();
      return res.status(200).json({ success: true, id });
    } catch (err) {
      console.error("Erreur dossier DELETE:", err);
      if (client) try { await client.quit(); } catch (e) {}
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method !== "PATCH") {
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  const { id, pieceCode, newStatus } = req.body;
  if (!id || !pieceCode || !newStatus) {
    return res.status(400).json({ error: "Paramètres manquants" });
  }

  let client;
  try {
    client = await getClient();

    const raw = await client.get("dossier:" + id);
    if (!raw) {
      await client.quit();
      return res.status(404).json({ error: "Dossier introuvable" });
    }

    const dossier = JSON.parse(raw);
    const pieces = dossier.pieces.map(p =>
      p.code === pieceCode ? { ...p, status: newStatus } : p
    );
    const allDone = pieces.every(p => p.status === "VALIDE");
    const anyMiss = pieces.some(p => p.status === "MANQUANT");
    const statut = allDone ? "COMPLET" : anyMiss ? "INCOMPLET" : "EN_COURS";

    const updated = { ...dossier, pieces, statut };
    await client.set("dossier:" + id, JSON.stringify(updated));
    await client.quit();

    return res.status(200).json(updated);

  } catch (err) {
    console.error("Erreur dossier PATCH:", err);
    if (client) try { await client.quit(); } catch(e) {}
    return res.status(500).json({ error: err.message });
  }
};
