
Copier

import { useState, useEffect, useRef, useCallback } from "react";
 
// ── BRAND ──────────────────────────────────────────────────────────────────
const B = {
  blue: "#003B8E", orange: "#E8550A", dark: "#0A0F1E",
  surface: "#111827", card: "#1A2235", border: "#1E2D45",
  text: "#E2E8F0", muted: "#64748B",
};
 
// ── DOSSIER TYPES ──────────────────────────────────────────────────────────
const DOSSIER_TYPES = {
  PRET_IMMO: {
    label: "Prêt Immobilier", icon: "🏠", pieces: [
      { code: "CNI", label: "Carte d'identité (recto-verso)", type: "IDENTITE" },
      { code: "JUSTIF_DOM", label: "Justificatif de domicile < 3 mois", type: "DOMICILE" },
      { code: "BULL_SAL_1", label: "Bulletin de salaire M-1", type: "REVENUS" },
      { code: "BULL_SAL_2", label: "Bulletin de salaire M-2", type: "REVENUS" },
      { code: "BULL_SAL_3", label: "Bulletin de salaire M-3", type: "REVENUS" },
      { code: "AVIS_IMPOS", label: "Avis d'imposition N-1", type: "REVENUS" },
      { code: "RELEVE_BANCAIRE", label: "3 derniers relevés bancaires", type: "REVENUS" },
      { code: "COMPROMIS", label: "Compromis de vente signé", type: "BIEN" },
    ]
  },
  ASSUR_PRET: {
    label: "Assurance de Prêt", icon: "🛡️", pieces: [
      { code: "CNI", label: "Carte d'identité", type: "IDENTITE" },
      { code: "QUESTIONNAIRE_SANTE", label: "Questionnaire de santé complété", type: "SANTE" },
      { code: "OFFRE_PRET", label: "Offre de prêt bancaire", type: "FINANCEMENT" },
      { code: "TABLEAU_AMORT", label: "Tableau d'amortissement", type: "FINANCEMENT" },
      { code: "CERTIFICAT_EMPLOI", label: "Certificat d'emploi", type: "REVENUS" },
    ]
  },
  DEFISC: {
    label: "Défiscalisation Pinel OM", icon: "📊", pieces: [
      { code: "CNI", label: "Carte d'identité", type: "IDENTITE" },
      { code: "AVIS_IMPOS", label: "Avis d'imposition 2 dernières années", type: "REVENUS" },
      { code: "ACTE_VENTE", label: "Acte de vente ou VEFA signé", type: "BIEN" },
      { code: "PLAN_FINANCEMENT", label: "Plan de financement détaillé", type: "FINANCEMENT" },
      { code: "RIB", label: "Relevé d'Identité Bancaire", type: "FINANCEMENT" },
    ]
  },
  RACHAT_CREDIT: {
    label: "Rachat de Crédit", icon: "🔄", pieces: [
      { code: "CNI", label: "Carte d'identité", type: "IDENTITE" },
      { code: "JUSTIF_DOM", label: "Justificatif de domicile", type: "DOMICILE" },
      { code: "TABLEAUX_AMORT", label: "Tableaux d'amortissement en cours", type: "FINANCEMENT" },
      { code: "BULL_SAL_1", label: "Bulletin de salaire M-1", type: "REVENUS" },
      { code: "BULL_SAL_2", label: "Bulletin de salaire M-2", type: "REVENUS" },
      { code: "AVIS_IMPOS", label: "Avis d'imposition N-1", type: "REVENUS" },
      { code: "RELEVE_BANCAIRE", label: "3 derniers relevés bancaires", type: "REVENUS" },
    ]
  },
};
 
// ── TOKEN SYSTEM ───────────────────────────────────────────────────────────
// Encode dossier info into a URL-safe base64 token
function generateToken(dossier) {
  const payload = {
    id: dossier.id,
    prenom: dossier.prenom,
    nom: dossier.nom,
    type: dossier.type,
    exp: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 jours
  };
  return btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
}
 
function decodeToken(token) {
  try {
    const payload = JSON.parse(decodeURIComponent(escape(atob(token))));
    if (payload.exp < Date.now()) return null; // expiré
    return payload;
  } catch {
    return null;
  }
}
 
function getClientUrl(token) {
  return `${window.location.origin}/#/client/${token}`;
}
 
// ── ROUTING (hash-based, no dependency needed) ─────────────────────────────
function useHashRoute() {
  const [route, setRoute] = useState(window.location.hash || "#/");
  useEffect(() => {
    const handler = () => setRoute(window.location.hash || "#/");
    window.addEventListener("hashchange", handler);
    return () => window.removeEventListener("hashchange", handler);
  }, []);
  return route;
}
 
