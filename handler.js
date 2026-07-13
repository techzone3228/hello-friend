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
const buyNow = require("./buyNowStore");
const { sendInteractiveMessage, sendButtons } = require("gifted-btns");

const PRODUCT_ROW_PREFIX = "product:";
const BUY_PREFIX = "buy:";
const MENU_ID = "products:menu";

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
    id: `${PRODUCT_ROW_PREFIX}${p.id}`,
    title: p.name,
    description: formatPrice(p.price),
  }));

  try {
    await sendInteractiveMessage(
      sock,
      from,
      {
        text: config.productsMenuBody || "Select a product:",
        footer: config.productsMenuFooter || "",
        interactiveButtons: [
          {
            name: "single_select",
            buttonParamsJson: JSON.stringify({
              title: config.productsMenuButton || "Browse",
              sections: [
                {
                  title: config.productsSectionTitle || "PRODUCTS",
                  rows,
                },
              ],
            }),
          },
        ],
      },
      { quoted: msg }
    );
  } catch (e) {
    console.error("sendInteractiveMessage failed:", e);
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

  try {
    await sendButtons(
      sock,
      from,
      {
        text: body,
        footer: "Tap a button below",
        buttons: [
          { id: `${BUY_PREFIX}${product.id}`, text: config.buyNowButtonText || "🛒 Buy Now" },
          { id: MENU_ID, text: config.productsButtonText || "🛍 Products" },
        ],
      },
      { quoted: msg }
    );
  } catch (e) {
    console.error("sendButtons (product details) failed:", e);
    await sock.sendMessage(from, { text: body }, { quoted: msg });
  }
}

const BUY_GENERIC_ID = "buy:__generic__";

async function sendAutoReplyWithButtons(sock, msg, from, text) {
  const items = products.list();
  const rows = items.slice(0, 10).map((p) => ({
    id: `${PRODUCT_ROW_PREFIX}${p.id}`,
    title: p.name,
    description: formatPrice(p.price),
  }));

  try {
    const interactiveButtons = [];
    if (rows.length > 0) {
      interactiveButtons.push({
        name: "single_select",
        buttonParamsJson: JSON.stringify({
          title: config.productsMenuButton || "🛍 Products",
          sections: [
            {
              title: config.productsSectionTitle || "PRODUCTS",
              rows,
            },
          ],
        }),
      });
    }
    interactiveButtons.push({
      name: "quick_reply",
      buttonParamsJson: JSON.stringify({
        display_text: config.buyNowButtonText || "🛒 Buy Now",
        id: BUY_GENERIC_ID,
      }),
    });

    await sendInteractiveMessage(
      sock,
      from,
      {
        text,
        footer: "",
        interactiveButtons,
      },
      { quoted: msg }
    );
  } catch (e) {
    console.error("sendInteractiveMessage (auto-reply) failed:", e);
    await sock.sendMessage(from, { text }, { quoted: msg });
  }
}

function extractSelectedId(message) {
  if (!message) return "";
  const list = message.listResponseMessage?.singleSelectReply?.selectedRowId;
  if (list) return list;
  const btn =
    message.buttonsResponseMessage?.selectedButtonId ||
    message.templateButtonReplyMessage?.selectedId;
  if (btn) return btn;
  const paramsJson =
    message.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson;
  if (paramsJson) {
    try {
      const parsed = JSON.parse(paramsJson);
      if (parsed?.id) return parsed.id;
      if (Array.isArray(parsed?.selected_ids) && parsed.selected_ids[0])
        return parsed.selected_ids[0];
    } catch {}
  }
  return "";
}

function extractText(message) {
  if (!message) return "";
  return (
    message.conversation ||
    message.extendedTextMessage?.text ||
    message.imageMessage?.caption ||
    message.videoMessage?.caption ||
    extractSelectedId(message) ||
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
  "*Owner Buy Now commands:*\n" +
  "• `!setbuynow <text>` — set Buy Now reply (placeholders: {name}, {price}, {description})\n" +
  "• `!getbuynow` — show current Buy Now reply\n\n" +
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

  // ===== Buy Now commands =====
  if (lower === "!getbuynow") {
    await reply(`*Current Buy Now reply:*\n\n${buyNow.get()}`);
    return true;
  }

  if (lower.startsWith("!setbuynow")) {
    const rest = trimmed.slice("!setbuynow".length).trim();
    if (!rest) {
      await reply(
        "Usage: `!setbuynow <text>`\n" +
          "Placeholders: {name}, {price}, {description}\n" +
          "Example: `!setbuynow Thanks for choosing {name}! Send {price} to JazzCash 0300xxxxxxx.`"
      );
      return true;
    }
    const ok = await buyNow.set(rest);
    await reply(ok ? "✅ Buy Now reply saved and synced to Drive." : "⚠️ Saved locally but failed to sync to Drive.");
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

    // Handle button selections.
    const selectedId = extractSelectedId(msg.message);
    if (selectedId) {
      if (selectedId === MENU_ID) {
        await sendProductsMenu(sock, msg, from);
        return;
      }
      if (selectedId === BUY_GENERIC_ID) {
        const reply = buyNow.render({});
        await sock.sendMessage(from, { text: reply }, { quoted: msg });
        return;
      }
      if (selectedId.startsWith(BUY_PREFIX)) {
        const id = selectedId.slice(BUY_PREFIX.length);
        const p = products.get(id);
        const reply = buyNow.render(p || {});
        await sock.sendMessage(from, { text: reply }, { quoted: msg });
        return;
      }
      if (selectedId.startsWith(PRODUCT_ROW_PREFIX)) {
        const id = selectedId.slice(PRODUCT_ROW_PREFIX.length);
        const p = products.get(id);
        if (p) {
          await sendProductDetails(sock, msg, from, p);
          return;
        }
      }
    }

    // !products (available to everyone) opens the products menu.
    const cmd = text.trim().toLowerCase();
    if (cmd === "!products" || cmd === "products") {
      await sendProductsMenu(sock, msg, from);
      return;
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

    await sendAutoReplyWithButtons(sock, msg, from, hit.reply);
  } catch (err) {
    console.error("handleMessage error:", err);
  }
}

module.exports = { handleMessage };
