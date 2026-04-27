import React, { useState, useEffect, useRef, useCallback } from "react";

const B = {
  blue:"#003B8E", orange:"#E8550A", dark:"#0A0F1E",
  surface:"#111827", card:"#1A2235", border:"#1E2D45",
  text:"#E2E8F0", muted:"#64748B",
};

const CONSEILLER_PASSWORD = "axecime2025";

const DOSSIER_TYPES = {
  PRET_IMMO:{label:"Prêt Immobilier",icon:"🏠",pieces:[
    {code:"CNI",label:"Carte d'identité (recto-verso)",type:"IDENTITE",category:"01-Identité"},
    {code:"JUSTIF_DOM",label:"Justificatif de domicile < 3 mois",type:"DOMICILE",category:"02-Domicile"},
    {code:"BULL_SAL_1",label:"Bulletin de salaire M-1",type:"REVENUS",category:"03-Revenus"},
    {code:"BULL_SAL_2",label:"Bulletin de salaire M-2",type:"REVENUS",category:"03-Revenus"},
    {code:"BULL_SAL_3",label:"Bulletin de salaire M-3",type:"REVENUS",category:"03-Revenus"},
    {code:"AVIS_IMPOS_N1",label:"Avis d'imposition N-1",type:"REVENUS",category:"03-Revenus"},
    {code:"AVIS_IMPOS_N2",label:"Avis d'imposition N-2",type:"REVENUS",category:"03-Revenus"},
    {code:"REL_BANC_1",label:"Relevé bancaire M-1",type:"BANQUE",category:"04-Banques"},
    {code:"REL_BANC_2",label:"Relevé bancaire M-2",type:"BANQUE",category:"04-Banques"},
    {code:"REL_BANC_3",label:"Relevé bancaire M-3",type:"BANQUE",category:"04-Banques"},
    {code:"TABLEAU_AMORT",label:"Tableau d'amortissement crédit(s) en cours",type:"CREDIT",category:"05-Crédits"},
    {code:"BAIL",label:"Bail signé (si propriétaire bailleur)",type:"LOCATIF",category:"06-Locatif"},
    {code:"QUITTANCES",label:"3 dernières quittances de loyer reçu",type:"LOCATIF",category:"06-Locatif"},
    {code:"COMPROMIS",label:"Compromis de vente signé",type:"BIEN",category:"07-Projet"},
    {code:"DIVERS",label:"Document complémentaire (si nécessaire)",type:"DIVERS",category:"08-Divers"},
  ]},
  ASSUR_PRET:{label:"Assurance de Prêt",icon:"🛡️",pieces:[
    {code:"CNI",label:"Carte d'identité (recto-verso)",type:"IDENTITE",category:"01-Identité"},
    {code:"OFFRE_PRET",label:"Offre de prêt bancaire",type:"FINANCEMENT",category:"02-Financement"},
    {code:"TABLEAU_AMORT",label:"Tableau d'amortissement",type:"FINANCEMENT",category:"02-Financement"},
    {code:"CERTIFICAT_EMPLOI",label:"Certificat d'emploi",type:"REVENUS",category:"03-Revenus"},
    {code:"BULL_SAL_1",label:"Bulletin de salaire M-1",type:"REVENUS",category:"03-Revenus"},
    {code:"QUESTIONNAIRE_SANTE",label:"Questionnaire de santé complété",type:"SANTE",category:"04-Santé"},
  ]},
  DEFISC:{label:"Défiscalisation Pinel OM",icon:"📊",pieces:[
    {code:"CNI",label:"Carte d'identité (recto-verso)",type:"IDENTITE",category:"01-Identité"},
    {code:"AVIS_IMPOS_N1",label:"Avis d'imposition N-1",type:"REVENUS",category:"02-Revenus"},
    {code:"AVIS_IMPOS_N2",label:"Avis d'imposition N-2",type:"REVENUS",category:"02-Revenus"},
    {code:"ACTE_VENTE",label:"Acte de vente ou VEFA signé",type:"BIEN",category:"03-Bien"},
    {code:"RIB",label:"Relevé d'Identité Bancaire",type:"FINANCEMENT",category:"04-Financement"},
    {code:"PLAN_FINANCEMENT",label:"Plan de financement détaillé",type:"FINANCEMENT",category:"04-Financement"},
  ]},
  RACHAT_CREDIT:{label:"Rachat de Crédit",icon:"🔄",pieces:[
    {code:"CNI",label:"Carte d'identité (recto-verso)",type:"IDENTITE",category:"01-Identité"},
    {code:"JUSTIF_DOM",label:"Justificatif de domicile < 3 mois",type:"DOMICILE",category:"02-Domicile"},
    {code:"BULL_SAL_1",label:"Bulletin de salaire M-1",type:"REVENUS",category:"03-Revenus"},
    {code:"BULL_SAL_2",label:"Bulletin de salaire M-2",type:"REVENUS",category:"03-Revenus"},
    {code:"BULL_SAL_3",label:"Bulletin de salaire M-3",type:"REVENUS",category:"03-Revenus"},
    {code:"AVIS_IMPOS_N1",label:"Avis d'imposition N-1",type:"REVENUS",category:"03-Revenus"},
    {code:"REL_BANC_1",label:"Relevé bancaire M-1",type:"BANQUE",category:"04-Banques"},
    {code:"REL_BANC_2",label:"Relevé bancaire M-2",type:"BANQUE",category:"04-Banques"},
    {code:"REL_BANC_3",label:"Relevé bancaire M-3",type:"BANQUE",category:"04-Banques"},
    {code:"TABLEAU_AMORT_1",label:"Tableau d'amortissement crédit 1",type:"CREDIT",category:"05-Crédits à racheter"},
    {code:"TABLEAU_AMORT_2",label:"Tableau d'amortissement crédit 2 (si applicable)",type:"CREDIT",category:"05-Crédits à racheter"},
    {code:"TABLEAU_AMORT_3",label:"Tableau d'amortissement crédit 3 (si applicable)",type:"CREDIT",category:"05-Crédits à racheter"},
  ]},
  DOMMAGE_OUVRAGE:{label:"Dommage Ouvrage",icon:"🏗️",pieces:[
    {code:"CNI_MO",label:"Carte d'identité du maître d'ouvrage",type:"IDENTITE",category:"01-Identité"},
    {code:"JUSTIF_DOM",label:"Justificatif de domicile < 3 mois",type:"DOMICILE",category:"01-Identité"},
    {code:"TITRE_PROPRIO",label:"Titre de propriété ou acte d'acquisition du terrain",type:"ADMINISTRATIF",category:"02-Documents administratifs"},
    {code:"PERMIS_CONSTRUIRE",label:"Permis de construire ou déclaration préalable",type:"ADMINISTRATIF",category:"02-Documents administratifs"},
    {code:"QUESTIONNAIRE_DO",label:"Questionnaire de déclaration du risque (rempli)",type:"ADMINISTRATIF",category:"02-Documents administratifs"},
    {code:"PLAN_MASSE",label:"Plan de masse du terrain",type:"TECHNIQUE",category:"03-Documents techniques"},
    {code:"PLAN_FONDATIONS",label:"Plans de fondations",type:"TECHNIQUE",category:"03-Documents techniques"},
    {code:"PLANS_NIVEAUX",label:"Plans des niveaux et façades",type:"TECHNIQUE",category:"03-Documents techniques"},
    {code:"DESCRIPTIF_TRAVAUX",label:"Descriptif technique des travaux",type:"TECHNIQUE",category:"03-Documents techniques"},
    {code:"ESTIMATION_COUT",label:"Estimation du coût total de l'opération (TTC)",type:"TECHNIQUE",category:"03-Documents techniques"},
    {code:"CONTRAT_CCMI",label:"CCMI ou contrat de maîtrise d'œuvre",type:"CONTRACTUEL",category:"04-Documents contractuels"},
    {code:"DEVIS_ENTREPRISES",label:"Devis de chaque corps d'état",type:"CONTRACTUEL",category:"04-Documents contractuels"},
    {code:"ATTESTATION_RCD",label:"Attestations RCD des entreprises",type:"CONTRACTUEL",category:"04-Documents contractuels"},
    {code:"ASSURANCE_DECEN",label:"Attestations assurance décennale des entrepreneurs",type:"CONTRACTUEL",category:"04-Documents contractuels"},
    {code:"GFL",label:"Garantie financière de livraison (GFL)",type:"CONTRACTUEL",category:"04-Documents contractuels"},
    {code:"RIB",label:"Relevé d'Identité Bancaire",type:"FINANCEMENT",category:"05-Financement"},
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
async function readApiError(res){
  try{const d=await res.json();return d.error||("HTTP "+res.status);}catch{return "HTTP "+res.status;}
}
async function apiGetDossiers(){
  const res=await fetch("/api/dossiers");
  if(!res.ok)throw new Error(await readApiError(res));
  return res.json();
}
async function apiCreateDossier(dossier){
  const res=await fetch("/api/dossiers",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(dossier)});
  if(!res.ok)throw new Error(await readApiError(res));
  return res.json();
}
async function apiUpdatePiece(id,pieceCode,newStatus){
  const res=await fetch("/api/dossier",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({id,pieceCode,newStatus})});
  if(!res.ok)throw new Error("Erreur mise à jour");
  return res.json();
}
async function apiDeleteDossier(id){
  const res=await fetch("/api/dossier?id="+encodeURIComponent(id),{method:"DELETE"});
  if(!res.ok)throw new Error("Erreur suppression");
  return res.json();
}
async function apiResetDemo(){
  const res=await fetch("/api/admin/reset-demo",{method:"POST"});
  if(!res.ok)throw new Error("Erreur nettoyage démos");
  return res.json();
}

// Upload vers Vercel Blob via /api/upload (rétention 30 jours)
async function apiUploadFile(file,dossier,pieceCode){
  return new Promise((resolve,reject)=>{
    const reader=new FileReader();
    reader.onload=async(e)=>{
      try{
        const base64=e.target.result.split(",")[1];
        const piece=(dossier.pieces||[]).find(p=>p.code===pieceCode);
        const res=await fetch("/api/upload",{
          method:"POST",
          headers:{"Content-Type":"application/json"},
          body:JSON.stringify({
            dossierId:dossier.id,
            pieceCode,
            category:piece?.category||"",
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

// ── HELPERS ───────────────────────────────────────────────────────────────
const genId=()=>Math.random().toString(36).substr(2,9);

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


// Saisie date de naissance avec 3 selects (Jour / Mois / Année)
// On garde l'état partiel en interne pour permettre la saisie progressive
function DobInput({value, onChange}){
  const [parts,setParts]=useState(()=>{
    if(value){
      const p=value.split("-");
      if(p.length===3) return {y:p[0],m:p[1],d:p[2]};
    }
    return {y:"",m:"",d:""};
  });

  const setPart=(k,v)=>{
    const next={...parts,[k]:v};
    setParts(next);
    onChange(next.y&&next.m&&next.d ? next.y+"-"+next.m+"-"+next.d : "");
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
    <select value={parts.d} onChange={e=>setPart("d",e.target.value)} style={sel}>
      <option value="">Jour</option>
      {days.map(d=><option key={d} value={d}>{d}</option>)}
    </select>
    <select value={parts.m} onChange={e=>setPart("m",e.target.value)} style={{...sel,flex:2}}>
      <option value="">Mois</option>
      {months.map(m=><option key={m.v} value={m.v}>{m.l}</option>)}
    </select>
    <select value={parts.y} onChange={e=>setPart("y",e.target.value)} style={{...sel,flex:2}}>
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

// ── CHECKLIST VIEW ────────────────────────────────────────────────────────
function ChecklistView({dossier}){
  const [pieces,setPieces]=useState(dossier.pieces);
  const [uploading,setUploading]=useState({});
  const [errors,setErrors]=useState({});
  const fileRefs=useRef({});

  const received=pieces.filter(p=>p.status!=="MANQUANT").length;
  const pct=Math.round(received/pieces.length*100);

  const handleFile=async(file,piece)=>{
    setUploading(u=>({...u,[piece.code]:true}));
    setErrors(e=>({...e,[piece.code]:null}));
    try{
      await apiUploadFile(file,{...dossier,pieces},piece.code);
      setPieces(prev=>prev.map(p=>p.code===piece.code
        ?{...p,status:"RECU",file:{name:file.name,size:file.size,uploadedAt:new Date().toISOString()}}
        :p
      ));
    }catch(e){
      setErrors(err=>({...err,[piece.code]:e.message}));
    }
    setUploading(u=>({...u,[piece.code]:false}));
  };

  const bycat=pieces.reduce((acc,p)=>{const c=p.category||"Autres";if(!acc[c])acc[c]=[];acc[c].push(p);return acc;},{});

  return <div style={{minHeight:"100vh",background:B.dark,display:"flex",flexDirection:"column"}}>
    {/* Header */}
    <div style={{background:B.surface,borderBottom:"1px solid "+B.border,padding:"12px 16px",display:"flex",alignItems:"center",gap:12,flexShrink:0}}>
      <div style={{width:40,height:40,borderRadius:12,background:"linear-gradient(135deg,"+B.blue+","+B.orange+")",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>⚡</div>
      <div style={{flex:1,minWidth:0}}>
        <div style={{color:B.text,fontWeight:700,fontSize:15}}>AXECIME</div>
        <div style={{color:B.muted,fontSize:12,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
          {DOSSIER_TYPES[dossier.type].icon} {DOSSIER_TYPES[dossier.type].label} — {dossier.prenom} {dossier.nom}
        </div>
      </div>
      <ProgressRing value={pct}/>
    </div>

    {/* Barre de progression */}
    <div style={{background:B.surface,padding:"10px 16px",borderBottom:"1px solid "+B.border}}>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
        <span style={{color:B.muted,fontSize:12}}>{received} / {pieces.length} documents reçus</span>
        <span style={{color:pct===100?"#34D399":B.orange,fontSize:12,fontWeight:700}}>{pct}%</span>
      </div>
      <div style={{background:B.border,borderRadius:4,height:5,overflow:"hidden"}}>
        <div style={{width:pct+"%",height:"100%",background:pct===100?"#34D399":B.orange,transition:"width 0.5s",borderRadius:4}}/>
      </div>
    </div>

    {/* Bannière succès */}
    {pct===100&&<div style={{background:"#1A3F2F",border:"1px solid #34D39966",margin:"16px 16px 0",borderRadius:14,padding:20,textAlign:"center"}}>
      <div style={{fontSize:36,marginBottom:8}}>🎉</div>
      <div style={{color:"#34D399",fontWeight:700,fontSize:16,marginBottom:4}}>Dossier complet !</div>
      <div style={{color:B.muted,fontSize:13}}>Merci {dossier.prenom}. Votre conseiller AXECIME vous contactera sous 24-48h.</div>
    </div>}

    {/* Catégories */}
    <div style={{flex:1,overflowY:"auto",padding:16}}>
      {Object.entries(bycat).map(([cat,catPieces])=>{
        const catDone=catPieces.filter(p=>p.status!=="MANQUANT").length;
        return <div key={cat} style={{marginBottom:20}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8,paddingBottom:6,borderBottom:"1px solid "+B.border}}>
            <span style={{fontSize:14}}>📁</span>
            <span style={{color:"#60A5FA",fontWeight:700,fontSize:13}}>{cat}</span>
            <span style={{color:catDone===catPieces.length?"#34D399":B.muted,fontSize:11,fontWeight:600}}>
              {catDone}/{catPieces.length}
            </span>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            {catPieces.map(p=>{
              const done=p.status!=="MANQUANT";
              return <div key={p.code} style={{background:B.surface,borderRadius:10,padding:"11px 14px",border:"1px solid "+(done?"#34D39933":B.border),display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,flexWrap:"wrap"}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{color:B.text,fontSize:13,fontWeight:600}}>{p.label}</div>
                  {p.file&&p.file.name&&<div style={{color:B.muted,fontSize:11,marginTop:3,display:"flex",alignItems:"center",gap:5}}>
                    <span>📄</span>
                    <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:180}}>{p.file.name}</span>
                    {p.file.size&&<span>· {(p.file.size/1024).toFixed(0)} KB</span>}
                  </div>}
                  {errors[p.code]&&<div style={{color:"#FF6B6B",fontSize:11,marginTop:3}}>❌ {errors[p.code]}</div>}
                </div>
                <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
                  <StatusBadge status={p.status}/>
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" style={{display:"none"}}
                    ref={el=>{fileRefs.current[p.code]=el;}}
                    onChange={e=>{const f=e.target.files&&e.target.files[0];if(!f)return;handleFile(f,p);e.target.value="";}}
                  />
                  <button
                    onClick={()=>fileRefs.current[p.code]&&fileRefs.current[p.code].click()}
                    disabled={!!uploading[p.code]}
                    style={{background:uploading[p.code]?B.border:done?"#1A3F2F":"linear-gradient(135deg,"+B.blue+",#0052CC)",
                      border:done?"1px solid #34D39955":"none",
                      color:uploading[p.code]?B.muted:done?"#34D399":"#fff",
                      borderRadius:8,padding:"6px 12px",fontSize:12,cursor:uploading[p.code]?"not-allowed":"pointer",fontWeight:700,whiteSpace:"nowrap"
                    }}>
                    {uploading[p.code]?"⏳ Envoi...":done?"↩ Remplacer":"📎 Envoyer"}
                  </button>
                </div>
              </div>;
            })}
          </div>
        </div>;
      })}
    </div>

    <div style={{background:B.surface,borderTop:"1px solid "+B.border,padding:"10px 16px",textAlign:"center",flexShrink:0}}>
      <div style={{color:B.muted,fontSize:11}}>🔒 Documents sauvegardés en sécurité · Rétention 30 jours · Conforme RGPD</div>
    </div>
  </div>;
}

// ── PAGE CLIENT ───────────────────────────────────────────────────────────
function ClientPage({token}){
  const payload=decodeToken(token);
  const [verified,setVerified]=useState(false);
  const [pieces,setPieces]=useState(()=>
    payload?DOSSIER_TYPES[payload.type].pieces.map(p=>({...p,status:"MANQUANT"})):[]
  );
  const [loadingPieces,setLoadingPieces]=useState(false);

  useEffect(()=>{
    if(!verified||!payload)return;
    setLoadingPieces(true);
    fetch("/api/dossier?id="+encodeURIComponent(payload.id))
      .then(r=>r.ok?r.json():null)
      .then(data=>{if(data&&data.pieces)setPieces(data.pieces);})
      .catch(()=>{})
      .finally(()=>setLoadingPieces(false));
  },[verified]);

  if(!payload)return <div style={{height:"100vh",background:B.dark,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:16,padding:24}}>
    <GlobalCSS/>
    <div style={{fontSize:56}}>⛔</div>
    <div style={{color:B.text,fontSize:20,fontWeight:700,textAlign:"center"}}>Lien invalide ou expiré</div>
    <div style={{color:B.muted,fontSize:14,textAlign:"center",maxWidth:340}}>Ce lien n'est plus valide. Contactez votre conseiller AXECIME.</div>
    <div style={{background:B.surface,borderRadius:12,padding:"12px 20px",border:"1px solid "+B.border,textAlign:"center"}}>
      <div style={{color:B.text,fontSize:14,fontWeight:600}}>axecime.com</div>
    </div>
  </div>;

  const dossier={id:payload.id,prenom:payload.prenom,nom:payload.nom,type:payload.type,pieces};

  return <div style={{background:B.dark}}>
    <GlobalCSS/>
    {!verified
      ?<DobVerification prenom={payload.prenom} dobHash={payload.dobHash} onVerified={()=>setVerified(true)}/>
      :loadingPieces
        ?<div style={{height:"100vh",display:"flex",alignItems:"center",justifyContent:"center",color:B.muted,fontSize:14}}>Chargement...</div>
        :<ChecklistView dossier={dossier}/>}
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
function Dashboard({dossiers,loading,onValidate,onNewDossier,onLogout,onRefresh,onDelete,onResetDemo}){
  const [sel,setSel]=useState(null);
  const [filter,setFilter]=useState("ALL");
  const [copied,setCopied]=useState(null);
  const [saving,setSaving]=useState(null);
  const [deleting,setDeleting]=useState(false);
  const [cleaning,setCleaning]=useState(false);
  const statColor={EN_COURS:"#60A5FA",INCOMPLET:"#FF6B6B",COMPLET:"#34D399"};
  const filtered=dossiers.filter(d=>filter==="ALL"||d.statut===filter);
  const stats={total:dossiers.length,complets:dossiers.filter(d=>d.statut==="COMPLET").length,incomplets:dossiers.filter(d=>d.statut==="INCOMPLET").length,enCours:dossiers.filter(d=>d.statut==="EN_COURS").length};
  const d=dossiers.find(x=>x.id===sel);
  const copyLink=(dos)=>{navigator.clipboard.writeText(getClientUrl(dos.token)).then(()=>{setCopied(dos.id);setTimeout(()=>setCopied(null),2000);});};
  const handlePiece=async(dossierId,pieceCode,newStatus)=>{setSaving(pieceCode);try{await onValidate(dossierId,pieceCode,newStatus);}finally{setSaving(null);}};
  const handleDelete=async(dos)=>{
    if(!window.confirm("Supprimer définitivement le dossier de "+dos.prenom+" "+dos.nom+" ?\n\nCette action est irréversible."))return;
    setDeleting(true);
    try{await onDelete(dos.id);if(sel===dos.id)setSel(null);}
    finally{setDeleting(false);}
  };
  const handleResetDemo=async()=>{
    if(!window.confirm("Supprimer tous les faux dossiers de démo (Jean Dupont, Nadège Martin, Christophe Beaumont) ?"))return;
    setCleaning(true);
    try{const r=await onResetDemo();window.alert(r.count+" dossier(s) démo supprimé(s).");}
    finally{setCleaning(false);}
  };

  return <div style={{height:"100vh",background:B.dark,display:"flex",flexDirection:"column"}}>
    <div style={{background:B.surface,borderBottom:"1px solid "+B.border,padding:"0 20px",display:"flex",alignItems:"center",height:52,flexShrink:0,gap:12}}>
      <div style={{width:30,height:30,borderRadius:8,background:"linear-gradient(135deg,"+B.blue+","+B.orange+")",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>⚡</div>
      <span style={{color:B.text,fontWeight:800,fontSize:15}}>AXECIME</span>
      <span style={{color:B.muted,fontSize:11,background:B.card,padding:"2px 8px",borderRadius:20,border:"1px solid "+B.border}}>Conseillers</span>
      <div style={{marginLeft:"auto",display:"flex",gap:8}}>
        <button onClick={onRefresh} title="Actualiser" style={{background:B.card,border:"1px solid "+B.border,color:B.muted,borderRadius:8,padding:"6px 10px",fontSize:14,cursor:"pointer"}}>🔄</button>
        <button onClick={handleResetDemo} disabled={cleaning} title="Supprimer les faux dossiers de démo"
          style={{background:B.card,border:"1px solid "+B.border,color:B.muted,borderRadius:8,padding:"6px 10px",fontSize:12,cursor:cleaning?"not-allowed":"pointer",opacity:cleaning?0.6:1}}>
          {cleaning?"...":"🧹 Nettoyer démos"}
        </button>
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
                <div style={{marginTop:6,color:B.muted,fontSize:11,fontFamily:"'Space Mono',monospace"}}>
                  📁 dossiers/{d.id}
                </div>
              </div>
              <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
                <ProgressRing value={Math.round((d.pieces.filter(p=>p.status!=="MANQUANT").length/d.pieces.length)*100)} size={64}/>
                <div style={{color:B.muted,fontSize:11}}>Complétion</div>
              </div>
            </div>

            <div style={{background:"#1A2F3F22",border:"1px solid "+B.blue+"44",borderRadius:10,padding:"10px 14px",marginBottom:16,display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
              <span>📦</span>
              <div style={{color:"#60A5FA",fontSize:12,flex:1,minWidth:200}}><strong>Stockage interne</strong> — Rétention automatique : 30 jours après upload</div>
              <a href={"/api/dossier-zip?id="+d.id} download
                style={{background:"linear-gradient(135deg,"+B.blue+",#0052CC)",color:"#fff",borderRadius:8,padding:"6px 12px",fontSize:12,textDecoration:"none",fontWeight:700,whiteSpace:"nowrap"}}>
                📥 Télécharger ZIP
              </a>
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
              <div style={{color:B.muted,fontSize:11,marginTop:8}}>⏳ Lien valable 30 jours · 🔐 Protégé par date de naissance · 📦 Stockage interne</div>
            </div>

            <div style={{color:B.text,fontWeight:700,fontSize:15,marginBottom:10}}>Pièces justificatives</div>
            {(()=>{
              const bycat=d.pieces.reduce((acc,p)=>{const c=p.category||"Autres";if(!acc[c])acc[c]=[];acc[c].push(p);return acc;},{});
              return Object.entries(bycat).map(([cat,catPieces])=>(
                <div key={cat} style={{marginBottom:16}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6,paddingBottom:6,borderBottom:"1px solid "+B.border}}>
                    <span style={{fontSize:13}}>📁</span>
                    <span style={{color:"#60A5FA",fontSize:12,fontWeight:700,letterSpacing:0.5}}>{cat}</span>
                    <span style={{color:B.muted,fontSize:11}}>({catPieces.filter(p=>p.status!=="MANQUANT").length}/{catPieces.length} reçues)</span>
                  </div>
                  <div style={{display:"flex",flexDirection:"column",gap:5,marginBottom:4}}>
                    {catPieces.map(p=>(
                      <div key={p.code} style={{background:B.surface,borderRadius:10,padding:"10px 14px",border:"1px solid "+B.border,display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8,marginLeft:18}}>
                        <div>
                          <div style={{color:B.text,fontSize:13,fontWeight:600}}>{p.label}</div>
                          <div style={{color:B.muted,fontSize:10,fontFamily:"'Space Mono',monospace",marginTop:2}}>{p.code}</div>
                          {p.file&&p.file.url&&<div style={{color:B.muted,fontSize:11,marginTop:4}}>
                            📄 {p.file.name} · {(p.file.size/1024).toFixed(1)} KB
                            {p.file.uploadedAt&&<span style={{marginLeft:6}}>· reçu le {new Date(p.file.uploadedAt).toLocaleDateString("fr-FR")}</span>}
                          </div>}
                        </div>
                        <div style={{display:"flex",gap:6,alignItems:"center"}}>
                          <StatusBadge status={p.status}/>
                          {p.file&&p.file.url&&<a href={p.file.url} target="_blank" rel="noreferrer" download
                            style={{background:B.blue+"22",border:"1px solid "+B.blue+"55",color:"#60A5FA",borderRadius:8,padding:"4px 10px",fontSize:12,fontWeight:700,textDecoration:"none"}}>
                            📥 Voir
                          </a>}
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
                </div>
              ));
            })()}

            <div style={{background:B.surface,borderRadius:14,padding:14,border:"1px solid "+B.border}}>
              <div style={{color:B.text,fontWeight:600,fontSize:13,marginBottom:10}}>Actions rapides</div>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                {[{l:"📧 Relance email",c:B.blue},{l:"💬 Relance WhatsApp",c:"#25D366"},{l:"📞 Appeler",c:B.orange}].map(btn=>(
                  <button key={btn.l} style={{background:btn.c+"22",border:"1px solid "+btn.c+"55",color:btn.c,borderRadius:10,padding:"7px 12px",fontSize:12,cursor:"pointer",fontWeight:600}}>{btn.l}</button>
                ))}
                <button onClick={()=>handleDelete(d)} disabled={deleting}
                  style={{background:"#FF6B6B22",border:"1px solid #FF6B6B55",color:"#FF6B6B",borderRadius:10,padding:"7px 12px",fontSize:12,cursor:deleting?"not-allowed":"pointer",fontWeight:600,marginLeft:"auto",opacity:deleting?0.6:1}}>
                  {deleting?"Suppression...":"🗑️ Supprimer ce dossier"}
                </button>
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

      <div style={{background:B.blue+"18",border:"1px solid "+B.blue+"44",borderRadius:10,padding:"10px 14px",marginBottom:16}}>
        <div style={{color:"#60A5FA",fontSize:12}}>🔐 Date de naissance = vérification client · 📦 Stockage interne · ⏳ Rétention 30 jours</div>
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
  const [apiError,setApiError]=useState(null);

  const loadDossiers=useCallback(async()=>{
    setLoadingData(true);setApiError(null);
    try{const data=await apiGetDossiers();setDossiers(data);}
    catch(e){console.error("Erreur chargement:",e);setApiError("Chargement des dossiers : "+e.message);}
    finally{setLoadingData(false);}
  },[]);

  const clientMatch=route.match(/#\/client\/(.+)/);
  const isClient=!!clientMatch;

  // Tous les hooks AVANT les early returns (Rules of Hooks)
  useEffect(()=>{
    if(!isClient&&auth)loadDossiers();
  },[isClient,auth,loadDossiers]);

  if(clientMatch)return <ClientPage token={clientMatch[1]}/>;
  if(!auth)return <LoginPage onLogin={()=>setAuth(true)}/>;

  const handleValidate=async(dossierId,pieceCode,newStatus)=>{
    try{
      const updated=await apiUpdatePiece(dossierId,pieceCode,newStatus);
      setDossiers(prev=>prev.map(d=>d.id===dossierId?updated:d));
    }catch(e){console.error("Erreur mise à jour:",e);setApiError("Mise à jour pièce : "+e.message);}
  };

  const handleCreate=async(form)=>{
    setSavingNew(true);setApiError(null);
    try{
      const newD={id:"dos-"+genId(),...form,statut:"EN_COURS",
        pieces:DOSSIER_TYPES[form.type].pieces.map(p=>({...p,status:"MANQUANT"}))};
      newD.token=generateToken(newD);
      const saved=await apiCreateDossier(newD);
      setDossiers(prev=>[saved,...prev]);
      setShowNew(false);
    }catch(e){
      console.error("Erreur création:",e);
      setApiError("Création dossier : "+e.message);
      window.alert("Impossible de créer le dossier :\n\n"+e.message+"\n\nVérifie /api/health pour diagnostiquer.");
    }
    finally{setSavingNew(false);}
  };

  const handleDelete=async(id)=>{
    try{
      await apiDeleteDossier(id);
      setDossiers(prev=>prev.filter(d=>d.id!==id));
    }catch(e){console.error("Erreur suppression:",e);window.alert("Erreur : "+e.message);}
  };

  const handleResetDemo=async()=>{
    try{
      const r=await apiResetDemo();
      await loadDossiers();
      return r;
    }catch(e){console.error("Erreur reset démo:",e);window.alert("Erreur : "+e.message);return{count:0};}
  };

  return <>
    <GlobalCSS/>
    {apiError&&<div style={{position:"fixed",top:0,left:0,right:0,zIndex:2000,background:"#3F1A1A",borderBottom:"1px solid #FF6B6B",color:"#FF6B6B",padding:"10px 16px",fontSize:13,display:"flex",alignItems:"center",gap:12}}>
      <span style={{fontSize:18}}>⚠️</span>
      <div style={{flex:1}}>
        <strong>Erreur API :</strong> {apiError}
        <a href="/api/health" target="_blank" rel="noreferrer" style={{color:"#60A5FA",marginLeft:12,textDecoration:"underline"}}>Diagnostic /api/health</a>
      </div>
      <button onClick={()=>setApiError(null)} style={{background:"transparent",border:"none",color:"#FF6B6B",fontSize:18,cursor:"pointer"}}>×</button>
    </div>}
    <Dashboard dossiers={dossiers} loading={loadingData}
      onValidate={handleValidate}
      onNewDossier={()=>setShowNew(true)}
      onLogout={()=>{sessionStorage.removeItem("axecime_auth");setAuth(false);}}
      onRefresh={loadDossiers}
      onDelete={handleDelete}
      onResetDemo={handleResetDemo}/>
    {showNew&&<NewDossierModal onClose={()=>setShowNew(false)} onCreate={handleCreate} saving={savingNew}/>}
  </>;
}