// ── SYSTEM PROMPT ──────────────────────────────────────────────────────────
const SYSTEM_PROMPT = (dossierType, prenom, pieces) =>
  `Tu es l'assistant IA d'AXECIME, cabinet de courtage indépendant basé en Guadeloupe. Tu t'appelles "Alex".
 
MISSION : Collecter les pièces justificatives pour le dossier ${DOSSIER_TYPES[dossierType].label} de ${prenom}.
 
PIÈCES À COLLECTER :
${pieces.map((p, i) => `${i + 1}. [${p.code}] ${p.label} — Statut: ${p.status}`).join("\n")}
 
RÈGLES :
- Chaleureux, professionnel, français naturel (contexte guadeloupéen)
- Demande UNE seule pièce à la fois
- Quand fichier reçu : valide ou demande correction
- Max 1-2 emojis par message
- Rappelle la progression régulièrement
- Ne jamais redemander une pièce déjà fournie
- Mentionne que les documents sont stockés de façon sécurisée
 
PIÈCES REÇUES : ${pieces.filter(p => p.status !== "MANQUANT").map(p => p.label).join(", ") || "Aucune"}
PIÈCES MANQUANTES : ${pieces.filter(p => p.status === "MANQUANT").map(p => p.label).join(", ")}
 
FORMAT : Texte conversationnel, max 3 phrases, pas de listes à puces.
Quand tout est complet : félicite et dis que le conseiller contacte sous 24-48h.`;
 
// ── HELPERS ────────────────────────────────────────────────────────────────
const genId = () => Math.random().toString(36).substr(2, 9);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const nowTime = () => new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
 
async function callAgent(messages, systemPrompt) {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, system: systemPrompt }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.text;
}
 
// ── COMPOSANTS UI ──────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const cfg = {
    MANQUANT: { bg: "#3F1A1A", color: "#FF6B6B", label: "Manquant" },
    RECU:     { bg: "#1A2F3F", color: "#60A5FA", label: "Reçu" },
    VALIDE:   { bg: "#1A3F2F", color: "#34D399", label: "Validé" },
    REFUSE:   { bg: "#3F2A1A", color: "#F97316", label: "Refusé" },
  };
  const c = cfg[status] || cfg.MANQUANT;
  return (
    <span style={{ background: c.bg, color: c.color, fontSize: 11, fontWeight: 600, padding: "2px 9px", borderRadius: 20, display: "inline-flex", alignItems: "center", gap: 5, fontFamily: "'Space Mono',monospace" }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: c.color, display: "inline-block" }} />
      {c.label}
    </span>
  );
}
 
function ProgressRing({ value, size = 56 }) {
  const r = (size - 8) / 2, circ = 2 * Math.PI * r, offset = circ - (value / 100) * circ;
  const color = value === 100 ? "#34D399" : value > 60 ? "#60A5FA" : B.orange;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={B.border} strokeWidth={4} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={4}
        strokeDasharray={circ} strokeDashoffset={offset}
        style={{ transition: "stroke-dashoffset 0.5s ease, stroke 0.3s" }} strokeLinecap="round" />
      <text x={size / 2} y={size / 2 + 1} textAnchor="middle" dominantBaseline="middle"
        style={{ fill: color, fontSize: 12, fontWeight: 700, fontFamily: "'Space Mono',monospace" }}
        transform={`rotate(90,${size / 2},${size / 2})`}>{value}%</text>
    </svg>
  );
}
 
function Typing() {
  return (
    <div style={{ display: "flex", gap: 4, alignItems: "center", padding: "10px 14px" }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: B.muted, animation: "wave 1.2s ease-in-out infinite", animationDelay: `${i * 0.15}s` }} />
      ))}
    </div>
  );
}
 
