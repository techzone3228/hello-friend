/**
 * Message handler.
 *
 * - Owner commands (only replies to the owner number) let you manage rules
 *   at runtime. All changes are persisted to Google Drive via store.js.
 *     !setreply <trigger> | <reply>
 *     !delreply <trigger>
 *     !listreplies
 *     !clearreplies
 *     !replyhelp
 *
 * - Any other incoming message is matched against the store's rules
 *   (loaded from Drive at startup) and the configured reply is sent back.
 */

const config = require("./config");
const store = require("./store");
const products = require("./productsStore");

const PRODUCT_ROW_PREFIX = "product:";

function formatPrice(price) {
  const cur = config.productsCurrency || "";
  return cur ? `${cur} ${price}` : String(price);
}

async function sendProductsMenu(sock, msg, from) {
  const items = products.list();
  if (items.length === 0) {
    await sock.sendMessage(
      from,
      { text: "No products available yet." },
      { quoted: msg }
    );
    return;
  }

  const rows = items.slice(0, 10).map((p) => ({
    title: p.name,
    rowId: `${PRODUCT_ROW_PREFIX}${p.id}`,
    description: formatPrice(p.price),
  }));

  const listMsg = {
    text: config.productsMenuBody || "Select a product:",
    footer: config.productsMenuFooter || "",
    title: config.productsMenuTitle || "Products",
    buttonText: config.productsMenuButton || "Browse",
    sections: [
      {
        title: config.productsSectionTitle || "PRODUCTS",
        rows,
      },
    ],
  };

  try {
    await sock.sendMessage(from, listMsg, { quoted: msg });
  } catch (e) {
    // Fallback to plain text if list message unsupported by client.
    const body = items
      .map((p, i) => `${i + 1}. *${p.name}* — ${formatPrice(p.price)}`)
      .join("\n");
    await sock.sendMessage(
      from,
      {
        text:
          `🛍 *${config.productsMenuTitle || "Products"}*\n\n${body}\n\n` +
          `Reply with a product name to see details.`,
      },
      { quoted: msg }
    );
  }
}

async function sendProductDetails(sock, msg, from, product) {
  const body =
    `🛍 *${product.name}*\n` +
    `💰 Price: ${formatPrice(product.price)}\n\n` +
    `${product.description || "(no description)"}`;
  await sock.sendMessage(from, { text: body }, { quoted: msg });
}

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

function senderNumber(msg) {
  const raw = msg.key.participant || msg.key.remoteJid || "";
  return String(raw).split("@")[0].split(":")[0];
}

function isOwner(msg) {
  // Messages sent from the bot's own account (e.g. owner texting themselves)
  // count as owner-authored.
  if (msg.key.fromMe) return true;
  return senderNumber(msg) === String(config.ownerNumber);
}

const OWNER_HELP =
  "*Owner auto-reply commands:*\n" +
  "• `!setreply <trigger> | <reply>` — add or update a rule\n" +
  "• `!delreply <trigger>` — delete a rule\n" +
  "• `!listreplies` — show all rules\n" +
  "• `!clearreplies` — delete every rule\n" +
  "• `!replyhelp` — show this help\n\n" +
  "*Owner product commands:*\n" +
  "• `!addproduct <name> | <price> | <description>` — add / update a product\n" +
  "• `!delproduct <name>` — delete a product\n" +
  "• `!listproducts` — list products\n" +
  "• `!clearproducts` — remove all products\n" +
  "• `!producthelp` — show product help\n\n" +
  "Data is saved to Google Drive and survives redeploys.";

