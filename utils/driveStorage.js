/**
 * Google Drive storage for auto-reply rules.
 *
 * Reuses the same token endpoint as KnightBot-Mini so the same Google Drive
 * account is used. Rules are stored as a plain-text file whose name is set
 * in config.driveFileName. On first save, the file is created in Drive root;
 * on subsequent runs it is looked up by name.
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

// ==================== TOKEN ====================
async function getAccessToken() {
  try {
    if (cachedToken && tokenExpiry && new Date() < tokenExpiry) {
      return cachedToken;
    }

    console.log("[DRIVE] Fetching Google Drive token...");
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
      console.log("[DRIVE] Token expired, refreshing...");
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
    console.error("[DRIVE] Failed to get token:", err.message);
    return null;
  }
}

// ==================== FILE LOOKUP ====================
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
    console.error("[DRIVE] Lookup failed:", err.message);
  }
  return null;
}

// ==================== SERIALIZATION ====================
function rulesToText(rulesObj) {
  let out = "# AutoReplyBot Rules\n";
  out += "# Format: TRIGGER | REPLY   (use \\n for newlines inside REPLY)\n";
  out += `# Last updated: ${new Date().toISOString()}\n\n`;
  for (const [trigger, reply] of Object.entries(rulesObj)) {
    const safeTrigger = String(trigger).replace(/\r?\n/g, " ").trim();
    const safeReply = String(reply).replace(/\r?\n/g, "\\n");
    if (safeTrigger) out += `${safeTrigger} | ${safeReply}\n`;
  }
  return out;
}

function textToRules(text) {
  const rules = {};
  for (const line of String(text).split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const idx = t.indexOf("|");
    if (idx === -1) continue;
    const trigger = t.slice(0, idx).trim();
    const reply = t
      .slice(idx + 1)
      .trim()
      .replace(/\\n/g, "\n");
    if (trigger && reply) rules[trigger] = reply;
  }
  return rules;
}

// ==================== PUBLIC API ====================
async function loadRules() {
  const token = await getAccessToken();
  if (!token) return null;

  const fileName = config.driveFileName || "autoreply_bot_rules.txt";
  const fileId = await findFileIdByName(token, fileName);
  if (!fileId) {
    console.log(`[DRIVE] "${fileName}" not found in Drive yet.`);
    return {};
  }

  try {
    const res = await axios.get(`${FILES_URL}/${fileId}?alt=media`, {
      headers: { Authorization: `Bearer ${token}` },
      responseType: "text",
      transformResponse: [(d) => d],
      timeout: 30000,
    });
    const rules = textToRules(res.data);
    console.log(`[DRIVE] Loaded ${Object.keys(rules).length} rules from Drive`);
    return rules;
  } catch (err) {
    console.error("[DRIVE] Failed to read rules:", err.message);
    return {};
  }
}

async function saveRules(rulesObj) {
  const token = await getAccessToken();
  if (!token) return false;

  const fileName = config.driveFileName || "autoreply_bot_rules.txt";
  const body = Buffer.from(rulesToText(rulesObj), "utf8");
  let fileId = await findFileIdByName(token, fileName);

  try {
    if (fileId) {
      await axios.patch(
        `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
        body,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "text/plain",
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
          mimeType: "text/plain",
          parents: ["root"],
        }),
        { contentType: "application/json" }
      );
      form.append("file", body, {
        filename: fileName,
        contentType: "text/plain",
      });
      const res = await axios.post(UPLOAD_URL_MULTIPART, form, {
        headers: {
          Authorization: `Bearer ${token}`,
          ...form.getHeaders(),
        },
        timeout: 30000,
      });
      cachedFileId = res.data.id;
      console.log(`[DRIVE] Created "${fileName}" (id=${cachedFileId})`);
    }
    console.log("[DRIVE] Rules saved");
    return true;
  } catch (err) {
    console.error("[DRIVE] Failed to save rules:", err.message);
    return false;
  }
}

module.exports = { loadRules, saveRules };
