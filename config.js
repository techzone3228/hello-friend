/**
 * Bot configuration
 */
module.exports = {
  // Bot display name (used in some replies)
  botName: "AutoReplyBot",

  // Owner number in international format WITHOUT + (e.g. "919999999999")
  ownerNumber: "919999999999",

  // ===== SESSION CONFIGURATION =====
  // Folder that stores login credentials (auto-created)
  sessionName: "session",

  // Paste a pre-generated session string here to skip QR scanning.
  // Format: "<PREFIX>!<base64-gzipped-creds.json>"
  //   - PREFIX must match `sessionPrefix` below.
  //   - The base64 payload is a gzip-compressed creds.json from a previous login.
  // Leave empty ("") to log in fresh via QR code.
  sessionID: "",

  // Prefix expected in sessionID (change if you want your own branding).
  sessionPrefix: "AutoBot",

  // ===== MATCHING CONFIGURATION =====
  // Match mode for triggers:
  //   "exact"    -> message must equal the trigger
  //   "contains" -> message contains the trigger anywhere
  //   "startsWith" -> message starts with the trigger
  matchMode: "exact",

  // Case sensitivity for matching triggers
  caseSensitive: false,

  // Reply in groups too? If false, bot only replies in private DMs.
  replyInGroups: true,

  // Only reply when the bot is @mentioned in groups (ignored if replyInGroups=false)
  requireMentionInGroups: false,

  // Show "typing..." before replying
  simulateTyping: true,
};