async function handleOwnerCommand(sock, msg, from, text) {
  const trimmed = text.trim();
  const lower = trimmed.toLowerCase();

  const reply = (t) => sock.sendMessage(from, { text: t }, { quoted: msg });

  if (lower === "!replyhelp") {
    await reply(OWNER_HELP);
    return true;
  }

  if (lower === "!listreplies") {
    const items = store.list();
    if (items.length === 0) {
      await reply("No auto-reply rules are configured.");
      return true;
    }
    const body = items
      .map(
        (r, i) =>
          `${i + 1}. *${r.trigger}*\n    → ${r.reply.replace(/\n/g, " ⏎ ")}`
      )
      .join("\n");
    await reply(`*Auto-reply rules (${items.length}):*\n\n${body}`);
    return true;
  }

  if (lower === "!clearreplies") {
    const ok = await store.clearAll();
    await reply(ok ? "✅ All rules cleared and synced to Drive." : "❌ Failed to sync to Drive.");
    return true;
  }

  if (lower.startsWith("!setreply")) {
    const rest = trimmed.slice("!setreply".length).trim();
    const sepIdx = rest.indexOf("|");
    if (sepIdx === -1) {
      await reply(
        "Usage: `!setreply <trigger> | <reply>`\nExample: `!setreply Hello-Test | Hi there!`"
      );
      return true;
    }
    const trigger = rest.slice(0, sepIdx).trim();
    const replyText = rest.slice(sepIdx + 1).trim();
    if (!trigger || !replyText) {
      await reply("Trigger and reply cannot be empty.");
      return true;
    }
    const ok = await store.set(trigger, replyText);
    await reply(
      ok
        ? `✅ Saved rule for *${trigger}* and synced to Drive.`
        : `⚠️ Saved locally but failed to sync to Drive.`
    );
    return true;
  }

  if (lower.startsWith("!delreply")) {
    const trigger = trimmed.slice("!delreply".length).trim();
    if (!trigger) {
      await reply("Usage: `!delreply <trigger>`");
      return true;
    }
    const res = await store.remove(trigger, {
      caseSensitive: config.caseSensitive,
    });
    if (!res.ok) {
      await reply(`No rule found for *${trigger}*.`);
    } else {
      await reply(`🗑️ Deleted rule *${res.trigger}* and synced to Drive.`);
    }
    return true;
  }

  // ===== product commands =====
  if (lower === "!producthelp") {
    await reply(
      "*Owner product commands:*\n" +
        "• `!addproduct <name> | <price> | <description>`\n" +
        "• `!delproduct <name>`\n" +
        "• `!listproducts`\n" +
        "• `!clearproducts`\n\n" +
        "Users can send `!products` to open the menu."
    );
    return true;
  }

  if (lower === "!listproducts") {
    const items = products.list();
    if (items.length === 0) {
      await reply("No products configured. Use `!addproduct` to add one.");
      return true;
    }
    const body = items
      .map(
        (p, i) =>
          `${i + 1}. *${p.name}* — ${formatPrice(p.price)}\n    ${p.description}`
      )
      .join("\n\n");
    await reply(`*Products (${items.length}):*\n\n${body}`);
    return true;
  }

  if (lower === "!clearproducts") {
    const ok = await products.clearAll();
    await reply(
      ok ? "✅ All products cleared and synced to Drive." : "❌ Failed to sync to Drive."
    );
    return true;
  }

  if (lower.startsWith("!addproduct")) {
    const rest = trimmed.slice("!addproduct".length).trim();
    const parts = rest.split("|").map((s) => s.trim());
    if (parts.length < 3 || !parts[0] || !parts[1] || !parts[2]) {
      await reply(
        "Usage: `!addproduct <name> | <price> | <description>`\n" +
          "Example: `!addproduct Capcut Pro 1 Month | 895 | Full month subscription, instant delivery.`"
      );
      return true;
    }
    const [name, price, ...descParts] = parts;
    const description = descParts.join(" | ");
    const res = await products.add({ name, price, description });
    if (!res.ok) {
      await reply("⚠️ Saved locally but failed to sync to Drive.");
    } else if (res.updated) {
      await reply(`✏️ Updated *${res.product.name}* and synced to Drive.`);
    } else {
      await reply(`✅ Added *${res.product.name}* and synced to Drive.`);
    }
    return true;
  }

  if (lower.startsWith("!delproduct")) {
    const name = trimmed.slice("!delproduct".length).trim();
    if (!name) {
      await reply("Usage: `!delproduct <name>`");
      return true;
    }
    const res = await products.remove(name);
    if (!res.ok) {
      await reply(`No product found matching *${name}*.`);
    } else {
      await reply(`🗑️ Deleted *${res.product.name}* and synced to Drive.`);
    }
    return true;
  }

  return false;
}


async function handleMessage(sock, msg) {
  try {
    if (!msg.message) return;

    const from = msg.key.remoteJid;
    if (!from) return;

    // Allow owner commands even when sent from the bot's own account (fromMe),
    // e.g. when you message yourself. Skip all other fromMe messages.
    const fromMe = !!msg.key.fromMe;

    const isGroup = from.endsWith("@g.us");
    const text = extractText(msg.message);
    if (!text) return;

    // Owner commands work everywhere (private + groups) and always take
    // priority over auto-reply matching.
    if (isOwner(msg) && text.trim().startsWith("!")) {
      const handled = await handleOwnerCommand(sock, msg, from, text);
      if (handled) return;
    }

    // Ignore any other messages we sent ourselves to avoid reply loops.
    if (fromMe) return;

    if (isGroup && !config.replyInGroups) return;

    if (isGroup && config.requireMentionInGroups) {
      const botId = sock.user?.id?.split(":")[0];
      const mentions =
        msg.message.extendedTextMessage?.contextInfo?.mentionedJid || [];
      const mentioned = botId && mentions.some((j) => j.startsWith(botId));
      if (!mentioned) return;
    }

    const hit = store.findMatch(text, {
      matchMode: config.matchMode,
      caseSensitive: config.caseSensitive,
    });
    if (!hit) return;

    if (config.simulateTyping) {
      await sock.presenceSubscribe(from).catch(() => {});
      await sock.sendPresenceUpdate("composing", from).catch(() => {});
      await new Promise((r) => setTimeout(r, 600));
      await sock.sendPresenceUpdate("paused", from).catch(() => {});
    }

    await sock.sendMessage(from, { text: hit.reply }, { quoted: msg });
  } catch (err) {
    console.error("handleMessage error:", err);
  }
}

module.exports = { handleMessage };
