// api/dossier.js — Mise à jour d'un dossier (statut pièce)
import { kv } from "@vercel/kv";

export default async function handler(req, res) {
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
    const dossier = await kv.get("dossier:" + id);
    if (!dossier) return res.status(404).json({ error: "Dossier introuvable" });

    // Mettre à jour le statut de la pièce
    const pieces = dossier.pieces.map(p =>
      p.code === pieceCode ? { ...p, status: newStatus } : p
    );

    // Recalculer le statut global du dossier
    const allDone = pieces.every(p => p.status === "VALIDE");
    const anyMiss = pieces.some(p => p.status === "MANQUANT");
    const statut = allDone ? "COMPLET" : anyMiss ? "INCOMPLET" : "EN_COURS";

    const updated = { ...dossier, pieces, statut };
    await kv.set("dossier:" + id, updated);

    return res.status(200).json(updated);
  } catch (err) {
    return res.status(500).json({ error: "Erreur mise à jour : " + err.message });
  }
}
