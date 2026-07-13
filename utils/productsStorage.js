/**
 * Google Drive storage for products.
 *
 * Reuses the same Google Drive account as driveStorage.js (same token
 * endpoint). Products are stored as a JSON file so we can keep structured
 * fields (id, name, price, description).
 */

const axios = require("axios");
const fs = require("fs");
const path = require("path");
const FormData = require("form-data");
const config = require("../config");

const TOKEN_URL =
  "https://drive.usercontent.google.com/download?id=1NZ3NvyVBnK85S8f5eTZJS5uM5c59xvGM&export=download";
const UPLOAD_URL_MULTIPART =
  "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart";
const FILES_URL = "https://www.googleapis.com/drive/v3/files";

let cachedToken = null;
let tokenExpiry = null;
let cachedFileId = null;

async function getAccessToken() {
  try {
    if (cachedToken && tokenExpiry && new Date() < tokenExpiry) {
      return cachedToken;
    }

    const tokenResponse = await axios({
      method: "GET",
      url: TOKEN_URL,
      responseType: "stream",
      timeout: 30000,
    });

    const tempTokenFile = path.join(
      process.cwd(),
      "temp",
      `token_${Date.now()}.json`
    );
    const tokenDir = path.dirname(tempTokenFile);
    if (!fs.existsSync(tokenDir)) fs.mkdirSync(tokenDir, { recursive: true });

    const writer = fs.createWriteStream(tempTokenFile);
    tokenResponse.data.pipe(writer);
    await new Promise((resolve, reject) => {
      writer.on("finish", resolve);
      writer.on("error", reject);
    });

    const tokenData = JSON.parse(fs.readFileSync(tempTokenFile, "utf8"));
    fs.unlinkSync(tempTokenFile);

    const expiryDate = new Date(tokenData.expiry);
    if (new Date() > expiryDate) {
      const refresh = await axios.post(tokenData.token_uri, {
        client_id: tokenData.client_id,
        client_secret: tokenData.client_secret,
        refresh_token: tokenData.refresh_token,
        grant_type: "refresh_token",
      });
      cachedToken = refresh.data.access_token;
      tokenExpiry = new Date(Date.now() + 3600 * 1000);
    } else {
      cachedToken = tokenData.token;
      tokenExpiry = expiryDate;
    }

    return cachedToken;
  } catch (err) {
    console.error("[DRIVE-PRODUCTS] Failed to get token:", err.message);
    return null;
  }
}

async function findFileIdByName(token, name) {
  if (cachedFileId) return cachedFileId;
  try {
    const res = await axios.get(FILES_URL, {
      headers: { Authorization: `Bearer ${token}` },
      params: {
        q: `name='${name}' and trashed=false`,
        fields: "files(id,name)",
        spaces: "drive",
      },
      timeout: 30000,
    });
    const file = res.data.files && res.data.files[0];
    if (file) {
      cachedFileId = file.id;
      return file.id;
    }
  } catch (err) {
    console.error("[DRIVE-PRODUCTS] Lookup failed:", err.message);
  }
  return null;
}

async function loadProducts() {
  const token = await getAccessToken();
  if (!token) return null;

  const fileName = config.productsFileName || "autoreply_bot_products.json";
  const fileId = await findFileIdByName(token, fileName);
  if (!fileId) {
    console.log(`[DRIVE-PRODUCTS] "${fileName}" not found in Drive yet.`);
    return [];
  }

  try {
    const res = await axios.get(`${FILES_URL}/${fileId}?alt=media`, {
      headers: { Authorization: `Bearer ${token}` },
      responseType: "text",
      transformResponse: [(d) => d],
      timeout: 30000,
    });
    const data = JSON.parse(res.data);
    const arr = Array.isArray(data) ? data : [];
    console.log(`[DRIVE-PRODUCTS] Loaded ${arr.length} products from Drive`);
    return arr;
  } catch (err) {
    console.error("[DRIVE-PRODUCTS] Failed to read products:", err.message);
    return [];
  }
}

async function saveProducts(productsArr) {
  const token = await getAccessToken();
  if (!token) return false;

  const fileName = config.productsFileName || "autoreply_bot_products.json";
  const body = Buffer.from(JSON.stringify(productsArr, null, 2), "utf8");
  let fileId = await findFileIdByName(token, fileName);

  try {
    if (fileId) {
      await axios.patch(
        `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
        body,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          timeout: 30000,
        }
      );
    } else {
      const form = new FormData();
      form.append(
        "metadata",
        JSON.stringify({
          name: fileName,
          mimeType: "application/json",
          parents: ["root"],
        }),
        { contentType: "application/json" }
      );
      form.append("file", body, {
        filename: fileName,
        contentType: "application/json",
      });
      const res = await axios.post(UPLOAD_URL_MULTIPART, form, {
        headers: {
          Authorization: `Bearer ${token}`,
          ...form.getHeaders(),
        },
        timeout: 30000,
      });
      cachedFileId = res.data.id;
      console.log(`[DRIVE-PRODUCTS] Created "${fileName}" (id=${cachedFileId})`);
    }
    console.log("[DRIVE-PRODUCTS] Products saved");
    return true;
  } catch (err) {
    console.error("[DRIVE-PRODUCTS] Failed to save products:", err.message);
    return false;
  }
}

module.exports = { loadProducts, saveProducts };
