/**
 * Message handler: matches incoming text against commands.js
 * and sends the configured auto-reply.
 */
const config = require("./config");
const commands = require("./commands");

function extractText(message) {
  if (!message) return "";
  return (
    message.conversation ||
    message.extendedTextMessage?.text ||
    message.imageMessage?.caption ||
    message.videoMessage?.caption ||
    message.buttonsResponseMessage?.selectedButtonId ||
    message.listResponseMessage?.singleSelectReply?.selectedRowId ||
    ""
  );
}

function normalize(str) {
  return config.caseSensitive ? String(str) : String(str).toLowerCase();
}

function matches(text, trigger) {
  const a = normalize(text).trim();
  const b = normalize(trigger).trim();
  if (!a || !b) return false;
  switch (config.matchMode) {
    case "contains":
      return a.includes(b);
    case "startsWith":
      return a.startsWith(b);
    case "exact":
    default:
      return a === b;
  }
}

async function handleMessage(sock, msg) {
  try {
    if (!msg.message || msg.key.fromMe) return;

    const from = msg.key.remoteJid;
    if (!from) return;

    const isGroup = from.endsWith("@g.us");
    if (isGroup && !config.replyInGroups) return;

    const text = extractText(msg.message);
    if (!text) return;

    // Optional: require @mention in groups
    if (isGroup && config.requireMentionInGroups) {
      const botId = sock.user?.id?.split(":")[0];
      const mentions =
        msg.message.extendedTextMessage?.contextInfo?.mentionedJid || [];
      const mentioned = botId && mentions.some((j) => j.startsWith(botId));
      if (!mentioned) return;
    }

    const hit = commands.find((c) => matches(text, c.trigger));
    if (!hit) return;

    const ctx = {
      sender: msg.key.participant || from,
      pushName: msg.pushName || "",
      text,
    };

    const replyText =
      typeof hit.reply === "function" ? hit.reply(ctx) : hit.reply;
    if (!replyText) return;

    if (config.simulateTyping) {
      await sock.presenceSubscribe(from).catch(() => {});
      await sock.sendPresenceUpdate("composing", from).catch(() => {});
      await new Promise((r) => setTimeout(r, 600));
      await sock.sendPresenceUpdate("paused", from).catch(() => {});
    }

    await sock.sendMessage(from, { text: replyText }, { quoted: msg });
  } catch (err) {
    console.error("handleMessage error:", err);
  }
}

module.exports = { handleMessage };
