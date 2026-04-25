// api/cron/purge-expired.js — Supprime les fichiers > 30 jours
// Déclenché par Vercel Cron (vercel.json) ou manuellement (header Authorization)

const { del } = require("@vercel/blob");
const { createClient } = require("redis");

const RETENTION_DAYS = 30;

async function getClient() {
  const client = createClient({ url: process.env.REDIS_URL });
  client.on("error", err => console.error("Redis error:", err));
  await client.connect();
  return client;
}

module.exports = async function handler(req, res) {
  // Auth cron : Vercel envoie automatiquement Authorization: Bearer <CRON_SECRET>
  const auth = req.headers && req.headers.authorization;
  const expected = "Bearer " + (process.env.CRON_SECRET || "");
  if (process.env.CRON_SECRET && auth !== expected) {
    return res.status(401).json({ error: "Non autorisé" });
  }

  let client;
  try {
    client = await getClient();
    const ids = (await client.lRange("dossiers:ids", 0, -1)) || [];
    const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
    const purged = [];

    for (const id of ids) {
      const raw = await client.get("dossier:" + id);
      if (!raw) continue;
      const dossier = JSON.parse(raw);
      let changed = false;

      const newPieces = await Promise.all((dossier.pieces || []).map(async p => {
        if (!p.file || !p.file.uploadedAt) return p;
        const uploadedTs = new Date(p.file.uploadedAt).getTime();
        if (uploadedTs >= cutoff) return p;

        try {
          await del(p.file.url, { token: process.env.BLOB_READ_WRITE_TOKEN });
        } catch (e) {
          console.error("Erreur del blob", p.file.url, e.message);
        }
        purged.push({ dossierId: id, pieceCode: p.code, url: p.file.url });
        changed = true;
        return { ...p, status: "MANQUANT", file: null };
      }));

      if (changed) {
        const allDone = newPieces.every(x => x.status === "VALIDE");
        const anyMiss = newPieces.some(x => x.status === "MANQUANT");
        const statut = allDone ? "COMPLET" : anyMiss ? "INCOMPLET" : "EN_COURS";
        await client.set("dossier:" + id, JSON.stringify({ ...dossier, pieces: newPieces, statut }));
      }
    }

    await client.quit();
    return res.status(200).json({ success: true, purgedCount: purged.length, retentionDays: RETENTION_DAYS });
  } catch (err) {
    console.error("Erreur purge:", err);
    if (client) try { await client.quit(); } catch (e) {}
    return res.status(500).json({ error: err.message });
  }
};
