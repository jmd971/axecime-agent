// api/upload.js — Upload vers SharePoint (CommonJS)
// Dossier : NOM_PRENOM_TYPE-DOSSIER

const TENANT_ID = process.env.AZURE_TENANT_ID;
const CLIENT_ID = process.env.AZURE_CLIENT_ID;
const CLIENT_SECRET = process.env.AZURE_CLIENT_SECRET;
const SHAREPOINT_HOST = "axecime971.sharepoint.com";
const SHAREPOINT_SITE_PATH = "/sites/Exchangeplatform";

function slugify(str) {
  return (str || "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // supprimer accents
    .replace(/[^a-zA-Z0-9\s_-]/g, "")
    .trim()
    .replace(/\s+/g, "_")
    .toUpperCase();
}

async function getAccessToken() {
  const url = "https://login.microsoftonline.com/" + TENANT_ID + "/oauth2/v2.0/token";
  const params = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    scope: "https://graph.microsoft.com/.default",
  });
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
  const data = await res.json();
  if (!data.access_token) throw new Error("Token Azure échoué : " + JSON.stringify(data));
  return data.access_token;
}

async function getSiteAndDrive(token) {
  // Récupérer le site
  const siteRes = await fetch(
    "https://graph.microsoft.com/v1.0/sites/" + SHAREPOINT_HOST + ":" + SHAREPOINT_SITE_PATH,
    { headers: { Authorization: "Bearer " + token } }
  );
  const site = await siteRes.json();
  if (!site.id) throw new Error("Site introuvable : " + JSON.stringify(site));

  // Récupérer le drive
  const driveRes = await fetch(
    "https://graph.microsoft.com/v1.0/sites/" + site.id + "/drive",
    { headers: { Authorization: "Bearer " + token } }
  );
  const drive = await driveRes.json();
  if (!drive.id) throw new Error("Drive introuvable : " + JSON.stringify(drive));

  return { siteId: site.id, driveId: drive.id };
}

async function ensureFolder(token, driveId, folderPath) {
  // Créer le dossier (et les parents) via PUT avec conflictBehavior replace
  const segments = folderPath.split("/").filter(Boolean);
  let currentPath = "";
  for (const segment of segments) {
    const parentPath = currentPath || "root";
    const url = currentPath
      ? "https://graph.microsoft.com/v1.0/drives/" + driveId + "/root:/" + currentPath + ":/children"
      : "https://graph.microsoft.com/v1.0/drives/" + driveId + "/root/children";

    await fetch(url, {
      method: "POST",
      headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
      body: JSON.stringify({
        name: segment,
        folder: {},
        "@microsoft.graph.conflictBehavior": "ignore",
      }),
    });
    currentPath = currentPath ? currentPath + "/" + segment : segment;
  }
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Méthode non autorisée" });

  try {
    const { dossierId, prenom, nom, typeDossier, pieceCode, fileName, fileBase64, mimeType } = req.body;

    if (!dossierId || !fileName || !fileBase64) {
      return res.status(400).json({ error: "Paramètres manquants : dossierId, fileName, fileBase64 requis" });
    }

    // Nom du dossier : NOM_PRENOM_TYPE-DOSSIER
    const nomSlug = slugify(nom || "CLIENT");
    const prenomSlug = slugify(prenom || "");
    const typeSlug = slugify(typeDossier || "DOSSIER");
    const folderName = nomSlug + "_" + prenomSlug + "_" + typeSlug;
    const fullPath = "Dossiers-Clients/" + folderName;

    // Nom du fichier avec code pièce
    const ext = fileName.split(".").pop().toLowerCase();
    const safeFileName = (pieceCode ? pieceCode + "_" : "") +
      slugify(fileName.replace(/\.[^.]+$/, "")) + "." + ext;

    // Décoder base64
    const fileBuffer = Buffer.from(fileBase64, "base64");

    // Auth + IDs
    const token = await getAccessToken();
    const { driveId } = await getSiteAndDrive(token);

    // Créer les dossiers
    await ensureFolder(token, driveId, "Dossiers-Clients");
    await ensureFolder(token, driveId, fullPath);

    // Upload fichier
    const uploadUrl = "https://graph.microsoft.com/v1.0/drives/" + driveId +
      "/root:/" + fullPath + "/" + safeFileName + ":/content";

    const uploadRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        Authorization: "Bearer " + token,
        "Content-Type": mimeType || "application/octet-stream",
      },
      body: fileBuffer,
    });

    const uploadData = await uploadRes.json();

    if (!uploadData.id) {
      throw new Error("Upload échoué : " + JSON.stringify(uploadData));
    }

    return res.status(200).json({
      success: true,
      fileId: uploadData.id,
      fileName: uploadData.name,
      webUrl: uploadData.webUrl,
      folderPath: fullPath,
      message: "Fichier déposé dans " + fullPath,
    });

  } catch (err) {
    console.error("Erreur upload SharePoint:", err.message);
    return res.status(500).json({ error: err.message });
  }
};

module.exports.config = {
  api: { bodyParser: { sizeLimit: "20mb" } },
};
