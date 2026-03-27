// api/dossier.js — CommonJS pour compatibilité Vercel + create-react-app
const { kv } = require("@vercel/kv");

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "PATCH, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method !== "PATCH") {
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  const { id, pieceCode, newStatus } = req.body;
  if (!id || !pieceCode || !newStatus) {
    return res.status(400).json({ error: "Paramètres manquants" });
  }

  try {
    // Récupérer le dossier (stocké en JSON string)
    const raw = await kv.get("dossier:" + id);
    if (!raw) return res.status(404).json({ error: "Dossier introuvable" });

    const dossier = typeof raw === "string" ? JSON.parse(raw) : raw;

    // Mettre à jour la pièce
    const pieces = dossier.pieces.map(p =>
      p.code === pieceCode ? { ...p, status: newStatus } : p
    );

    // Recalculer le statut global
    const allDone = pieces.every(p => p.status === "VALIDE");
    const anyMiss = pieces.some(p => p.status === "MANQUANT");
    const statut = allDone ? "COMPLET" : anyMiss ? "INCOMPLET" : "EN_COURS";

    const updated = { ...dossier, pieces, statut };
    await kv.set("dossier:" + id, JSON.stringify(updated));

    return res.status(200).json(updated);
  } catch (err) {
    console.error("Erreur PATCH dossier:", err);
    return res.status(500).json({ error: "Erreur mise à jour : " + err.message });
  }
};
