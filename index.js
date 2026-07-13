/**
 * WhatsApp Auto-Reply Bot - Entry Point
 * Built on Baileys. Edit commands.js to change replies.
 */
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
} = require("@whiskeysockets/baileys");
const P = require("pino");
const qrcode = require("qrcode-terminal");
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const config = require("./config");
const { handleMessage } = require("./handler");

/**
 * If config.sessionID is set (format "<sessionPrefix>!<base64-gzipped-creds>"),
 * decode it and write creds.json into the session folder so we can skip QR pairing.
 */
function restoreSessionFromString() {
  const sessionFolder = `./${config.sessionName || "session"}`;
  const sessionFile = path.join(sessionFolder, "creds.json");
  const raw = config.sessionID;

  if (!raw || typeof raw !== "string") return sessionFolder;

  const prefix = config.sessionPrefix || "AutoBot";
  if (!raw.startsWith(prefix + "!")) {
    console.log(
      `📡 Session: ignoring sessionID (expected prefix "${prefix}!"). Falling back to QR.`
    );
    return sessionFolder;
  }

  try {
    const b64 = raw.slice(prefix.length + 1).replace(/\.\.\./g, "");
    const compressed = Buffer.from(b64, "base64");
    const decompressed = zlib.gunzipSync(compressed);

    if (!fs.existsSync(sessionFolder)) {
      fs.mkdirSync(sessionFolder, { recursive: true });
    }
    fs.writeFileSync(sessionFile, decompressed, "utf8");
    console.log("📡 Session: 🔑 Restored from sessionID string");
  } catch (e) {
    console.error("📡 Session: ❌ Failed to restore sessionID:", e.message);
    console.log("Falling back to QR login.");
  }

  return sessionFolder;
}

const store = require("./store");
const productsStore = require("./productsStore");

async function start() {
  const sessionFolder = restoreSessionFromString();

  // Load auto-reply rules from Google Drive before connecting.
  try {
    await store.init();
  } catch (e) {
    console.error("Failed to init rule store:", e.message);
  }

  const { state, saveCreds } = await useMultiFileAuthState(sessionFolder);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: state,
    logger: P({ level: "silent" }),
    printQRInTerminal: false,
    browser: [config.botName, "Chrome", "1.0.0"],
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log("\nScan this QR code with WhatsApp > Linked Devices:\n");
      qrcode.generate(qr, { small: true });
    }

    if (connection === "open") {
      console.log(`${config.botName} connected as ${sock.user?.id}`);
    }

    if (connection === "close") {
      const code = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = code !== DisconnectReason.loggedOut;
      console.log(
        `Connection closed (code=${code}). Reconnecting: ${shouldReconnect}`
      );
      if (shouldReconnect) start();
      else
        console.log(
          `Logged out. Delete ${config.sessionName}/ and restart to re-pair.`
        );
    }
  });

  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return;
    for (const msg of messages) {
      await handleMessage(sock, msg);
    }
  });
}

start().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
