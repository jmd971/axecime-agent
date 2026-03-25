// api/dossiers.js — Liste et création des dossiers
import { kv } from "@vercel/kv";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  // GET — récupérer tous les dossiers
  if (req.method === "GET") {
    try {
      const ids = await kv.lrange("dossiers:ids", 0, -1);
      if (!ids || ids.length === 0) return res.status(200).json([]);
      const dossiers = await Promise.all(
        ids.map(id => kv.get("dossier:" + id))
      );
      return res.status(200).json(dossiers.filter(Boolean).reverse());
    } catch (err) {
      return res.status(500).json({ error: "Erreur lecture : " + err.message });
    }
  }

  // POST — créer un nouveau dossier
  if (req.method === "POST") {
    try {
      const dossier = req.body;
      if (!dossier || !dossier.id) {
        return res.status(400).json({ error: "Données manquantes" });
      }
      await kv.set("dossier:" + dossier.id, dossier);
      await kv.lpush("dossiers:ids", dossier.id);
      return res.status(201).json(dossier);
    } catch (err) {
      return res.status(500).json({ error: "Erreur création : " + err.message });
    }
  }

  return res.status(405).json({ error: "Méthode non autorisée" });
}
