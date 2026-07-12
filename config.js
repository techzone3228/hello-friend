/**
 * Bot configuration
 */
module.exports = {
  // Bot display name (used in some replies)
  botName: "AutoReplyBot",

  // Owner number in international format WITHOUT + (e.g. "919999999999")
  ownerNumber: "919999999999",

  // Match mode for triggers:
  //   "exact"    -> message must equal the trigger (case-insensitive)
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

  // Auth session folder (stores login credentials)
  sessionDir: "./auth_session",
};
