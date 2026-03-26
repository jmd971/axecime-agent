// api/upload.js — Upload de fichiers vers SharePoint via Microsoft Graph API

const TENANT_ID = process.env.AZURE_TENANT_ID;
const CLIENT_ID = process.env.AZURE_CLIENT_ID;
const CLIENT_SECRET = process.env.AZURE_CLIENT_SECRET;
const SHAREPOINT_HOST = "axecime971.sharepoint.com";
const SHAREPOINT_SITE_PATH = "/sites/Exchangeplatform";

// Obtenir un token d'accès Microsoft Graph
async function getAccessToken() {
  const url = `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`;
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
  if (!data.access_token) {
    throw new Error("Token Azure échoué : " + JSON.stringify(data));
  }
  return data.access_token;
}

// Obtenir l'ID du site SharePoint
async function getSiteId(token) {
  const url = `https://graph.microsoft.com/v1.0/sites/${SHAREPOINT_HOST}:${SHAREPOINT_SITE_PATH}`;
  const res = await fetch(url, {
    headers: { Authorization: "Bearer " + token },
  });
  const data = await res.json();
  if (!data.id) throw new Error("Site SharePoint introuvable : " + JSON.stringify(data));
  return data.id;
}

// Obtenir ou créer le dossier du dossier client dans SharePoint
async function getOrCreateFolder(token, siteId, folderPath) {
  // Chercher la bibliothèque "Documents" (drive racine)
  const driveRes = await fetch(
    `https://graph.microsoft.com/v1.0/sites/${siteId}/drive`,
    { headers: { Authorization: "Bearer " + token } }
  );
  const drive = await driveRes.json();
  const driveId = drive.id;

  // Créer le dossier Dossiers-Clients s'il n'existe pas
  const rootFolder = "Dossiers-Clients";
  await fetch(
    `https://graph.microsoft.com/v1.0/drives/${driveId}/root/children`,
    {
      method: "POST",
      headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
      body: JSON.stringify({
        name: rootFolder,
        folder: {},
        "@microsoft.graph.conflictBehavior": "rename",
      }),
    }
  );

  // Créer le sous-dossier client
  await fetch(
    `https://graph.microsoft.com/v1.0/drives/${driveId}/root:/${rootFolder}:/children`,
    {
      method: "POST",
      headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
      body: JSON.stringify({
        name: folderPath,
        folder: {},
        "@microsoft.graph.conflictBehavior": "rename",
      }),
    }
  );

  return { driveId, rootFolder };
}

// Upload du fichier dans SharePoint
async function uploadFile(token, siteId, folderPath, fileName, fileBuffer, mimeType) {
  const { driveId, rootFolder } = await getOrCreateFolder(token, siteId, folderPath);

  // Nettoyer le nom de fichier
  const cleanName = fileName.replace(/[^a-zA-Z0-9._\-\u00C0-\u024F ]/g, "_");
  const uploadPath = `${rootFolder}/${folderPath}/${cleanName}`;

  const uploadRes = await fetch(
    `https://graph.microsoft.com/v1.0/drives/${driveId}/root:/${uploadPath}:/content`,
    {
      method: "PUT",
      headers: {
        Authorization: "Bearer " + token,
        "Content-Type": mimeType || "application/octet-stream",
      },
      body: fileBuffer,
    }
  );

  const uploadData = await uploadRes.json();
  if (!uploadData.id) throw new Error("Upload échoué : " + JSON.stringify(uploadData));

  return {
    fileId: uploadData.id,
    fileName: uploadData.name,
    webUrl: uploadData.webUrl,
    size: uploadData.size,
  };
}

// Handler principal
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Méthode non autorisée" });

  try {
    const { dossierId, nomClient, pieceCode, fileName, fileBase64, mimeType } = req.body;

    if (!dossierId || !fileName || !fileBase64) {
      return res.status(400).json({ error: "Paramètres manquants : dossierId, fileName, fileBase64 requis" });
    }

    // Décoder le fichier base64
    const fileBuffer = Buffer.from(fileBase64, "base64");

    // Nom du dossier client dans SharePoint : NOM-id
    const folderName = (nomClient || "Client").replace(/[^a-zA-Z0-9\u00C0-\u024F ]/g, "-") + "-" + dossierId.slice(-6);

    // Nom du fichier avec code pièce
    const ext = fileName.split(".").pop();
    const cleanFileName = pieceCode
      ? `${pieceCode}_${fileName.replace(/[^a-zA-Z0-9._\-\u00C0-\u024F]/g, "_")}`
      : fileName;

    // Auth + upload
    const token = await getAccessToken();
    const siteId = await getSiteId(token);
    const result = await uploadFile(token, siteId, folderName, cleanFileName, fileBuffer, mimeType);

    return res.status(200).json({
      success: true,
      ...result,
      message: `Fichier "${result.fileName}" déposé dans SharePoint`,
    });

  } catch (err) {
    console.error("Erreur upload SharePoint:", err);
    return res.status(500).json({ error: "Erreur upload : " + err.message });
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "20mb",
    },
  },
};
