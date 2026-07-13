/**
 * In-memory "Buy Now" reply text backed by Google Drive.
 * Supports placeholders: {name}, {price}, {description}.
 */

const drive = require("./utils/buyNowStorage");
const config = require("./config");

let text = "";

async function init() {
  const loaded = await drive.loadBuyNow();
  if (loaded && loaded.trim()) {
    text = loaded;
    console.log(`[BUYNOW] Loaded custom Buy Now reply (${text.length} chars)`);
  } else {
    text = config.buyNowDefault ||
      "🛒 *Buy Now — {name}*\n\nTo purchase, contact the owner. Price: {price}.";
    console.log("[BUYNOW] Using default Buy Now reply");
  }
}

function get() {
  return text;
}

async function set(newText) {
  text = String(newText);
  return await drive.saveBuyNow(text);
}

function render(product) {
  const p = product || {};
  return String(text)
    .replace(/\{name\}/gi, p.name || "")
    .replace(/\{price\}/gi, p.price || "")
    .replace(/\{description\}/gi, p.description || "");
}

module.exports = { init, get, set, render };
