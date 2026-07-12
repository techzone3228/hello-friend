/**
 * ============================================================
 *  CUSTOMIZE YOUR AUTO-REPLIES HERE
 * ============================================================
 *
 *  Add as many { trigger, reply } pairs as you want.
 *
 *  - `trigger` is what the user sends.
 *  - `reply`   is what the bot answers.
 *
 *  `reply` can be:
 *    - a plain string
 *    - a function ({ sender, pushName, text }) => string
 *
 *  Matching rules (exact / contains / startsWith) and case
 *  sensitivity are controlled from config.js.
 * ============================================================
 */

module.exports = [
  {
    trigger: "Hello-Test",
    reply: "Hi! This is an auto-reply for the Hello-Test command.",
  },
  {
    trigger: "hi",
    reply: ({ pushName }) => `Hello ${pushName || "there"}, how can I help you?`,
  },
  {
    trigger: "menu",
    reply:
      "*Available commands:*\n" +
      "• Hello-Test\n" +
      "• hi\n" +
      "• menu\n" +
      "• ping\n" +
      "• owner",
  },
  {
    trigger: "ping",
    reply: "pong ",
  },
  {
    trigger: "owner",
    reply: "Contact the owner for more info.",
  },
];
