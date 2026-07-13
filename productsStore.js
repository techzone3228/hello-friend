/**
 * In-memory product catalog backed by Google Drive.
 *
 * Product shape: { id, name, price, description }
 *   - id is a short slug generated from the name (used as list rowId).
 */

const drive = require("./utils/productsStorage");

// Map<id, product>
let products = new Map();

function slugify(name) {
  return String(name)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "item";
}

function uniqueId(base) {
  let id = base;
  let i = 2;
  while (products.has(id)) id = `${base}-${i++}`;
  return id;
}

async function init() {
  const arr = await drive.loadProducts();
  const map = new Map();
  if (Array.isArray(arr)) {
    for (const p of arr) {
      if (p && p.id && p.name) map.set(p.id, p);
    }
  }
  products = map;
  console.log(`[PRODUCTS] Loaded ${products.size} products`);
}

async function persist() {
  return await drive.saveProducts(list());
}

function list() {
  return Array.from(products.values());
}

function get(id) {
  return products.get(id) || null;
}

function findByName(name) {
  const target = String(name).trim().toLowerCase();
  for (const p of products.values()) {
    if (p.name.toLowerCase() === target) return p;
  }
  return null;
}

async function add({ name, price, description }) {
  const existing = findByName(name);
  if (existing) {
    existing.price = price;
    existing.description = description;
    const ok = await persist();
    return { ok, product: existing, updated: true };
  }
  const id = uniqueId(slugify(name));
  const product = { id, name: name.trim(), price: String(price).trim(), description: String(description).trim() };
  products.set(id, product);
  const ok = await persist();
  return { ok, product, updated: false };
}

async function remove(nameOrId) {
  const q = String(nameOrId).trim();
  let key = null;
  if (products.has(q)) key = q;
  else {
    const p = findByName(q);
    if (p) key = p.id;
  }
  if (!key) return { ok: false };
  const removed = products.get(key);
  products.delete(key);
  const ok = await persist();
  return { ok, product: removed };
}

async function clearAll() {
  products.clear();
  return await persist();
}

function size() {
  return products.size;
}

module.exports = { init, list, get, add, remove, clearAll, size };
