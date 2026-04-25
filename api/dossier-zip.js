// api/dossier-zip.js — Génère un ZIP de toutes les pièces reçues d'un dossier
const { createClient } = require("redis");
const JSZip = require("jszip");

async function getClient() {
  const client = createClient({ url: process.env.REDIS_URL });
  client.on("error", err => console.error("Redis error:", err));
  await client.connect();
  return client;
}

function slugify(str) {
  return (str || "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9\s_-]/g, "")
    .trim().replace(/\s+/g, "_");
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Méthode non autorisée" });

  const id = req.query && req.query.id;
  if (!id) return res.status(400).json({ error: "Paramètre id manquant" });

  let client;
  try {
    client = await getClient();
    const raw = await client.get("dossier:" + id);
    await client.quit();
    if (!raw) return res.status(404).json({ error: "Dossier introuvable" });

    const dossier = JSON.parse(raw);
    const piecesWithFile = (dossier.pieces || []).filter(p => p.file && p.file.url);
    if (piecesWithFile.length === 0) {
      return res.status(404).json({ error: "Aucune pièce reçue pour ce dossier" });
    }

    const zip = new JSZip();
    const folder = zip.folder(
      slugify(dossier.nom) + "_" + slugify(dossier.prenom) + "_" + slugify(dossier.type)
    );

    // Téléchargement parallèle des fichiers depuis Vercel Blob
    await Promise.all(piecesWithFile.map(async p => {
      try {
        const r = await fetch(p.file.url);
        if (!r.ok) throw new Error("HTTP " + r.status);
        const buf = Buffer.from(await r.arrayBuffer());
        const ext = (p.file.name || "").split(".").pop() || "bin";
        const safe = p.code + "_" + slugify((p.file.name || "fichier").replace(/\.[^.]+$/, "")) + "." + ext;
        folder.file(safe, buf);
      } catch (e) {
        console.error("Erreur lecture blob", p.file.url, e.message);
      }
    }));

    const zipBuffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });

    const fileName = "Dossier_" + slugify(dossier.nom) + "_" + slugify(dossier.prenom) + ".zip";
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", 'attachment; filename="' + fileName + '"');
    return res.status(200).send(zipBuffer);

  } catch (err) {
    console.error("Erreur ZIP:", err);
    if (client) try { await client.quit(); } catch (e) {}
    return res.status(500).json({ error: err.message });
  }
};