function Bubble({ msg }) {
  const agent = msg.role === "agent";
  return (
    <div style={{ display: "flex", justifyContent: agent ? "flex-start" : "flex-end", marginBottom: 8, animation: "fadeUp 0.3s ease" }}>
      {agent && (
        <div style={{ width: 32, height: 32, borderRadius: "50%", background: `linear-gradient(135deg,${B.blue},${B.orange})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, marginRight: 8, flexShrink: 0, alignSelf: "flex-end" }}>🤖</div>
      )}
      <div style={{ maxWidth: "75%" }}>
        {msg.file && (
          <div style={{ background: agent ? B.card : B.blue, borderRadius: agent ? "18px 18px 18px 4px" : "18px 18px 4px 18px", padding: "10px 14px", marginBottom: 4, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 22 }}>{msg.file.type?.includes("pdf") ? "📄" : "🖼️"}</span>
            <div>
              <div style={{ color: B.text, fontSize: 13, fontWeight: 600 }}>{msg.file.name}</div>
              <div style={{ color: B.muted, fontSize: 11 }}>{(msg.file.size / 1024).toFixed(1)} KB</div>
            </div>
          </div>
        )}
        <div style={{ background: agent ? B.card : `linear-gradient(135deg,${B.blue},#0052CC)`, color: B.text, padding: "10px 14px", borderRadius: agent ? "18px 18px 18px 4px" : "18px 18px 4px 18px", fontSize: 14, lineHeight: 1.65, boxShadow: agent ? "0 2px 8px rgba(0,0,0,0.3)" : `0 2px 12px rgba(0,59,142,0.4)` }}>
          {msg.content}
        </div>
        <div style={{ fontSize: 11, color: B.muted, marginTop: 3, textAlign: agent ? "left" : "right", paddingLeft: agent ? 4 : 0, paddingRight: agent ? 0 : 4 }}>
          {msg.time}{!agent && <span style={{ marginLeft: 4, color: "#60A5FA" }}>✓✓</span>}
        </div>
      </div>
    </div>
  );
}
 
// ── VUE CHAT (partagée dashboard démo + client externe) ────────────────────
function ChatView({ dossier, onPieceReceived }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const bottomRef = useRef(null);
  const fileRef = useRef(null);
  const inited = useRef(false);
 
  const addMsg = useCallback((role, content, file = null) => {
    setMessages(p => [...p, { id: genId(), role, content, file, time: nowTime() }]);
  }, []);
 
  const sendToAgent = useCallback(async (userContent, fileInfo = null, hist = null) => {
    setTyping(true); setLoading(true);
    try {
      const h = hist || history;
      const msgContent = fileInfo
        ? `[FICHIER: ${fileInfo.name} (${fileInfo.type || "document"})] ${userContent || "Voici le document demandé."}`
        : userContent;
      const updated = [...h, { role: "user", content: msgContent }];
      await sleep(700 + Math.random() * 400);
      const reply = await callAgent(updated, SYSTEM_PROMPT(dossier.type, dossier.prenom, dossier.pieces));
      setHistory([...updated, { role: "assistant", content: reply }]);
      addMsg("agent", reply);
      if (fileInfo) {
        const pending = dossier.pieces.find(p => p.status === "MANQUANT");
        if (pending) onPieceReceived?.(pending.code);
      }
    } catch {
      addMsg("agent", "Désolé, une erreur est survenue. Pouvez-vous réessayer ? 🙏");
    } finally {
      setTyping(false); setLoading(false);
    }
  }, [history, dossier, addMsg, onPieceReceived]);
 
  useEffect(() => {
    if (inited.current) return;
    inited.current = true;
    (async () => {
      setTyping(true);
      await sleep(900);
      const greeting = await callAgent(
        [{ role: "user", content: `Bonjour, je suis ${dossier.prenom} ${dossier.nom}.` }],
        SYSTEM_PROMPT(dossier.type, dossier.prenom, dossier.pieces)
      ).catch(() => `Bonjour ${dossier.prenom} ! 👋 Je suis Alex, votre assistant AXECIME. Je vais vous aider à constituer votre dossier. Commençons par votre carte d'identité : pouvez-vous m'envoyer une photo recto-verso ?`);
      setTyping(false);
      addMsg("agent", greeting);
      setHistory([
        { role: "user", content: `Bonjour, je suis ${dossier.prenom} ${dossier.nom}.` },
        { role: "assistant", content: greeting },
      ]);
    })();
  }, []);
 
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, typing]);
 
  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const txt = input.trim(); setInput("");
    addMsg("client", txt);
    await sendToAgent(txt);
  };
 
  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fi = { name: file.name, type: file.type, size: file.size };
    addMsg("client", "", fi);
    await sendToAgent("", fi);
    e.target.value = "";
  };
 
  const pct = Math.round((dossier.pieces.filter(p => p.status !== "MANQUANT").length / dossier.pieces.length) * 100);
 
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Header */}
      <div style={{ background: B.surface, borderBottom: `1px solid ${B.border}`, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
        <div style={{ width: 44, height: 44, borderRadius: "50%", background: `linear-gradient(135deg,${B.blue},${B.orange})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>🤖</div>
        <div style={{ flex: 1 }}>
          <div style={{ color: B.text, fontWeight: 700, fontSize: 15 }}>Alex — AXECIME</div>
          <div style={{ color: "#34D399", fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#34D399" }} />
            En ligne · Assistant certifié
          </div>
        </div>
        <ProgressRing value={pct} />
      </div>
 
      {/* Banner type dossier */}
      <div style={{ background: `linear-gradient(90deg,${B.blue}18,${B.orange}18)`, borderBottom: `1px solid ${B.border}`, padding: "7px 16px", display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        <span>{DOSSIER_TYPES[dossier.type].icon}</span>
        <span style={{ color: B.muted, fontSize: 12 }}>Dossier :</span>
        <span style={{ color: B.text, fontSize: 13, fontWeight: 600 }}>{DOSSIER_TYPES[dossier.type].label}</span>
        <span style={{ marginLeft: "auto", color: B.muted, fontSize: 12 }}>{dossier.pieces.filter(p => p.status !== "MANQUANT").length}/{dossier.pieces.length} pièces</span>
      </div>
 
      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: 16, background: `radial-gradient(ellipse at top left,${B.blue}08 0%,transparent 60%),${B.dark}` }}>
        {messages.length === 0 && (
          <div style={{ textAlign: "center", color: B.muted, fontSize: 13, marginTop: 48 }}>
            <div style={{ fontSize: 44, marginBottom: 12, animation: "pulse 1.5s ease infinite" }}>🤖</div>
            Connexion à l'assistant en cours...
          </div>
        )}
        {messages.map(m => <Bubble key={m.id} msg={m} />)}
        {typing && (
          <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: `linear-gradient(135deg,${B.blue},${B.orange})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>🤖</div>
            <div style={{ background: B.card, borderRadius: "18px 18px 18px 4px" }}><Typing /></div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
 
      {/* Input */}
      <div style={{ background: B.surface, borderTop: `1px solid ${B.border}`, padding: "12px 16px", flexShrink: 0 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button onClick={() => fileRef.current?.click()} disabled={loading} style={{ width: 42, height: 42, borderRadius: "50%", border: `1px solid ${B.border}`, background: loading ? B.border : B.card, cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>📎</button>
          <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display: "none" }} onChange={handleFile} />
          <input value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder="Écrivez un message..." disabled={loading}
            style={{ flex: 1, background: B.card, border: `1px solid ${B.border}`, borderRadius: 22, padding: "10px 16px", color: B.text, fontSize: 14 }} />
          <button onClick={handleSend} disabled={!input.trim() || loading} style={{ width: 42, height: 42, borderRadius: "50%", background: input.trim() && !loading ? `linear-gradient(135deg,${B.blue},#0052CC)` : B.border, border: "none", cursor: input.trim() && !loading ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, color: "#fff", flexShrink: 0 }}>➤</button>
        </div>
        <div style={{ textAlign: "center", color: B.muted, fontSize: 11, marginTop: 8 }}>🔒 Documents chiffrés · Conforme RGPD · AXECIME</div>
      </div>
    </div>
  );
}
 
// ── PAGE CLIENT (accès via lien unique) ────────────────────────────────────
function ClientPage({ token }) {
  const payload = decodeToken(token);
 
  if (!payload) {
    return (
      <div style={{ height: "100vh", background: B.dark, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16, padding: 24 }}>
        <div style={{ fontSize: 56 }}>⛔</div>
        <div style={{ color: B.text, fontSize: 20, fontWeight: 700, textAlign: "center" }}>Lien invalide ou expiré</div>
        <div style={{ color: B.muted, fontSize: 14, textAlign: "center", maxWidth: 340 }}>
          Ce lien n'est plus valide. Contactez votre conseiller AXECIME pour recevoir un nouveau lien.
        </div>
        <div style={{ marginTop: 8, background: B.surface, borderRadius: 12, padding: "12px 20px", border: `1px solid ${B.border}` }}>
          <div style={{ color: B.muted, fontSize: 12 }}>📞 Contact AXECIME</div>
          <div style={{ color: B.text, fontSize: 14, fontWeight: 600, marginTop: 4 }}>axecime.com</div>
        </div>
      </div>
    );
  }
 
  // Reconstruire le dossier depuis le token
  const dossier = {
    id: payload.id,
    prenom: payload.prenom,
    nom: payload.nom,
    type: payload.type,
    pieces: DOSSIER_TYPES[payload.type].pieces.map(p => ({ ...p, status: "MANQUANT" })),
  };
 
  return (
    <div style={{ height: "100vh", background: B.dark }}>
      <ChatView dossier={dossier} />
    </div>
  );
}
 
// ── DASHBOARD ──────────────────────────────────────────────────────────────
function Dashboard({ dossiers, onSelectDossier, onValidate, onRefuse }) {
  const [sel, setSel] = useState(null);
  const [filter, setFilter] = useState("ALL");
  const [copied, setCopied] = useState(null);
 
  const select = d => { setSel(d.id); onSelectDossier(d); };
  const filtered = dossiers.filter(d => filter === "ALL" || d.statut === filter);
  const stats = {
    total: dossiers.length,
    complets: dossiers.filter(d => d.statut === "COMPLET").length,
    incomplets: dossiers.filter(d => d.statut === "INCOMPLET").length,
    enCours: dossiers.filter(d => d.statut === "EN_COURS").length,
  };
  const statColor = { EN_COURS: "#60A5FA", INCOMPLET: "#FF6B6B", COMPLET: "#34D399" };
 
  const copyLink = (d) => {
    const url = getClientUrl(d.token);
    navigator.clipboard.writeText(url).then(() => {
      setCopied(d.id);
      setTimeout(() => setCopied(null), 2000);
    });
  };
 
  return (
    <div style={{ display: "flex", height: "100%" }}>
      {/* Sidebar */}
      <div style={{ width: 300, background: B.surface, borderRight: `1px solid ${B.border}`, display: "flex", flexDirection: "column", flexShrink: 0 }}>
        <div style={{ padding: 16, borderBottom: `1px solid ${B.border}` }}>
          <div style={{ color: B.muted, fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 12 }}>Vue d'ensemble</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {[{ label: "Total", val: stats.total, color: B.text }, { label: "En cours", val: stats.enCours, color: "#60A5FA" }, { label: "Incomplets", val: stats.incomplets, color: "#FF6B6B" }, { label: "Complets", val: stats.complets, color: "#34D399" }].map(k => (
              <div key={k.label} style={{ background: B.card, borderRadius: 10, padding: "10px 12px", border: `1px solid ${B.border}` }}>
                <div style={{ color: k.color, fontSize: 20, fontWeight: 700, fontFamily: "'Space Mono',monospace" }}>{k.val}</div>
                <div style={{ color: B.muted, fontSize: 11 }}>{k.label}</div>
              </div>
            ))}
          </div>
        </div>
 
        <div style={{ padding: "8px 12px", borderBottom: `1px solid ${B.border}`, display: "flex", gap: 5, flexWrap: "wrap" }}>
          {["ALL", "EN_COURS", "INCOMPLET", "COMPLET"].map(s => (
            <button key={s} onClick={() => setFilter(s)} style={{ background: filter === s ? B.blue : B.card, border: `1px solid ${filter === s ? B.blue : B.border}`, color: filter === s ? "#fff" : B.muted, borderRadius: 20, padding: "4px 10px", fontSize: 11, cursor: "pointer", fontWeight: 600 }}>
              {s === "ALL" ? "Tous" : s === "EN_COURS" ? "En cours" : s === "INCOMPLET" ? "Incomplets" : "Complets"}
            </button>
          ))}
        </div>
 
        <div style={{ flex: 1, overflowY: "auto", padding: 8 }}>
          {filtered.map(d => {
            const pct = Math.round((d.pieces.filter(p => p.status !== "MANQUANT").length / d.pieces.length) * 100);
            return (
              <div key={d.id} onClick={() => select(d)} style={{ background: sel === d.id ? `${B.blue}22` : B.card, border: `1px solid ${sel === d.id ? B.blue : B.border}`, borderRadius: 12, padding: 12, marginBottom: 6, cursor: "pointer", transition: "all 0.2s" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <div>
                    <div style={{ color: B.text, fontWeight: 700, fontSize: 13 }}>{d.prenom} {d.nom}</div>
                    <div style={{ color: B.muted, fontSize: 11, marginTop: 2 }}>{DOSSIER_TYPES[d.type].icon} {DOSSIER_TYPES[d.type].label}</div>
                  </div>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: statColor[d.statut] || B.muted, marginTop: 4 }} />
                </div>
                <div style={{ background: B.border, borderRadius: 4, height: 3, overflow: "hidden" }}>
                  <div style={{ width: `${pct}%`, height: "100%", borderRadius: 4, background: pct === 100 ? "#34D399" : pct > 60 ? "#60A5FA" : B.orange, transition: "width 0.5s" }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                  <div style={{ color: B.muted, fontSize: 11 }}>{d.pieces.filter(p => p.status !== "MANQUANT").length}/{d.pieces.length} pièces</div>
                  <div style={{ color: B.muted, fontSize: 11, fontFamily: "'Space Mono',monospace" }}>{pct}%</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
 
      {/* Panneau détail */}
      <div style={{ flex: 1, overflowY: "auto", background: B.dark }}>
        {sel ? (() => {
          const d = dossiers.find(x => x.id === sel);
          if (!d) return null;
          const pct = Math.round((d.pieces.filter(p => p.status !== "MANQUANT").length / d.pieces.length) * 100);
          const clientUrl = getClientUrl(d.token);
 
          return (
            <div style={{ padding: 24 }}>
              {/* Header dossier */}
              <div style={{ background: B.surface, borderRadius: 16, padding: 20, border: `1px solid ${B.border}`, marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                <div>
                  <div style={{ color: B.text, fontSize: 22, fontWeight: 800 }}>{d.prenom} {d.nom}</div>
                  <div style={{ color: B.muted, fontSize: 13, marginTop: 4, display: "flex", gap: 16, flexWrap: "wrap" }}>
                    <span>📧 {d.email}</span><span>📱 {d.tel}</span>
                  </div>
                  <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ background: `${B.blue}33`, color: "#60A5FA", padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600 }}>{DOSSIER_TYPES[d.type].icon} {DOSSIER_TYPES[d.type].label}</span>
                    <span style={{ color: B.muted, fontSize: 12 }}>Conseiller : {d.conseiller}</span>
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  <ProgressRing value={pct} size={68} />
                  <div style={{ color: B.muted, fontSize: 11 }}>Complétion</div>
                </div>
              </div>
 
              {/* 🔗 LIEN CLIENT — la fonctionnalité clé */}
              <div style={{ background: `${B.blue}18`, border: `1px solid ${B.blue}55`, borderRadius: 14, padding: 16, marginBottom: 16 }}>
                <div style={{ color: "#60A5FA", fontWeight: 700, fontSize: 14, marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                  🔗 Lien client à envoyer
                </div>
                <div style={{ background: B.card, borderRadius: 10, padding: "10px 14px", fontSize: 12, color: B.muted, fontFamily: "'Space Mono',monospace", wordBreak: "break-all", marginBottom: 10, border: `1px solid ${B.border}` }}>
                  {clientUrl}
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button onClick={() => copyLink(d)} style={{ background: copied === d.id ? "#1A3F2F" : `linear-gradient(135deg,${B.blue},#0052CC)`, border: `1px solid ${copied === d.id ? "#34D399" : "transparent"}`, color: copied === d.id ? "#34D399" : "#fff", borderRadius: 10, padding: "8px 16px", fontSize: 13, cursor: "pointer", fontWeight: 700, transition: "all 0.3s" }}>
                    {copied === d.id ? "✓ Copié !" : "📋 Copier le lien"}
                  </button>
                  <a href={`https://wa.me/${d.tel?.replace(/\D/g, "")}?text=${encodeURIComponent(`Bonjour ${d.prenom} ! 👋 Voici votre lien sécurisé AXECIME pour déposer vos documents : ${clientUrl}`)}`}
                    target="_blank" rel="noreferrer"
                    style={{ background: "#128C7E22", border: "1px solid #25D36655", color: "#25D366", borderRadius: 10, padding: "8px 16px", fontSize: 13, fontWeight: 700, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 }}>
                    💬 Envoyer par WhatsApp
                  </a>
                  <a href={`mailto:${d.email}?subject=Votre dossier AXECIME — Documents à fournir&body=Bonjour ${d.prenom},%0A%0AVoici votre lien sécurisé pour déposer vos documents :%0A${clientUrl}%0A%0ACe lien est valable 30 jours.%0A%0ACordialement,%0AL'équipe AXECIME`}
                    style={{ background: `${B.orange}22`, border: `1px solid ${B.orange}55`, color: B.orange, borderRadius: 10, padding: "8px 16px", fontSize: 13, fontWeight: 700, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 }}>
                    📧 Envoyer par email
                  </a>
                </div>
                <div style={{ color: B.muted, fontSize: 11, marginTop: 8 }}>⏳ Lien valable 30 jours · Accès sécurisé au chat uniquement</div>
              </div>
 
              {/* Pièces */}
              <div style={{ color: B.text, fontWeight: 700, fontSize: 15, marginBottom: 12 }}>Pièces justificatives</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
                {d.pieces.map(p => (
                  <div key={p.code} style={{ background: B.surface, borderRadius: 12, padding: "13px 16px", border: `1px solid ${B.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                    <div>
                      <div style={{ color: B.text, fontSize: 14, fontWeight: 600 }}>{p.label}</div>
                      <div style={{ color: B.muted, fontSize: 11, fontFamily: "'Space Mono',monospace", marginTop: 2 }}>{p.code} · {p.type}</div>
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <StatusBadge status={p.status} />
                      {p.status === "RECU" && (
                        <div style={{ display: "flex", gap: 6 }}>
                          <button onClick={() => onValidate(d.id, p.code)} style={{ background: "#1A3F2F", border: "1px solid #34D399", color: "#34D399", borderRadius: 8, padding: "5px 11px", fontSize: 12, cursor: "pointer", fontWeight: 700 }}>✓ Valider</button>
                          <button onClick={() => onRefuse(d.id, p.code)} style={{ background: "#3F1A1A", border: "1px solid #FF6B6B", color: "#FF6B6B", borderRadius: 8, padding: "5px 11px", fontSize: 12, cursor: "pointer", fontWeight: 700 }}>✕ Refuser</button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
 
              {/* Actions */}
              <div style={{ background: B.surface, borderRadius: 16, padding: 16, border: `1px solid ${B.border}` }}>
                <div style={{ color: B.text, fontWeight: 600, fontSize: 14, marginBottom: 12 }}>Actions rapides</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {[{ label: "📧 Relance email", color: B.blue }, { label: "💬 Relance WhatsApp", color: "#25D366" }, { label: "📞 Appeler le client", color: B.orange }].map(btn => (
                    <button key={btn.label} style={{ background: `${btn.color}22`, border: `1px solid ${btn.color}55`, color: btn.color, borderRadius: 10, padding: "8px 14px", fontSize: 13, cursor: "pointer", fontWeight: 600 }}>{btn.label}</button>
                  ))}
                </div>
              </div>
            </div>
          );
        })() : (
          <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12, color: B.muted }}>
            <div style={{ fontSize: 52 }}>📂</div>
            <div style={{ fontSize: 15 }}>Sélectionnez un dossier</div>
            <div style={{ fontSize: 13, color: B.muted }}>Le lien client apparaîtra ici</div>
          </div>
        )}
      </div>
    </div>
  );
}
 
// ── APP PRINCIPALE ─────────────────────────────────────────────────────────
const INIT = [
  { id: "dos-001", prenom: "Jean", nom: "Dupont", email: "j.dupont@email.com", tel: "+596690123456", type: "PRET_IMMO", statut: "INCOMPLET", conseiller: "Marie L.", pieces: DOSSIER_TYPES.PRET_IMMO.pieces.map((p, i) => ({ ...p, status: i < 3 ? "VALIDE" : i === 3 ? "RECU" : "MANQUANT" })) },
  { id: "dos-002", prenom: "Nadège", nom: "Martin", email: "n.martin@email.com", tel: "+596690987654", type: "ASSUR_PRET", statut: "EN_COURS", conseiller: "Pierre T.", pieces: DOSSIER_TYPES.ASSUR_PRET.pieces.map((p, i) => ({ ...p, status: i === 0 ? "VALIDE" : "MANQUANT" })) },
  { id: "dos-003", prenom: "Christophe", nom: "Beaumont", email: "c.beaumont@email.com", tel: "+596690554433", type: "DEFISC", statut: "COMPLET", conseiller: "Sophie A.", pieces: DOSSIER_TYPES.DEFISC.pieces.map(p => ({ ...p, status: "VALIDE" })) },
].map(d => ({ ...d, token: generateToken(d) })); // Générer les tokens au démarrage
 
export default function App() {
  const route = useHashRoute();
  const [view, setView] = useState("dashboard");
  const [dossiers, setDossiers] = useState(INIT);
  const [active, setActive] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ prenom: "", nom: "", email: "", tel: "", type: "PRET_IMMO", conseiller: "" });
 
  // Routing : si l'URL contient #/client/TOKEN → afficher la page client
  const clientMatch = route.match(/#\/client\/(.+)/);
  if (clientMatch) {
    return <ClientPage token={clientMatch[1]} />;
  }
 
  const updatePiece = (dossierId, pieceCode, newStatus) => {
    const up = arr => arr.map(d => {
      if (d.id !== dossierId) return d;
      const pieces = d.pieces.map(p => p.code === pieceCode ? { ...p, status: newStatus } : p);
      const allDone = pieces.every(p => p.status === "VALIDE");
      const anyMiss = pieces.some(p => p.status === "MANQUANT");
      return { ...d, pieces, statut: allDone ? "COMPLET" : anyMiss ? "INCOMPLET" : "EN_COURS" };
    });
    setDossiers(up);
    if (active) setActive(prev => up([prev])[0]);
  };
 
  const createDossier = () => {
    if (!form.prenom || !form.nom) return;
    const newD = {
      id: `dos-${genId()}`,
      conseiller: "Non assigné",
      ...form,
      statut: "EN_COURS",
      pieces: DOSSIER_TYPES[form.type].pieces.map(p => ({ ...p, status: "MANQUANT" })),
    };
    newD.token = generateToken(newD);
    setDossiers(p => [newD, ...p]);
    setActive(newD);
    setShowNew(false);
    setForm({ prenom: "", nom: "", email: "", tel: "", type: "PRET_IMMO", conseiller: "" });
  };
 
  return (
    <div style={{ height: "100vh", background: B.dark, display: "flex", flexDirection: "column" }}>
      {/* Nav */}
      <div style={{ background: B.surface, borderBottom: `1px solid ${B.border}`, padding: "0 20px", display: "flex", alignItems: "center", height: 52, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginRight: 28 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: `linear-gradient(135deg,${B.blue},${B.orange})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>⚡</div>
          <span style={{ color: B.text, fontWeight: 800, fontSize: 15 }}>AXECIME</span>
          <span style={{ color: B.muted, fontSize: 11, background: B.card, padding: "2px 8px", borderRadius: 20, border: `1px solid ${B.border}` }}>Agent IA</span>
        </div>
        {[{ id: "dashboard", label: "📊 Dashboard" }, { id: "demo", label: "💬 Démo agent" }].map(t => (
          <button key={t.id} onClick={() => setView(t.id)} style={{ background: "none", border: "none", cursor: "pointer", color: view === t.id ? B.text : B.muted, fontWeight: view === t.id ? 700 : 400, fontSize: 13, padding: "0 14px", height: "100%", borderBottom: view === t.id ? `2px solid ${B.orange}` : "2px solid transparent", transition: "all 0.2s" }}>{t.label}</button>
        ))}
        <div style={{ marginLeft: "auto" }}>
          <button onClick={() => setShowNew(true)} style={{ background: `linear-gradient(135deg,${B.blue},#0052CC)`, border: "none", color: "#fff", borderRadius: 8, padding: "6px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>+ Nouveau dossier</button>
        </div>
      </div>
 
      {/* Contenu */}
      <div style={{ flex: 1, overflow: "hidden" }}>
        {view === "dashboard" ? (
          <Dashboard dossiers={dossiers} onSelectDossier={setActive}
            onValidate={(id, code) => updatePiece(id, code, "VALIDE")}
            onRefuse={(id, code) => updatePiece(id, code, "REFUSE")} />
        ) : (
          <div style={{ display: "flex", height: "100%" }}>
            <div style={{ width: 200, background: B.surface, borderRight: `1px solid ${B.border}`, overflowY: "auto", padding: 8, flexShrink: 0 }}>
              <div style={{ color: B.muted, fontSize: 10, fontWeight: 700, padding: "6px 8px 4px", letterSpacing: 1, textTransform: "uppercase" }}>Dossiers</div>
              {dossiers.map(d => (
                <div key={d.id} onClick={() => setActive(d)} style={{ background: active?.id === d.id ? `${B.blue}22` : "transparent", border: `1px solid ${active?.id === d.id ? B.blue : "transparent"}`, borderRadius: 10, padding: "9px 10px", cursor: "pointer", marginBottom: 3 }}>
                  <div style={{ color: B.text, fontSize: 13, fontWeight: 600 }}>{d.prenom} {d.nom}</div>
                  <div style={{ color: B.muted, fontSize: 11, marginTop: 1 }}>{DOSSIER_TYPES[d.type].icon} {DOSSIER_TYPES[d.type].label}</div>
                </div>
              ))}
            </div>
            <div style={{ flex: 1 }}>
              {active ? <ChatView key={active.id} dossier={active} onPieceReceived={code => updatePiece(active.id, code, "RECU")} />
                : <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: B.muted, flexDirection: "column", gap: 8 }}><div style={{ fontSize: 40 }}>💬</div>Sélectionnez un dossier</div>}
            </div>
          </div>
        )}
      </div>
 
      {/* Modal nouveau dossier */}
      {showNew && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} onClick={() => setShowNew(false)}>
          <div style={{ background: B.surface, borderRadius: 20, padding: 28, width: 420, border: `1px solid ${B.border}`, boxShadow: "0 24px 80px rgba(0,0,0,0.6)", animation: "slideIn 0.3s ease" }} onClick={e => e.stopPropagation()}>
            <div style={{ color: B.text, fontSize: 18, fontWeight: 700, marginBottom: 20 }}>✨ Nouveau Dossier Client</div>
            {[{ k: "prenom", l: "Prénom", ph: "Jean" }, { k: "nom", l: "Nom", ph: "Dupont" }, { k: "email", l: "Email", ph: "jean@email.com" }, { k: "tel", l: "Tél WhatsApp (avec indicatif)", ph: "+596690000000" }, { k: "conseiller", l: "Conseiller assigné", ph: "Marie L." }].map(f => (
              <div key={f.k} style={{ marginBottom: 11 }}>
                <label style={{ color: B.muted, fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>{f.l}</label>
                <input value={form[f.k]} onChange={e => setForm(p => ({ ...p, [f.k]: e.target.value }))} placeholder={f.ph}
                  style={{ width: "100%", background: B.card, border: `1px solid ${B.border}`, borderRadius: 10, padding: "10px 12px", color: B.text, fontSize: 14, boxSizing: "border-box" }} />
              </div>
            ))}
            <div style={{ marginBottom: 18 }}>
              <label style={{ color: B.muted, fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>Type de dossier</label>
              <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))} style={{ width: "100%", background: B.card, border: `1px solid ${B.border}`, borderRadius: 10, padding: "10px 12px", color: B.text, fontSize: 14 }}>
                {Object.entries(DOSSIER_TYPES).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
              </select>
            </div>
            <div style={{ background: `${B.blue}18`, border: `1px solid ${B.blue}44`, borderRadius: 10, padding: "10px 14px", marginBottom: 16 }}>
              <div style={{ color: "#60A5FA", fontSize: 12 }}>🔗 Un lien unique sera généré automatiquement après création et affiché dans le dashboard.</div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setShowNew(false)} style={{ flex: 1, background: B.card, border: `1px solid ${B.border}`, color: B.muted, borderRadius: 10, padding: 12, cursor: "pointer", fontWeight: 600 }}>Annuler</button>
              <button onClick={createDossier} style={{ flex: 1, background: `linear-gradient(135deg,${B.blue},#0052CC)`, border: "none", color: "#fff", borderRadius: 10, padding: 12, cursor: "pointer", fontWeight: 700 }}>Créer ✓</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
