// api/upload.js — Upload vers SharePoint via Microsoft Graph API (CommonJS)

const TENANT_ID = process.env.AZURE_TENANT_ID;
const CLIENT_ID = process.env.AZURE_CLIENT_ID;
const CLIENT_SECRET = process.env.AZURE_CLIENT_SECRET;
const SHAREPOINT_HOST = "axecime971.sharepoint.com";
const SHAREPOINT_SITE_PATH = "/sites/Exchangeplatform";

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
  if (!data.access_token) {
    throw new Error("Token Azure échoué : " + JSON.stringify(data));
  }
  return data.access_token;
}

async function getSiteId(token) {
  const url = "https://graph.microsoft.com/v1.0/sites/" + SHAREPOINT_HOST + ":" + SHAREPOINT_SITE_PATH;
  const res = await fetch(url, {
    headers: { Authorization: "Bearer " + token },
  });
  const data = await res.json();
  if (!data.id) throw new Error("Site SharePoint introuvable : " + JSON.stringify(data));
  return data.id;
}

async function getDriveId(token, siteId) {
  const res = await fetch(
    "https://graph.microsoft.com/v1.0/sites/" + siteId + "/drive",
    { headers: { Authorization: "Bearer " + token } }
  );
  const data = await res.json();
  if (!data.id) throw new Error("Drive introuvable");
  return data.id;
}

async function createFolder(token, driveId, parentPath, folderName) {
  const url = "https://graph.microsoft.com/v1.0/drives/" + driveId + "/root:/" + parentPath + ":/children";
  await fetch(url, {
    method: "POST",
    headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
    body: JSON.stringify({
      name: folderName,
      folder: {},
      "@microsoft.graph.conflictBehavior": "rename",
    }),
  });
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Méthode non autorisée" });

  try {
    const { dossierId, nomClient, pieceCode, fileName, fileBase64, mimeType } = req.body;

    if (!dossierId || !fileName || !fileBase64) {
      return res.status(400).json({ error: "Paramètres manquants" });
    }

    // Décoder le base64
    const fileBuffer = Buffer.from(fileBase64, "base64");

    // Nom du dossier client : NOM-id6chars
    const safeName = (nomClient || "Client").replace(/[^a-zA-Z0-9\u00C0-\u024F ]/g, "-");
    const folderName = safeName + "-" + dossierId.slice(-6);

    // Nom du fichier avec code pièce
    const safeFileName = (pieceCode ? pieceCode + "_" : "") + fileName.replace(/[^a-zA-Z0-9._\-\u00C0-\u024F]/g, "_");

    // Auth
    const token = await getAccessToken();
    const siteId = await getSiteId(token);
    const driveId = await getDriveId(token, siteId);

    // Créer dossier racine Dossiers-Clients
    await createFolder(token, driveId, "", "Dossiers-Clients");

    // Créer sous-dossier client
    await createFolder(token, driveId, "Dossiers-Clients", folderName);

    // Upload du fichier
    const uploadPath = "Dossiers-Clients/" + folderName + "/" + safeFileName;
    const uploadUrl = "https://graph.microsoft.com/v1.0/drives/" + driveId + "/root:/" + uploadPath + ":/content";

    const uploadRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        Authorization: "Bearer " + token,
        "Content-Type": mimeType || "application/octet-stream",
        "Content-Length": fileBuffer.length.toString(),
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
      size: uploadData.size,
      message: "Fichier déposé dans SharePoint",
    });

  } catch (err) {
    console.error("Erreur upload SharePoint:", err.message);
    return res.status(500).json({ error: "Erreur upload : " + err.message });
  }
};

module.exports.config = {
  api: { bodyParser: { sizeLimit: "20mb" } },
};
