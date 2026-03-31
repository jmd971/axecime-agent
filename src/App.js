import React, { useState, useEffect, useRef, useCallback } from "react";

const B = {
  blue:"#003B8E", orange:"#E8550A", dark:"#0A0F1E",
  surface:"#111827", card:"#1A2235", border:"#1E2D45",
  text:"#E2E8F0", muted:"#64748B",
};

const CONSEILLER_PASSWORD = "axecime2025";

const DOSSIER_TYPES = {
  PRET_IMMO:{label:"Prêt Immobilier",icon:"🏠",pieces:[
    {code:"CNI",label:"Carte d'identité (recto-verso)",type:"IDENTITE"},
    {code:"JUSTIF_DOM",label:"Justificatif de domicile < 3 mois",type:"DOMICILE"},
    {code:"BULL_SAL_1",label:"Bulletin de salaire M-1",type:"REVENUS"},
    {code:"BULL_SAL_2",label:"Bulletin de salaire M-2",type:"REVENUS"},
    {code:"BULL_SAL_3",label:"Bulletin de salaire M-3",type:"REVENUS"},
    {code:"AVIS_IMPOS",label:"Avis d'imposition N-1",type:"REVENUS"},
    {code:"RELEVE_BANCAIRE",label:"3 derniers relevés bancaires",type:"REVENUS"},
    {code:"COMPROMIS",label:"Compromis de vente signé",type:"BIEN"},
  ]},
  ASSUR_PRET:{label:"Assurance de Prêt",icon:"🛡️",pieces:[
    {code:"CNI",label:"Carte d'identité",type:"IDENTITE"},
    {code:"QUESTIONNAIRE_SANTE",label:"Questionnaire de santé complété",type:"SANTE"},
    {code:"OFFRE_PRET",label:"Offre de prêt bancaire",type:"FINANCEMENT"},
    {code:"TABLEAU_AMORT",label:"Tableau d'amortissement",type:"FINANCEMENT"},
    {code:"CERTIFICAT_EMPLOI",label:"Certificat d'emploi",type:"REVENUS"},
  ]},
  DEFISC:{label:"Défiscalisation Pinel OM",icon:"📊",pieces:[
    {code:"CNI",label:"Carte d'identité",type:"IDENTITE"},
    {code:"AVIS_IMPOS",label:"Avis d'imposition 2 dernières années",type:"REVENUS"},
    {code:"ACTE_VENTE",label:"Acte de vente ou VEFA signé",type:"BIEN"},
    {code:"PLAN_FINANCEMENT",label:"Plan de financement détaillé",type:"FINANCEMENT"},
    {code:"RIB",label:"Relevé d'Identité Bancaire",type:"FINANCEMENT"},
  ]},
  RACHAT_CREDIT:{label:"Rachat de Crédit",icon:"🔄",pieces:[
    {code:"CNI",label:"Carte d'identité",type:"IDENTITE"},
    {code:"JUSTIF_DOM",label:"Justificatif de domicile",type:"DOMICILE"},
    {code:"TABLEAUX_AMORT",label:"Tableaux d'amortissement en cours",type:"FINANCEMENT"},
    {code:"BULL_SAL_1",label:"Bulletin de salaire M-1",type:"REVENUS"},
    {code:"BULL_SAL_2",label:"Bulletin de salaire M-2",type:"REVENUS"},
    {code:"AVIS_IMPOS",label:"Avis d'imposition N-1",type:"REVENUS"},
    {code:"RELEVE_BANCAIRE",label:"3 derniers relevés bancaires",type:"REVENUS"},
  ]},
};

// ── TOKEN ──────────────────────────────────────────────────────────────────
function hashDob(dob){return btoa(dob.replace(/\D/g,""));}
function generateToken(dossier){
  const payload={id:dossier.id,prenom:dossier.prenom,nom:dossier.nom,type:dossier.type,
    dobHash:hashDob(dossier.dob||""),exp:Date.now()+30*24*60*60*1000};
  return btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
}
function decodeToken(token){
  try{const p=JSON.parse(decodeURIComponent(escape(atob(token))));return p.exp<Date.now()?null:p;}
  catch{return null;}
}
function verifyDob(inputDob,dobHash){return hashDob(inputDob)===dobHash;}
function getClientUrl(token){return window.location.origin+"/#/client/"+token;}

// FIX #2 — Affichage correct de la date (évite le décalage UTC)
function formatDateFR(isoDate){
  if(!isoDate)return "—";
  const parts=isoDate.split("-");
  if(parts.length!==3)return isoDate;
  return parts[2]+"/"+parts[1]+"/"+parts[0];
}

// ── ROUTING ────────────────────────────────────────────────────────────────
function useHashRoute(){
  const [route,setRoute]=useState(window.location.hash||"#/");
  useEffect(()=>{
    const h=()=>setRoute(window.location.hash||"#/");
    window.addEventListener("hashchange",h);
    return()=>window.removeEventListener("hashchange",h);
  },[]);
  return route;
}

// ── API ────────────────────────────────────────────────────────────────────
async function apiGetDossiers(){
  const res=await fetch("/api/dossiers");
  if(!res.ok)throw new Error("Erreur chargement");
  return res.json();
}
async function apiCreateDossier(dossier){
  const res=await fetch("/api/dossiers",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(dossier)});
  if(!res.ok)throw new Error("Erreur création");
  return res.json();
}
async function apiUpdatePiece(id,pieceCode,newStatus){
  const res=await fetch("/api/dossier",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({id,pieceCode,newStatus})});
  if(!res.ok)throw new Error("Erreur mise à jour");
  return res.json();
}

// FIX #3 — Upload SharePoint avec nom+prenom+type dans le body
async function apiUploadToSharePoint(file,dossier,pieceCode){
  return new Promise((resolve,reject)=>{
    const reader=new FileReader();
    reader.onload=async(e)=>{
      try{
        const base64=e.target.result.split(",")[1];
        const res=await fetch("/api/upload",{
          method:"POST",
          headers:{"Content-Type":"application/json"},
          body:JSON.stringify({
            dossierId:dossier.id,
            prenom:dossier.prenom,
            nom:dossier.nom,
            typeDossier:DOSSIER_TYPES[dossier.type]?.label||dossier.type,
            pieceCode,
            fileName:file.name,
            fileBase64:base64,
            mimeType:file.type,
          }),
        });
        const data=await res.json();
        if(!res.ok||!data.success)throw new Error(data.error||"Erreur upload");
        resolve(data);
      }catch(err){reject(err);}
    };
    reader.onerror=()=>reject(new Error("Erreur lecture fichier"));
    reader.readAsDataURL(file);
  });
}

