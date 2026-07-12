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

const config = require("./config");
const { handleMessage } = require("./handler");

async function start() {
  const { state, saveCreds } = await useMultiFileAuthState(config.sessionDir);
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
      else console.log("Logged out. Delete auth_session/ and restart to re-pair.");
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
