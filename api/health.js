// api/health.js — Diagnostic : variables d'environnement + ping Redis + ping Blob
const { createClient } = require("redis");

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "no-store");

  const env = {
    REDIS_URL: !!process.env.REDIS_URL,
    KV_URL: !!process.env.KV_URL,
    ANTHROPIC_KEY: !!process.env.ANTHROPIC_KEY,
    BLOB_READ_WRITE_TOKEN: !!process.env.BLOB_READ_WRITE_TOKEN,
    CRON_SECRET: !!process.env.CRON_SECRET,
    NODE_VERSION: process.version,
  };

  const result = { ok: true, env, redis: null, blob: null, ts: new Date().toISOString() };

  // Ping Redis
  const redisUrl = process.env.REDIS_URL || process.env.KV_URL;
  if (!redisUrl) {
    result.redis = { status: "ERROR", message: "Aucune variable REDIS_URL ou KV_URL configurée" };
    result.ok = false;
  } else {
    let client;
    const t0 = Date.now();
    try {
      client = createClient({ url: redisUrl, socket: { connectTimeout: 5000 } });
      client.on("error", () => {});
      await client.connect();
      const pong = await client.ping();
      const count = await client.lLen("dossiers:ids");
      await client.quit();
      result.redis = { status: "OK", pong, dossiersCount: count, latencyMs: Date.now() - t0 };
    } catch (err) {
      if (client) try { await client.quit(); } catch (e) {}
      result.redis = { status: "ERROR", message: err.message, latencyMs: Date.now() - t0 };
      result.ok = false;
    }
  }

  // Ping Blob (juste vérifier que le token est présent — pas d'appel API pour rester rapide)
  result.blob = process.env.BLOB_READ_WRITE_TOKEN
    ? { status: "OK", message: "Token présent" }
    : { status: "WARN", message: "BLOB_READ_WRITE_TOKEN absent — uploads désactivés" };

  return res.status(result.ok ? 200 : 500).json(result);
};