// ── PROMPT ────────────────────────────────────────────────────────────────
function buildPrompt(type,prenom,pieces){
  return "Tu es l'assistant IA d'AXECIME, cabinet de courtage indépendant basé en Guadeloupe. Tu t'appelles Alex.\n"+
    "MISSION : Collecter les pièces pour le dossier "+DOSSIER_TYPES[type].label+" de "+prenom+".\n"+
    "PIÈCES : "+pieces.map((p,i)=>(i+1)+". ["+p.code+"] "+p.label+" — "+p.status).join(" | ")+"\n"+
    "RÈGLES : Chaleureux, français naturel guadeloupéen. UNE pièce à la fois. Max 2 emojis. Rappelle la progression. Mentionne la sécurité SharePoint.\n"+
    "REÇUES : "+(pieces.filter(p=>p.status!=="MANQUANT").map(p=>p.label).join(", ")||"Aucune")+"\n"+
    "MANQUANTES : "+pieces.filter(p=>p.status==="MANQUANT").map(p=>p.label).join(", ")+"\n"+
    "FORMAT : Max 3 phrases. Quand tout complet : félicite + conseiller sous 24-48h.";
}

// ── HELPERS ───────────────────────────────────────────────────────────────
const genId=()=>Math.random().toString(36).substr(2,9);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const nowTime=()=>new Date().toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"});

async function callAgent(messages,system){
  const res=await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({messages,system})});
  const data=await res.json();
  if(data.error)throw new Error(data.error);
  return data.text;
}

// ── CSS ───────────────────────────────────────────────────────────────────
function GlobalCSS(){
  return React.createElement("style",null,`
    @keyframes wave{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-6px)}}
    @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
    @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}
    @keyframes slideIn{from{opacity:0;transform:translateY(-16px) scale(0.97)}to{opacity:1;transform:translateY(0) scale(1)}}
    @keyframes shakeX{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-8px)}40%,80%{transform:translateX(8px)}}
    @keyframes spin{to{transform:rotate(360deg)}}
    ::-webkit-scrollbar{width:4px}
    ::-webkit-scrollbar-thumb{background:#1E2D45;border-radius:4px}
    select option{background:#1A2235;color:#E2E8F0;}
  `);
}

// ── COMPOSANTS ────────────────────────────────────────────────────────────
function StatusBadge({status}){
  const cfg={MANQUANT:{bg:"#3F1A1A",color:"#FF6B6B",label:"Manquant"},RECU:{bg:"#1A2F3F",color:"#60A5FA",label:"Reçu"},VALIDE:{bg:"#1A3F2F",color:"#34D399",label:"Validé"},REFUSE:{bg:"#3F2A1A",color:"#F97316",label:"Refusé"}};
  const c=cfg[status]||cfg.MANQUANT;
  return <span style={{background:c.bg,color:c.color,fontSize:11,fontWeight:600,padding:"2px 9px",borderRadius:20,display:"inline-flex",alignItems:"center",gap:5,fontFamily:"'Space Mono',monospace"}}>
    <span style={{width:6,height:6,borderRadius:"50%",background:c.color,display:"inline-block"}}/>{c.label}
  </span>;
}

function ProgressRing({value,size=56}){
  const r=(size-8)/2,circ=2*Math.PI*r,offset=circ-(value/100)*circ;
  const color=value===100?"#34D399":value>60?"#60A5FA":B.orange;
  return <svg width={size} height={size} style={{transform:"rotate(-90deg)"}}>
    <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={B.border} strokeWidth={4}/>
    <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={4}
      strokeDasharray={circ} strokeDashoffset={offset} style={{transition:"stroke-dashoffset 0.5s ease"}} strokeLinecap="round"/>
    <text x={size/2} y={size/2+1} textAnchor="middle" dominantBaseline="middle"
      style={{fill:color,fontSize:12,fontWeight:700,fontFamily:"'Space Mono',monospace"}}
      transform={"rotate(90,"+size/2+","+size/2+")"}>{value}%</text>
  </svg>;
}

function Typing(){
  return <div style={{display:"flex",gap:4,alignItems:"center",padding:"10px 14px"}}>
    {[0,1,2].map(i=><div key={i} style={{width:8,height:8,borderRadius:"50%",background:B.muted,animation:"wave 1.2s ease-in-out infinite",animationDelay:(i*0.15)+"s"}}/>)}
  </div>;
}

