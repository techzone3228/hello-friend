/**
 * In-memory store for auto-reply rules, backed by Google Drive.
 *
 * On startup: rules are loaded from Drive. If Drive is empty/unavailable,
 * seed rules from commands.js (only entries whose `reply` is a plain string)
 * are used.
 *
 * Any change (add/delete/clear) writes the full ruleset back to Drive.
 */

const drive = require("./utils/driveStorage");
const seedCommands = require("./commands");

// Map<string trigger, string reply>
let rules = new Map();

function seedFromCommands() {
  const map = new Map();
  for (const c of seedCommands) {
    if (c && typeof c.trigger === "string" && typeof c.reply === "string") {
      map.set(c.trigger, c.reply);
    }
  }
  return map;
}

async function init() {
  const fromDrive = await drive.loadRules();
  if (fromDrive && Object.keys(fromDrive).length > 0) {
    rules = new Map(Object.entries(fromDrive));
    console.log(`[STORE] Loaded ${rules.size} rules from Drive`);
    return;
  }
  rules = seedFromCommands();
  console.log(
    `[STORE] No rules on Drive — seeding ${rules.size} defaults from commands.js and saving`
  );
  if (rules.size > 0) await persist();
}

async function persist() {
  const obj = Object.fromEntries(rules);
  return await drive.saveRules(obj);
}

function list() {
  return Array.from(rules.entries()).map(([trigger, reply]) => ({
    trigger,
    reply,
  }));
}

function findMatch(text, { matchMode, caseSensitive }) {
  const norm = (s) => (caseSensitive ? String(s) : String(s).toLowerCase());
  const a = norm(text).trim();
  if (!a) return null;
  for (const [trigger, reply] of rules) {
    const b = norm(trigger).trim();
    if (!b) continue;
    let hit = false;
    switch (matchMode) {
      case "contains":
        hit = a.includes(b);
        break;
      case "startsWith":
        hit = a.startsWith(b);
        break;
      case "exact":
      default:
        hit = a === b;
    }
    if (hit) return { trigger, reply };
  }
  return null;
}

async function set(trigger, reply) {
  rules.set(trigger, reply);
  return await persist();
}

async function remove(trigger, { caseSensitive }) {
  const norm = (s) => (caseSensitive ? String(s) : String(s).toLowerCase());
  const target = norm(trigger).trim();
  let removedKey = null;
  for (const key of rules.keys()) {
    if (norm(key).trim() === target) {
      removedKey = key;
      break;
    }
  }
  if (!removedKey) return { ok: false };
  rules.delete(removedKey);
  const ok = await persist();
  return { ok, trigger: removedKey };
}

async function clearAll() {
  rules.clear();
  return await persist();
}

function size() {
  return rules.size;
}

module.exports = { init, list, findMatch, set, remove, clearAll, size };
