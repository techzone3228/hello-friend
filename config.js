/**
 * Bot configuration
 */
module.exports = {
  // Bot display name (used in some replies)
  botName: "AutoReplyBot",

  // Owner number in international format WITHOUT + (e.g. "919999999999")
  ownerNumber: "923400315734",

  // ===== SESSION CONFIGURATION =====
  // Folder that stores login credentials (auto-created)
  sessionName: "session",

  // Paste a pre-generated session string here to skip QR scanning.
  // Format: "<PREFIX>!<base64-gzipped-creds.json>"
  //   - PREFIX must match `sessionPrefix` below.
  //   - The base64 payload is a gzip-compressed creds.json from a previous login.
  // Leave empty ("") to log in fresh via QR code.
  sessionID: "AutoBot!H4sIAAAAAAAAA5VV27KiOBT9l7xijchNtOpUDSgiKCDecWoeIkSIck0Cypny36fw9Onuh5meM28hIXuvvdbaO3+BvMAULVALxn+BkuAGMtQtWVsiMAZ6fbkgAnogggyCMZi4Ms/5Zuq2WNdP1Xw93dXF4zC4iZXX4GLGV4kd+xsnSKU38OyBsj6nOPxFwPbM0+Xx6jTNykmH5/UutlWxJSSKjEF1rfHwRgvhzNjtqr2BZxcRYoLz2CgTlCEC0wVqVxCTr8G3jLUoQL2x+2FQDj0envvkXBAnvkbKIXY13mRo+7Cj/T78GvzDwtuvrYxqlZ5xnoJmkWj3baQeG0ZXznyQe4Xr1Ls88Z0P+BTHOYqsCOUMs/bLvLfWYYcmfYi1Ups6F70SbF6SH9ersbTkqj/ifZG11cCHA/9rwC+7ZIRmZCQsRUcL5tiF+/PcO5KAO6d9JGxOjnZVF8Zqced/Br4in165/R/eNXvnI1LvN0fjNm1vAxRw2z4xbpYwL6o9gry2PK42J3Vx/KJtLMnnD+4ikWznKMlRRGhW3HPRcSvsLGYB0cVFvk1nlv+4/YAPWU1+hfJaKV7EnazQuRtKPNVGUIH3YXv3mKa0a/XA94fT2tLuM17cj2hs7fiHMUUCl4bvd87ay1JlT/b9KSdxwbURrPoq6Cq+v70quqHWisB48OwBgmJMGYEMF/lrbyj1AIyaDQoJYi96gVWRtdaagenxD5RpwSzAK8fnFbPuS/iQel6juqP18aay+A30QEmKEFGKojmmrCCtgyiFMaJg/MefPZCjB/sQrksnDnrgggllu7wu0wJGn6p+HsIwLOqcbdo8nHQLRMCY/7GNGMN5TDse6xySMMENmiSQUTC+wJSi7xUigiIwZqRG37t2UkQd8e72ZMr20gc9kL0EwREYg5EgCtJQEHhREcai8jv97d6FhWX5W44Y6IEcdn8DLS/yNitqCnogfd0UJFnihYEoKtJQlkbd5e7g+R10lyNCDOKUdkPMFpGMfV/uv/t8HATaRtMWmtYR+Vnkp1s+1FA3K09JzOzoLwx4n3Fn+ZRnpb5SdGjykXmip9I9U2XvzYN/CgLGgBE1XnObeX+1NVTpinZ7C8vKsiT8uuFYJbiuchTeh8k+t6J1XQnJgZcnp+GpDrlAtVPdu9+t22aq7Qy7OBci9a68NPXfumwRanCIfk5WObSC5owFVqOL072gh0ZuD2hDi93DzNbi9D2LctNNtm4rm1k2Raulaeeqp8WKO8xycsHp7LE8EdXr2zln6Txe2zj+8PGrj9Jv8wu/HNbJ131eMHqNg28y/aecH8A71/HP3k8xvg2Yf2lS/WJc3+tiXab8JDGpfsm4w0mu/C0XHxI2X2dnE24PQy/dJgJ4Pv/sgTKF7FKQDIwBzc4Q9AAp6s7DVn4pfvXWabFlxPGkKzuFlGk/+mKLM0QZzMque1VxxMsjXnz+Dedz2UtNBwAA",

  // Prefix expected in sessionID (change if you want your own branding).
  sessionPrefix: "AutoBot",

  // ===== GOOGLE DRIVE PERSISTENCE =====
  // File name used on Google Drive to store your auto-reply rules.
  // Created automatically on first save.
  driveFileName: "autoreply_bot_rules.txt",

  // File name used on Google Drive to store your products catalog.
  productsFileName: "autoreply_bot_products.json",

  // Currency label prepended to product prices in the menu (e.g. "PKR", "$").
  productsCurrency: "PKR",

  // Title shown at the top of the products list menu.
  productsMenuTitle: "Products",
  productsMenuBody: "🛍 *PRODUCTS*\n\nSelect a product to see its details:",
  productsMenuFooter: "Tap 'Browse' to see the list",
  productsMenuButton: "Browse",
  productsSectionTitle: "💎 PREMIUM SERVICES",

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