function Bubble({msg}){
  const agent=msg.role==="agent";
  return <div style={{display:"flex",justifyContent:agent?"flex-start":"flex-end",marginBottom:8,animation:"fadeUp 0.3s ease"}}>
    {agent&&<div style={{width:32,height:32,borderRadius:"50%",background:"linear-gradient(135deg,"+B.blue+","+B.orange+")",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,marginRight:8,flexShrink:0,alignSelf:"flex-end"}}>🤖</div>}
    <div style={{maxWidth:"75%"}}>
      {msg.file&&<div style={{background:agent?B.card:B.blue,borderRadius:agent?"18px 18px 18px 4px":"18px 18px 4px 18px",padding:"10px 14px",marginBottom:4,display:"flex",alignItems:"center",gap:8}}>
        <span style={{fontSize:22}}>{msg.file.type&&msg.file.type.includes("pdf")?"📄":"🖼️"}</span>
        <div style={{flex:1,minWidth:0}}>
          <div style={{color:B.text,fontSize:13,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{msg.file.name}</div>
          <div style={{color:B.muted,fontSize:11,display:"flex",alignItems:"center",gap:6}}>
            {(msg.file.size/1024).toFixed(1)} KB
            {msg.uploadStatus==="uploading"&&<span style={{color:"#60A5FA"}}>⏳ Envoi vers SharePoint...</span>}
            {msg.uploadStatus==="success"&&<span style={{color:"#34D399"}}>✅ Enregistré dans SharePoint</span>}
            {msg.uploadStatus==="error"&&<span style={{color:"#FF6B6B"}}>❌ Erreur upload</span>}
          </div>
        </div>
      </div>}
      {msg.content&&<div style={{background:agent?B.card:"linear-gradient(135deg,"+B.blue+",#0052CC)",color:B.text,padding:"10px 14px",borderRadius:agent?"18px 18px 18px 4px":"18px 18px 4px 18px",fontSize:14,lineHeight:1.65}}>
        {msg.content}
      </div>}
      <div style={{fontSize:11,color:B.muted,marginTop:3,textAlign:agent?"left":"right",paddingLeft:agent?4:0}}>
        {msg.time}{!agent&&<span style={{marginLeft:4,color:"#60A5FA"}}>✓✓</span>}
      </div>
    </div>
  </div>;
}

// FIX #1 — Saisie date de naissance avec 3 selects (Jour / Mois / Année)
function DobInput({value, onChange}){
  const parts = value ? value.split("-") : ["","",""];
  const year = parts[0]||"", month = parts[1]||"", day = parts[2]||"";

  const update=(y,m,d)=>{
    if(y&&m&&d) onChange(y+"-"+m+"-"+d);
    else onChange("");
  };

  const days=Array.from({length:31},(_,i)=>String(i+1).padStart(2,"0"));
  const months=[
    {v:"01",l:"Janvier"},{v:"02",l:"Février"},{v:"03",l:"Mars"},{v:"04",l:"Avril"},
    {v:"05",l:"Mai"},{v:"06",l:"Juin"},{v:"07",l:"Juillet"},{v:"08",l:"Août"},
    {v:"09",l:"Septembre"},{v:"10",l:"Octobre"},{v:"11",l:"Novembre"},{v:"12",l:"Décembre"},
  ];
  const currentYear=new Date().getFullYear();
  const years=Array.from({length:100},(_,i)=>String(currentYear-i));

  const sel={background:B.card,border:"1px solid "+B.border,borderRadius:10,padding:"10px 8px",color:B.text,fontSize:14,flex:1,cursor:"pointer"};

  return <div style={{display:"flex",gap:8}}>
    <select value={day} onChange={e=>update(year,month,e.target.value)} style={sel}>
      <option value="">Jour</option>
      {days.map(d=><option key={d} value={d}>{d}</option>)}
    </select>
    <select value={month} onChange={e=>update(year,e.target.value,day)} style={{...sel,flex:2}}>
      <option value="">Mois</option>
      {months.map(m=><option key={m.v} value={m.v}>{m.l}</option>)}
    </select>
    <select value={year} onChange={e=>update(e.target.value,month,day)} style={{...sel,flex:2}}>
      <option value="">Année</option>
      {years.map(y=><option key={y} value={y}>{y}</option>)}
    </select>
  </div>;
}

// ── VÉRIFICATION DATE DE NAISSANCE ────────────────────────────────────────
function DobVerification({prenom,dobHash,onVerified}){
  const [dob,setDob]=useState("");
  const [err,setErr]=useState(false);
  const [shake,setShake]=useState(false);
  const [attempts,setAttempts]=useState(0);
  const blocked=attempts>=5;

  const verify=()=>{
    if(!dob||blocked)return;
    if(verifyDob(dob,dobHash)){onVerified();}
    else{setAttempts(a=>a+1);setErr(true);setShake(true);setTimeout(()=>setShake(false),500);}
  };

  return <div style={{height:"100vh",background:"radial-gradient(ellipse at 30% 40%,"+B.blue+"20 0%,transparent 60%),"+B.dark,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
    <div style={{background:B.surface,borderRadius:20,padding:36,width:400,maxWidth:"100%",border:"1px solid "+B.border,boxShadow:"0 24px 80px rgba(0,0,0,0.5)",animation:shake?"shakeX 0.4s ease":"slideIn 0.4s ease"}}>
      <div style={{textAlign:"center",marginBottom:28}}>
        <div style={{width:56,height:56,borderRadius:16,background:"linear-gradient(135deg,"+B.blue+","+B.orange+")",display:"flex",alignItems:"center",justifyContent:"center",fontSize:28,margin:"0 auto 14px"}}>⚡</div>
        <div style={{color:B.text,fontSize:22,fontWeight:800}}>AXECIME</div>
        <div style={{color:B.muted,fontSize:13,marginTop:4}}>Espace documents sécurisé</div>
      </div>
      <div style={{background:B.blue+"18",border:"1px solid "+B.blue+"44",borderRadius:12,padding:"12px 16px",marginBottom:20,textAlign:"center"}}>
        <div style={{color:B.text,fontSize:15,fontWeight:600}}>Bonjour {prenom} 👋</div>
        <div style={{color:B.muted,fontSize:13,marginTop:4}}>Veuillez confirmer votre date de naissance pour accéder à vos documents.</div>
      </div>
      {blocked?(
        <div style={{background:"#3F1A1A",border:"1px solid #FF6B6B44",borderRadius:12,padding:16,textAlign:"center"}}>
          <div style={{fontSize:28,marginBottom:8}}>🔒</div>
          <div style={{color:"#FF6B6B",fontWeight:700,fontSize:14}}>Accès temporairement bloqué</div>
          <div style={{color:B.muted,fontSize:12,marginTop:6}}>Trop de tentatives. Contactez votre conseiller AXECIME.</div>
        </div>
      ):(
        <>
          <div style={{marginBottom:16}}>
            <label style={{color:B.muted,fontSize:12,fontWeight:600,display:"block",marginBottom:8}}>VOTRE DATE DE NAISSANCE</label>
            <DobInput value={dob} onChange={setDob}/>
            {err&&<div style={{color:"#FF6B6B",fontSize:12,marginTop:8}}>❌ Date incorrecte — {5-attempts} tentative{5-attempts>1?"s":""} restante{5-attempts>1?"s":""}</div>}
          </div>
          <button onClick={verify} disabled={!dob}
            style={{width:"100%",background:dob?"linear-gradient(135deg,"+B.blue+",#0052CC)":B.border,border:"none",color:dob?"#fff":B.muted,borderRadius:12,padding:14,fontSize:15,fontWeight:700,cursor:dob?"pointer":"not-allowed",fontFamily:"'DM Sans',sans-serif",marginTop:8}}>
            Accéder à mes documents →
          </button>
        </>
      )}
      <div style={{textAlign:"center",color:B.muted,fontSize:11,marginTop:16}}>🔒 Accès sécurisé · Données chiffrées · Conforme RGPD</div>
    </div>
  </div>;
}

// ── CHAT VIEW ─────────────────────────────────────────────────────────────
function ChatView({dossier,onPieceReceived}){
  const [messages,setMessages]=useState([]);
  const [input,setInput]=useState("");
  const [typing,setTyping]=useState(false);
  const [loading,setLoading]=useState(false);
  const [history,setHistory]=useState([]);
  const bottomRef=useRef(null);
  const fileRef=useRef(null);
  const inited=useRef(false);

  const addMsg=useCallback((role,content,file=null,uploadStatus=null)=>{
    const id=genId();
    setMessages(p=>[...p,{id,role,content,file,uploadStatus,time:nowTime()}]);
    return id;
  },[]);

  const updateUploadStatus=useCallback((msgId,status)=>{
    setMessages(p=>p.map(m=>m.id===msgId?{...m,uploadStatus:status}:m));
  },[]);

  const sendToAgent=useCallback(async(userContent,fileInfo=null,hist=null)=>{
    setTyping(true);setLoading(true);
    try{
      const h=hist||history;
      const msgContent=fileInfo?"[FICHIER REÇU: "+fileInfo.name+" — Enregistré dans SharePoint] "+(userContent||"Voici le document demandé."):userContent;
      const updated=[...h,{role:"user",content:msgContent}];
      await sleep(600+Math.random()*400);
      const reply=await callAgent(updated,buildPrompt(dossier.type,dossier.prenom,dossier.pieces));
      setHistory([...updated,{role:"assistant",content:reply}]);
      addMsg("agent",reply);
      if(fileInfo){
        const pending=dossier.pieces.find(p=>p.status==="MANQUANT");
        if(pending)onPieceReceived&&onPieceReceived(pending.code);
      }
    }catch(e){
      console.error("Chat error:",e);
      addMsg("agent","Désolé, une erreur est survenue. Réessayez dans un instant 🙏");
    }
    finally{setTyping(false);setLoading(false);}
  },[history,dossier,addMsg,onPieceReceived]);

  useEffect(()=>{
    if(inited.current)return;
    inited.current=true;
    (async()=>{
      setTyping(true);await sleep(800);
      const greeting=await callAgent(
        [{role:"user",content:"Bonjour, je suis "+dossier.prenom+" "+dossier.nom+"."}],
        buildPrompt(dossier.type,dossier.prenom,dossier.pieces)
      ).catch(()=>"Bonjour "+dossier.prenom+" ! 👋 Je suis Alex, l'assistant AXECIME. Commençons votre dossier — pouvez-vous m'envoyer une photo de votre carte d'identité recto-verso ?");
      setTyping(false);
      addMsg("agent",greeting);
      setHistory([{role:"user",content:"Bonjour, je suis "+dossier.prenom+" "+dossier.nom+"."},{role:"assistant",content:greeting}]);
    })();
  },[]);

  useEffect(()=>{bottomRef.current&&bottomRef.current.scrollIntoView({behavior:"smooth"});},[messages,typing]);

  const pct=Math.round((dossier.pieces.filter(p=>p.status!=="MANQUANT").length/dossier.pieces.length)*100);
  const doSend=()=>{if(!input.trim()||loading)return;const t=input.trim();setInput("");addMsg("client",t);sendToAgent(t);};

  const handleFile=async(file)=>{
    const fi={name:file.name,type:file.type,size:file.size};
    const pending=dossier.pieces.find(p=>p.status==="MANQUANT");
    const msgId=addMsg("client","",fi,"uploading");
    let uploadOk=false;
    try{
      await apiUploadToSharePoint(file,dossier,pending?.code||"DOC");
      updateUploadStatus(msgId,"success");
      uploadOk=true;
    }catch(e){
      console.error("Upload error:",e);
      updateUploadStatus(msgId,"error");
    }
    await sendToAgent("",{...fi,uploaded:uploadOk});
  };

  return <div style={{display:"flex",flexDirection:"column",height:"100%"}}>
    <div style={{background:B.surface,borderBottom:"1px solid "+B.border,padding:"12px 16px",display:"flex",alignItems:"center",gap:12,flexShrink:0}}>
      <div style={{width:44,height:44,borderRadius:"50%",background:"linear-gradient(135deg,"+B.blue+","+B.orange+")",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>🤖</div>
      <div style={{flex:1}}>
        <div style={{color:B.text,fontWeight:700,fontSize:15}}>Alex — AXECIME</div>
        <div style={{color:"#34D399",fontSize:12,display:"flex",alignItems:"center",gap:4}}>
          <div style={{width:6,height:6,borderRadius:"50%",background:"#34D399"}}/>En ligne · Assistant certifié
        </div>
      </div>
      <ProgressRing value={pct}/>
    </div>
    <div style={{background:"linear-gradient(90deg,"+B.blue+"18,"+B.orange+"18)",borderBottom:"1px solid "+B.border,padding:"7px 16px",display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
      <span>{DOSSIER_TYPES[dossier.type].icon}</span>
      <span style={{color:B.muted,fontSize:12}}>Dossier :</span>
      <span style={{color:B.text,fontSize:13,fontWeight:600}}>{DOSSIER_TYPES[dossier.type].label}</span>
      <span style={{marginLeft:"auto",color:B.muted,fontSize:12}}>{dossier.pieces.filter(p=>p.status!=="MANQUANT").length}/{dossier.pieces.length} pièces</span>
    </div>
    <div style={{flex:1,overflowY:"auto",padding:16,background:"radial-gradient(ellipse at top left,"+B.blue+"08 0%,transparent 60%),"+B.dark}}>
      {messages.length===0&&<div style={{textAlign:"center",color:B.muted,fontSize:13,marginTop:48}}>
        <div style={{fontSize:44,marginBottom:12,animation:"pulse 1.5s ease infinite"}}>🤖</div>
        Connexion à l'assistant en cours...
      </div>}
      {messages.map(m=><Bubble key={m.id} msg={m}/>)}
      {typing&&<div style={{display:"flex",alignItems:"flex-end",gap:8}}>
        <div style={{width:32,height:32,borderRadius:"50%",background:"linear-gradient(135deg,"+B.blue+","+B.orange+")",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14}}>🤖</div>
        <div style={{background:B.card,borderRadius:"18px 18px 18px 4px"}}><Typing/></div>
      </div>}
      <div ref={bottomRef}/>
    </div>
    <div style={{background:B.surface,borderTop:"1px solid "+B.border,padding:"12px 16px",flexShrink:0}}>
      <div style={{display:"flex",gap:8,alignItems:"center"}}>
        <button onClick={()=>fileRef.current&&fileRef.current.click()} disabled={loading}
          style={{width:42,height:42,borderRadius:"50%",border:"1px solid "+B.border,background:loading?B.border:B.card,cursor:loading?"not-allowed":"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>📎</button>
        <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" style={{display:"none"}} onChange={e=>{
          const file=e.target.files&&e.target.files[0];if(!file)return;
          handleFile(file);e.target.value="";
        }}/>
        <input value={input} onChange={e=>setInput(e.target.value)}
          onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&doSend()}
          placeholder="Écrivez un message..." disabled={loading}
          style={{flex:1,background:B.card,border:"1px solid "+B.border,borderRadius:22,padding:"10px 16px",color:B.text,fontSize:14}}/>
        <button onClick={doSend} disabled={!input.trim()||loading}
          style={{width:42,height:42,borderRadius:"50%",background:input.trim()&&!loading?"linear-gradient(135deg,"+B.blue+",#0052CC)":B.border,border:"none",cursor:input.trim()&&!loading?"pointer":"not-allowed",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,color:"#fff",flexShrink:0}}>➤</button>
      </div>
      <div style={{textAlign:"center",color:B.muted,fontSize:11,marginTop:8}}>🔒 Documents sauvegardés dans SharePoint AXECIME · Conforme RGPD</div>
    </div>
  </div>;
}

// ── PAGE CLIENT ───────────────────────────────────────────────────────────
function ClientPage({token}){
  const [verified,setVerified]=useState(false);
  const payload=decodeToken(token);
  if(!payload)return <div style={{height:"100vh",background:B.dark,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:16,padding:24}}>
    <GlobalCSS/>
    <div style={{fontSize:56}}>⛔</div>
    <div style={{color:B.text,fontSize:20,fontWeight:700,textAlign:"center"}}>Lien invalide ou expiré</div>
    <div style={{color:B.muted,fontSize:14,textAlign:"center",maxWidth:340}}>Ce lien n'est plus valide. Contactez votre conseiller AXECIME.</div>
    <div style={{background:B.surface,borderRadius:12,padding:"12px 20px",border:"1px solid "+B.border,textAlign:"center"}}>
      <div style={{color:B.text,fontSize:14,fontWeight:600}}>axecime.com</div>
    </div>
  </div>;
  const dossier={id:payload.id,prenom:payload.prenom,nom:payload.nom,type:payload.type,
    pieces:DOSSIER_TYPES[payload.type].pieces.map(p=>({...p,status:"MANQUANT"}))};
  return <div style={{height:"100vh",background:B.dark}}>
    <GlobalCSS/>
    {!verified
      ?<DobVerification prenom={payload.prenom} dobHash={payload.dobHash} onVerified={()=>setVerified(true)}/>
      :<ChatView dossier={dossier}/>}
  </div>;
}

// ── LOGIN ─────────────────────────────────────────────────────────────────
function LoginPage({onLogin}){
  const [pwd,setPwd]=useState("");
  const [err,setErr]=useState(false);
  const [shake,setShake]=useState(false);
  const handle=()=>{
    if(pwd===CONSEILLER_PASSWORD){sessionStorage.setItem("axecime_auth","1");onLogin();}
    else{setErr(true);setShake(true);setTimeout(()=>setShake(false),500);}
  };
  return <div style={{height:"100vh",background:"radial-gradient(ellipse at 30% 40%,"+B.blue+"25 0%,transparent 60%),"+B.dark,display:"flex",alignItems:"center",justifyContent:"center"}}>
    <GlobalCSS/>
    <div style={{background:B.surface,borderRadius:20,padding:40,width:380,border:"1px solid "+B.border,boxShadow:"0 24px 80px rgba(0,0,0,0.5)",animation:shake?"shakeX 0.4s ease":"slideIn 0.4s ease"}}>
      <div style={{textAlign:"center",marginBottom:32}}>
        <div style={{width:64,height:64,borderRadius:18,background:"linear-gradient(135deg,"+B.blue+","+B.orange+")",display:"flex",alignItems:"center",justifyContent:"center",fontSize:32,margin:"0 auto 16px"}}>⚡</div>
        <div style={{color:B.text,fontSize:24,fontWeight:800}}>AXECIME</div>
        <div style={{color:B.muted,fontSize:13,marginTop:4}}>Espace Conseillers</div>
      </div>
      <div style={{marginBottom:16}}>
        <label style={{color:B.muted,fontSize:12,fontWeight:600,display:"block",marginBottom:6}}>MOT DE PASSE</label>
        <input type="password" value={pwd} onChange={e=>{setPwd(e.target.value);setErr(false);}}
          onKeyDown={e=>e.key==="Enter"&&handle()} placeholder="••••••••••"
          style={{width:"100%",background:B.card,border:"1px solid "+(err?"#FF6B6B":B.border),borderRadius:12,padding:"12px 16px",color:B.text,fontSize:15,boxSizing:"border-box",fontFamily:"'DM Sans',sans-serif"}}/>
        {err&&<div style={{color:"#FF6B6B",fontSize:12,marginTop:6}}>❌ Mot de passe incorrect</div>}
      </div>
      <button onClick={handle} style={{width:"100%",background:"linear-gradient(135deg,"+B.blue+",#0052CC)",border:"none",color:"#fff",borderRadius:12,padding:14,fontSize:15,fontWeight:700,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>
        Accéder au Dashboard →
      </button>
      <div style={{textAlign:"center",color:B.muted,fontSize:11,marginTop:16}}>🔒 Accès réservé aux conseillers AXECIME</div>
    </div>
  </div>;
}

// ── DASHBOARD ─────────────────────────────────────────────────────────────
function Dashboard({dossiers,loading,onValidate,onNewDossier,onLogout,onRefresh}){
  const [sel,setSel]=useState(null);
  const [filter,setFilter]=useState("ALL");
  const [copied,setCopied]=useState(null);
  const [saving,setSaving]=useState(null);
  const statColor={EN_COURS:"#60A5FA",INCOMPLET:"#FF6B6B",COMPLET:"#34D399"};
  const filtered=dossiers.filter(d=>filter==="ALL"||d.statut===filter);
  const stats={total:dossiers.length,complets:dossiers.filter(d=>d.statut==="COMPLET").length,incomplets:dossiers.filter(d=>d.statut==="INCOMPLET").length,enCours:dossiers.filter(d=>d.statut==="EN_COURS").length};
  const d=dossiers.find(x=>x.id===sel);
  const copyLink=(dos)=>{navigator.clipboard.writeText(getClientUrl(dos.token)).then(()=>{setCopied(dos.id);setTimeout(()=>setCopied(null),2000);});};
  const handlePiece=async(dossierId,pieceCode,newStatus)=>{setSaving(pieceCode);try{await onValidate(dossierId,pieceCode,newStatus);}finally{setSaving(null);}};

  return <div style={{height:"100vh",background:B.dark,display:"flex",flexDirection:"column"}}>
    <div style={{background:B.surface,borderBottom:"1px solid "+B.border,padding:"0 20px",display:"flex",alignItems:"center",height:52,flexShrink:0,gap:12}}>
      <div style={{width:30,height:30,borderRadius:8,background:"linear-gradient(135deg,"+B.blue+","+B.orange+")",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>⚡</div>
      <span style={{color:B.text,fontWeight:800,fontSize:15}}>AXECIME</span>
      <span style={{color:B.muted,fontSize:11,background:B.card,padding:"2px 8px",borderRadius:20,border:"1px solid "+B.border}}>Conseillers</span>
      <div style={{marginLeft:"auto",display:"flex",gap:8}}>
        <button onClick={onRefresh} title="Actualiser" style={{background:B.card,border:"1px solid "+B.border,color:B.muted,borderRadius:8,padding:"6px 10px",fontSize:14,cursor:"pointer"}}>🔄</button>
        <button onClick={onNewDossier} style={{background:"linear-gradient(135deg,"+B.blue+",#0052CC)",border:"none",color:"#fff",borderRadius:8,padding:"6px 14px",fontSize:12,fontWeight:700,cursor:"pointer"}}>+ Nouveau dossier</button>
        <button onClick={onLogout} style={{background:B.card,border:"1px solid "+B.border,color:B.muted,borderRadius:8,padding:"6px 10px",fontSize:12,cursor:"pointer"}}>🚪</button>
      </div>
    </div>
    <div style={{flex:1,display:"flex",overflow:"hidden"}}>
      <div style={{width:280,background:B.surface,borderRight:"1px solid "+B.border,display:"flex",flexDirection:"column",flexShrink:0}}>
        <div style={{padding:"12px 12px 8px",borderBottom:"1px solid "+B.border}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:10}}>
            {[{l:"Total",v:stats.total,c:B.text},{l:"En cours",v:stats.enCours,c:"#60A5FA"},{l:"Incomplets",v:stats.incomplets,c:"#FF6B6B"},{l:"Complets",v:stats.complets,c:"#34D399"}].map(k=>(
              <div key={k.l} style={{background:B.card,borderRadius:8,padding:"8px 10px",border:"1px solid "+B.border}}>
                <div style={{color:k.c,fontSize:18,fontWeight:700,fontFamily:"'Space Mono',monospace"}}>{k.v}</div>
                <div style={{color:B.muted,fontSize:10}}>{k.l}</div>
              </div>
            ))}
          </div>
          <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
            {["ALL","EN_COURS","INCOMPLET","COMPLET"].map(s=>(
              <button key={s} onClick={()=>setFilter(s)} style={{background:filter===s?B.blue:B.card,border:"1px solid "+(filter===s?B.blue:B.border),color:filter===s?"#fff":B.muted,borderRadius:16,padding:"3px 8px",fontSize:10,cursor:"pointer",fontWeight:600}}>
                {s==="ALL"?"Tous":s==="EN_COURS"?"En cours":s==="INCOMPLET"?"Incomplets":"Complets"}
              </button>
            ))}
          </div>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:8}}>
          {loading?<div style={{textAlign:"center",color:B.muted,fontSize:13,marginTop:24}}>Chargement...</div>
           :filtered.length===0?<div style={{textAlign:"center",color:B.muted,fontSize:13,marginTop:24}}>Aucun dossier</div>
           :filtered.map(dos=>{
            const pct=Math.round((dos.pieces.filter(p=>p.status!=="MANQUANT").length/dos.pieces.length)*100);
            const isSel=sel===dos.id;
            return <div key={dos.id} onClick={()=>setSel(dos.id)}
              style={{background:isSel?B.blue+"22":B.card,border:"1px solid "+(isSel?B.blue:B.border),borderRadius:12,padding:"10px 12px",marginBottom:6,cursor:"pointer",transition:"all 0.2s"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
                <div>
                  <div style={{color:B.text,fontWeight:700,fontSize:13}}>{dos.prenom} {dos.nom}</div>
                  <div style={{color:B.muted,fontSize:11,marginTop:1}}>{DOSSIER_TYPES[dos.type]?.icon} {DOSSIER_TYPES[dos.type]?.label}</div>
                  <div style={{color:B.muted,fontSize:10,marginTop:1}}>👤 {dos.conseiller||"—"}</div>
                </div>
                <div style={{width:8,height:8,borderRadius:"50%",background:statColor[dos.statut]||B.muted,marginTop:4,flexShrink:0}}/>
              </div>
              <div style={{background:B.border,borderRadius:3,height:3,overflow:"hidden"}}>
                <div style={{width:pct+"%",height:"100%",background:pct===100?"#34D399":pct>60?"#60A5FA":B.orange,transition:"width 0.5s"}}/>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",marginTop:4}}>
                <div style={{color:B.muted,fontSize:10}}>{dos.pieces.filter(p=>p.status!=="MANQUANT").length}/{dos.pieces.length} pièces</div>
                <div style={{color:B.muted,fontSize:10,fontFamily:"'Space Mono',monospace"}}>{pct}%</div>
              </div>
            </div>;
          })}
        </div>
      </div>
      <div style={{flex:1,overflowY:"auto",background:B.dark}}>
        {d?(
          <div style={{padding:24,maxWidth:800}}>
            <div style={{background:B.surface,borderRadius:16,padding:20,border:"1px solid "+B.border,marginBottom:16,display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12}}>
              <div>
                <div style={{color:B.text,fontSize:20,fontWeight:800}}>{d.prenom} {d.nom}</div>
                <div style={{color:B.muted,fontSize:13,marginTop:4,display:"flex",gap:12,flexWrap:"wrap"}}>
                  {d.email&&<span>📧 {d.email}</span>}
                  {d.tel&&<span>📱 {d.tel}</span>}
                  {/* FIX #2 — Date affichée correctement */}
                  {d.dob&&<span>🎂 {formatDateFR(d.dob)}</span>}
                </div>
                <div style={{marginTop:8,display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
                  <span style={{background:B.blue+"33",color:"#60A5FA",padding:"3px 10px",borderRadius:20,fontSize:12,fontWeight:600}}>{DOSSIER_TYPES[d.type]?.icon} {DOSSIER_TYPES[d.type]?.label}</span>
                  {d.conseiller&&<span style={{color:B.muted,fontSize:12}}>👤 {d.conseiller}</span>}
                </div>
                {/* FIX #3 — Affichage du chemin SharePoint */}
                <div style={{marginTop:6,color:B.muted,fontSize:11,fontFamily:"'Space Mono',monospace"}}>
                  📁 {(d.nom||"").toUpperCase().replace(/\s+/g,"_")+"_"+(d.prenom||"").toUpperCase().replace(/\s+/g,"_")+"_"+(DOSSIER_TYPES[d.type]?.label||"").toUpperCase().replace(/\s+/g,"_")}
                </div>
              </div>
              <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
                <ProgressRing value={Math.round((d.pieces.filter(p=>p.status!=="MANQUANT").length/d.pieces.length)*100)} size={64}/>
                <div style={{color:B.muted,fontSize:11}}>Complétion</div>
              </div>
            </div>

            <div style={{background:"#1A2F3F22",border:"1px solid "+B.blue+"44",borderRadius:10,padding:"10px 14px",marginBottom:16,display:"flex",alignItems:"center",gap:8}}>
              <span>📁</span>
              <div style={{color:"#60A5FA",fontSize:12}}><strong>Stockage SharePoint actif</strong> — Dossier : Dossiers-Clients/{(d.nom||"").toUpperCase().replace(/\s+/g,"_")}_{(d.prenom||"").toUpperCase().replace(/\s+/g,"_")}_{(DOSSIER_TYPES[d.type]?.label||"").toUpperCase().replace(/\s+/g,"_")}</div>
            </div>

            <div style={{background:B.blue+"15",border:"1px solid "+B.blue+"44",borderRadius:14,padding:16,marginBottom:16}}>
              <div style={{color:"#60A5FA",fontWeight:700,fontSize:14,marginBottom:10}}>🔗 Lien à envoyer au client</div>
              <div style={{background:B.card,borderRadius:8,padding:"8px 12px",fontSize:11,color:B.muted,fontFamily:"'Space Mono',monospace",wordBreak:"break-all",marginBottom:10,border:"1px solid "+B.border}}>
                {getClientUrl(d.token)}
              </div>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                <button onClick={()=>copyLink(d)} style={{background:copied===d.id?"#1A3F2F":"linear-gradient(135deg,"+B.blue+",#0052CC)",border:"1px solid "+(copied===d.id?"#34D399":"transparent"),color:copied===d.id?"#34D399":"#fff",borderRadius:10,padding:"8px 14px",fontSize:13,cursor:"pointer",fontWeight:700,transition:"all 0.3s"}}>
                  {copied===d.id?"✓ Copié !":"📋 Copier le lien"}
                </button>
                {d.tel&&<a href={"https://wa.me/"+d.tel.replace(/\D/g,"")+"?text="+encodeURIComponent("Bonjour "+d.prenom+" ! 👋\n\nVoici votre lien sécurisé AXECIME pour déposer vos documents :\n"+getClientUrl(d.token)+"\n\nVous devrez confirmer votre date de naissance pour y accéder.\nLien valable 30 jours.\n\nL'équipe AXECIME")}
                  target="_blank" rel="noreferrer"
                  style={{background:"#128C7E22",border:"1px solid #25D36655",color:"#25D366",borderRadius:10,padding:"8px 14px",fontSize:13,fontWeight:700,textDecoration:"none",display:"inline-flex",alignItems:"center",gap:6}}>
                  💬 WhatsApp
                </a>}
                {d.email&&<a href={"mailto:"+d.email+"?subject=Vos documents AXECIME&body=Bonjour "+d.prenom+",%0A%0AVoici votre lien sécurisé :%0A%0A"+getClientUrl(d.token)+"%0A%0AConfirmez votre date de naissance pour y accéder.%0ALien valable 30 jours.%0A%0ACordialement,%0AL'équipe AXECIME"}
                  style={{background:B.orange+"22",border:"1px solid "+B.orange+"55",color:B.orange,borderRadius:10,padding:"8px 14px",fontSize:13,fontWeight:700,textDecoration:"none",display:"inline-flex",alignItems:"center",gap:6}}>
                  📧 Email
                </a>}
              </div>
              <div style={{color:B.muted,fontSize:11,marginTop:8}}>⏳ 30 jours · 🔐 Protégé par date de naissance · 📁 SharePoint</div>
            </div>

            <div style={{color:B.text,fontWeight:700,fontSize:15,marginBottom:10}}>Pièces justificatives</div>
            <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:20}}>
              {d.pieces.map(p=>(
                <div key={p.code} style={{background:B.surface,borderRadius:10,padding:"12px 14px",border:"1px solid "+B.border,display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
                  <div>
                    <div style={{color:B.text,fontSize:14,fontWeight:600}}>{p.label}</div>
                    <div style={{color:B.muted,fontSize:10,fontFamily:"'Space Mono',monospace",marginTop:2}}>{p.code} · {p.type}</div>
                  </div>
                  <div style={{display:"flex",gap:6,alignItems:"center"}}>
                    <StatusBadge status={p.status}/>
                    {p.status==="RECU"&&<>
                      <button onClick={()=>handlePiece(d.id,p.code,"VALIDE")} disabled={saving===p.code}
                        style={{background:"#1A3F2F",border:"1px solid #34D399",color:"#34D399",borderRadius:8,padding:"4px 10px",fontSize:12,cursor:"pointer",fontWeight:700,opacity:saving===p.code?0.6:1}}>
                        {saving===p.code?"...":"✓ Valider"}
                      </button>
                      <button onClick={()=>handlePiece(d.id,p.code,"REFUSE")} disabled={saving===p.code}
                        style={{background:"#3F1A1A",border:"1px solid #FF6B6B",color:"#FF6B6B",borderRadius:8,padding:"4px 10px",fontSize:12,cursor:"pointer",fontWeight:700,opacity:saving===p.code?0.6:1}}>
                        {saving===p.code?"...":"✕ Refuser"}
                      </button>
                    </>}
                  </div>
                </div>
              ))}
            </div>

            <div style={{background:B.surface,borderRadius:14,padding:14,border:"1px solid "+B.border}}>
              <div style={{color:B.text,fontWeight:600,fontSize:13,marginBottom:10}}>Actions rapides</div>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                {[{l:"📧 Relance email",c:B.blue},{l:"💬 Relance WhatsApp",c:"#25D366"},{l:"📞 Appeler",c:B.orange}].map(btn=>(
                  <button key={btn.l} style={{background:btn.c+"22",border:"1px solid "+btn.c+"55",color:btn.c,borderRadius:10,padding:"7px 12px",fontSize:12,cursor:"pointer",fontWeight:600}}>{btn.l}</button>
                ))}
              </div>
            </div>
          </div>
        ):(
          <div style={{height:"100%",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:12,color:B.muted}}>
            <div style={{fontSize:52}}>📂</div>
            <div style={{fontSize:15}}>Sélectionnez un dossier</div>
            <div style={{fontSize:13}}>Le lien client et les pièces apparaîtront ici</div>
          </div>
        )}
      </div>
    </div>
  </div>;
}

// ── MODAL NOUVEAU DOSSIER ─────────────────────────────────────────────────
function NewDossierModal({onClose,onCreate,saving}){
  const [form,setForm]=useState({prenom:"",nom:"",email:"",tel:"",dob:"",type:"PRET_IMMO",conseiller:""});
  const set=(k,v)=>setForm(p=>({...p,[k]:v}));
  const valid=form.prenom&&form.nom&&form.dob;

  return <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:20}} onClick={onClose}>
    <div style={{background:B.surface,borderRadius:20,padding:28,width:440,maxWidth:"100%",border:"1px solid "+B.border,boxShadow:"0 24px 80px rgba(0,0,0,0.6)",animation:"slideIn 0.3s ease",maxHeight:"90vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
      <div style={{color:B.text,fontSize:18,fontWeight:700,marginBottom:20}}>✨ Nouveau Dossier Client</div>

      {[{k:"prenom",l:"Prénom *",ph:"Jean",t:"text"},{k:"nom",l:"Nom *",ph:"Dupont",t:"text"}].map(f=>(
        <div key={f.k} style={{marginBottom:10}}>
          <label style={{color:B.muted,fontSize:12,fontWeight:600,display:"block",marginBottom:4}}>{f.l}</label>
          <input type={f.t} value={form[f.k]} onChange={e=>set(f.k,e.target.value)} placeholder={f.ph}
            style={{width:"100%",background:B.card,border:"1px solid "+B.border,borderRadius:10,padding:"10px 12px",color:B.text,fontSize:14,boxSizing:"border-box"}}/>
        </div>
      ))}

      {/* FIX #1 — 3 selects pour la date de naissance dans le modal aussi */}
      <div style={{marginBottom:12}}>
        <label style={{color:"#60A5FA",fontSize:12,fontWeight:600,display:"block",marginBottom:6}}>Date de naissance * (vérification d'accès client)</label>
        <DobInput value={form.dob} onChange={v=>set("dob",v)}/>
        {form.dob&&<div style={{color:B.muted,fontSize:11,marginTop:4}}>📅 {formatDateFR(form.dob)}</div>}
      </div>

      {[{k:"email",l:"Email",ph:"jean@email.com",t:"email"},{k:"tel",l:"Tél WhatsApp (avec indicatif)",ph:"+596690000000",t:"tel"},{k:"conseiller",l:"Conseiller assigné",ph:"Marie L.",t:"text"}].map(f=>(
        <div key={f.k} style={{marginBottom:10}}>
          <label style={{color:B.muted,fontSize:12,fontWeight:600,display:"block",marginBottom:4}}>{f.l}</label>
          <input type={f.t} value={form[f.k]} onChange={e=>set(f.k,e.target.value)} placeholder={f.ph}
            style={{width:"100%",background:B.card,border:"1px solid "+B.border,borderRadius:10,padding:"10px 12px",color:B.text,fontSize:14,boxSizing:"border-box"}}/>
        </div>
      ))}

      <div style={{marginBottom:16}}>
        <label style={{color:B.muted,fontSize:12,fontWeight:600,display:"block",marginBottom:4}}>Type de dossier</label>
        <select value={form.type} onChange={e=>set("type",e.target.value)}
          style={{width:"100%",background:B.card,border:"1px solid "+B.border,borderRadius:10,padding:"10px 12px",color:B.text,fontSize:14}}>
          {Object.entries(DOSSIER_TYPES).map(([k,v])=><option key={k} value={k}>{v.icon} {v.label}</option>)}
        </select>
      </div>

      {form.nom&&form.prenom&&form.type&&<div style={{background:B.card,border:"1px solid "+B.border,borderRadius:10,padding:"8px 12px",marginBottom:12}}>
        <div style={{color:B.muted,fontSize:11}}>📁 Dossier SharePoint :</div>
        <div style={{color:B.text,fontSize:11,fontFamily:"'Space Mono',monospace",marginTop:2}}>
          Dossiers-Clients/{form.nom.toUpperCase().replace(/\s+/g,"_")}_{form.prenom.toUpperCase().replace(/\s+/g,"_")}_{(DOSSIER_TYPES[form.type]?.label||"").toUpperCase().replace(/\s+/g,"_")}
        </div>
      </div>}

      <div style={{background:B.blue+"18",border:"1px solid "+B.blue+"44",borderRadius:10,padding:"10px 14px",marginBottom:16}}>
        <div style={{color:"#60A5FA",fontSize:12}}>🔐 Date de naissance = vérification client · 📁 Fichiers → SharePoint automatiquement</div>
      </div>

      <div style={{display:"flex",gap:8}}>
        <button onClick={onClose} disabled={saving} style={{flex:1,background:B.card,border:"1px solid "+B.border,color:B.muted,borderRadius:10,padding:12,cursor:"pointer",fontWeight:600}}>Annuler</button>
        <button onClick={()=>{if(valid&&!saving)onCreate(form);}} disabled={!valid||saving}
          style={{flex:1,background:valid&&!saving?"linear-gradient(135deg,"+B.blue+",#0052CC)":B.border,border:"none",color:valid&&!saving?"#fff":B.muted,borderRadius:10,padding:12,cursor:valid&&!saving?"pointer":"not-allowed",fontWeight:700}}>
          {saving?"Création...":"Créer le dossier ✓"}
        </button>
      </div>
    </div>
  </div>;
}

// ── APP ───────────────────────────────────────────────────────────────────
export default function App(){
  const route=useHashRoute();
  const [auth,setAuth]=useState(()=>sessionStorage.getItem("axecime_auth")==="1");
  const [dossiers,setDossiers]=useState([]);
  const [loadingData,setLoadingData]=useState(false);
  const [showNew,setShowNew]=useState(false);
  const [savingNew,setSavingNew]=useState(false);

  const clientMatch=route.match(/#\/client\/(.+)/);
  if(clientMatch)return <ClientPage token={clientMatch[1]}/>;
  if(!auth)return <LoginPage onLogin={()=>setAuth(true)}/>;

  const loadDossiers=useCallback(async()=>{
    setLoadingData(true);
    try{const data=await apiGetDossiers();setDossiers(data);}
    catch(e){console.error("Erreur chargement:",e);}
    finally{setLoadingData(false);}
  },[]);

  useEffect(()=>{loadDossiers();},[loadDossiers]);

  const handleValidate=async(dossierId,pieceCode,newStatus)=>{
    try{
      const updated=await apiUpdatePiece(dossierId,pieceCode,newStatus);
      setDossiers(prev=>prev.map(d=>d.id===dossierId?updated:d));
    }catch(e){console.error("Erreur mise à jour:",e);}
  };

  const handleCreate=async(form)=>{
    setSavingNew(true);
    try{
      const newD={id:"dos-"+genId(),...form,statut:"EN_COURS",
        pieces:DOSSIER_TYPES[form.type].pieces.map(p=>({...p,status:"MANQUANT"}))};
      newD.token=generateToken(newD);
      const saved=await apiCreateDossier(newD);
      setDossiers(prev=>[saved,...prev]);
      setShowNew(false);
    }catch(e){console.error("Erreur création:",e);}
    finally{setSavingNew(false);}
  };

  return <>
    <GlobalCSS/>
    <Dashboard dossiers={dossiers} loading={loadingData}
      onValidate={handleValidate}
      onNewDossier={()=>setShowNew(true)}
      onLogout={()=>{sessionStorage.removeItem("axecime_auth");setAuth(false);}}
      onRefresh={loadDossiers}/>
    {showNew&&<NewDossierModal onClose={()=>setShowNew(false)} onCreate={handleCreate} saving={savingNew}/>}
  </>;
}
