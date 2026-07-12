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
  sessionName: "KnightBot!H4sIAAAAAAAAA5VUyY6jSBT8l7xitTFml0oavGAw4N1V4NEcMCQ42U1mgnHL/z7C1dXVh5memltuihcvIl5+B0WJMLRgB9TvoKpR4xPYL0lXQaCCCY0iWIMBCH3iAxUge/hGb+fXVjGPO5GsE2OlZ2WFr+gUsS1ko4r3/BW2M7d9AY8BqOg5Q8FvACWTSVNhy3Wnk8cs3bOScwdH5/ihszV0utBIvGjdxPG3rvMCHj2ij2pUxPPqAnNY+5kFu42P6q/Rd0zRVnbVUp7dNEYKvK6QVpNrxKQLT4vEYxwnw7NnHe/jt/Rr9JPtLHayypmsriFhxs4mZbLsfEpXljCZVHcuilyui23NP5rv9DGKCxiaISwIIt2Xdfc2nqlYaXyLbsornaamxs/jLXMYxw2nb2ak4/0xHlKFutrXiOdOu93rJ1FEgbtILJTpy1O3a4+rjvPu+H5F6GgYmQiFA/8r8U39kZX0/+heapK022TbN0YRF/ecxsb53kb3V8jtd2V5Sdb23ugoYUdPl79AX9bWUVhi19RTio83MooS/5XSy2IariojZr1b6SF833SH+Sd9n9D6dyznAqWhtYqGxdq4bNKJk4R2qlRWzJb8LpoL9006Lc+svp2Zw5xBxDZkUZ9p2j5BLtX8LS+8SZeh6+71iYDbShcsrCTty7OjFHZmCNTRYwBqGCNMap+gsujPOH40AH7Y7GFQQ/KUF5wu88NleriurWDWiDtWqZUiiNa5YzGKUszMXbEtVke/Tij7AgagqssAYgxDA2FS1p0DMfZjiIH6518DUMAbeTeuLzceDUCEakyOBa2y0g8/XP249IOgpAXZd0Uw7RewBir7eQwJQUWMex1p4dfBBTVwevEJBmrkZxj+7BDWMAQqqSn8ObXTMuyF3zrjyXwqTMAA5E9DUAhUoHBjnmXHI0Ea8+pI+AN/a3tYv6q+FZCAAciezziZlTmJlXiOZyVO7l/2F4+fDHvAEBIfZRioYLq6H4flVp8vRbsL54uFNo+1aayBz44+ovEufQgbVk9m9IqXdMrc23wd8yllnOuGrrN70cY3Rsy7TpZG/Ms/gAAVdIndNKed5FLZ6HKDbnZEh4IAZajoZ5k5XQIzoF521fh8YdxzvUM7vHerprZnJ54N0MVYvXqeIQiLyamljC4uTs10+9JXC2GDAvhrMU6elVmT2vViduUWGyO9TXazaByc+dpbWe2ly/ejnW3GhacHbYsOKZVtMc/GDDnC0mEOhsutrXVHWHt3VURlBd9y67J9D+1zaLIfnxV6xqn3qt9GCD5nv/B7B//bu3fifcTYx+AXjB+/yb9M5MR1a2XitdK1np7jBsvLpFwv7SaxEimpAkE2nYhWGDdrBYLH468BqDKfRGWdAxX4RViXKAQDUJe0z6xZROVvik0105zHsdl3nvmYaJ9zcEA5xMTPK6COJHkkSorA8Y+/Af4fz8U9BwAA",

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
