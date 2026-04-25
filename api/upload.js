// api/upload.js — Upload vers Vercel Blob + mise à jour du dossier en Redis
// Remplace l'ancien connecteur SharePoint (mono-tenant, in-app storage)

const { put } = require("@vercel/blob");
const { createClient } = require("redis");

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
    .trim()
    .replace(/\s+/g, "_");
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Méthode non autorisée" });

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return res.status(500).json({ error: "BLOB_READ_WRITE_TOKEN non configuré sur Vercel" });
  }

  let client;
  try {
    const { dossierId, pieceCode, fileName, fileBase64, mimeType } = req.body;
    if (!dossierId || !fileName || !fileBase64) {
      return res.status(400).json({ error: "Paramètres manquants : dossierId, fileName, fileBase64 requis" });
    }

    const ext = fileName.split(".").pop().toLowerCase();
    const safeFileName = (pieceCode ? pieceCode + "_" : "") +
      slugify(fileName.replace(/\.[^.]+$/, "")) + "." + ext;
    const blobPath = "dossiers/" + dossierId + "/" + Date.now() + "_" + safeFileName;

    const fileBuffer = Buffer.from(fileBase64, "base64");

    // Upload Vercel Blob
    const blob = await put(blobPath, fileBuffer, {
      access: "public",
      contentType: mimeType || "application/octet-stream",
      addRandomSuffix: true,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });

    // Mise à jour du dossier en Redis : statut RECU + métadonnées fichier
    client = await getClient();
    const raw = await client.get("dossier:" + dossierId);
    if (!raw) {
      await client.quit();
      return res.status(404).json({ error: "Dossier introuvable" });
    }
    const dossier = JSON.parse(raw);
    const now = new Date().toISOString();
    const fileMeta = {
      url: blob.url,
      pathname: blob.pathname,
      name: fileName,
      size: fileBuffer.length,
      mimeType: mimeType || "application/octet-stream",
      uploadedAt: now,
    };

    const pieces = dossier.pieces.map(p =>
      p.code === pieceCode ? { ...p, status: "RECU", file: fileMeta } : p
    );
    const allDone = pieces.every(p => p.status === "VALIDE");
    const anyMiss = pieces.some(p => p.status === "MANQUANT");
    const statut = allDone ? "COMPLET" : anyMiss ? "INCOMPLET" : "EN_COURS";

    const updated = { ...dossier, pieces, statut, updated_at: now };
    await client.set("dossier:" + dossierId, JSON.stringify(updated));
    await client.quit();

    return res.status(200).json({
      success: true,
      url: blob.url,
      pathname: blob.pathname,
      fileName,
      size: fileBuffer.length,
      message: "Fichier enregistré (rétention 30 jours)",
    });

  } catch (err) {
    console.error("Erreur upload:", err);
    if (client) try { await client.quit(); } catch (e) {}
    return res.status(500).json({ error: err.message });
  }
};

module.exports.config = {
  api: { bodyParser: { sizeLimit: "20mb" } },
};
