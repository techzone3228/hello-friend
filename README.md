# AutoReply Bot

A minimal WhatsApp auto-reply bot built on [Baileys](https://github.com/WhiskeySockets/Baileys).
Same file-structure style as KnightBot-Mini, but stripped down to one job:
**match a trigger, send a reply.**

## File structure

```
bot/
├── index.js       # entry point (socket + QR login + reconnect)
├── handler.js     # message router (matches text against commands)
├── commands.js    # <-- YOU EDIT THIS: your trigger -> reply pairs
├── config.js      # match mode, group behavior, owner number, etc.
├── package.json
└── Procfile
```

## Install & run

```bash
cd bot
npm install
npm start
```

On first run, scan the QR code from your terminal:
WhatsApp > Settings > Linked Devices > Link a device.
Credentials are saved in `auth_session/` so you won't need to scan again.

## Add your own auto-replies

Open `commands.js` and add entries. Example:

```js
module.exports = [
  {
    trigger: "Hello-Test",
    reply: "Hi! This is an auto-reply for the Hello-Test command.",
  },
  {
    trigger: "price",
    reply: "Our pricing starts at $10/month. Type 'menu' for more.",
  },
  {
    trigger: "hi",
    reply: ({ pushName }) => `Hello ${pushName || "there"}!`,
  },
];
```

`reply` can be either a **string** or a **function** that receives
`{ sender, pushName, text }` and returns a string.

## Match behavior

Controlled in `config.js`:

| Option                    | What it does                                          |
| ------------------------- | ----------------------------------------------------- |
| `matchMode`               | `"exact"`, `"contains"`, or `"startsWith"`            |
| `caseSensitive`           | `true` / `false`                                      |
| `replyInGroups`           | reply in group chats                                  |
| `requireMentionInGroups`  | only reply in groups when the bot is @mentioned       |
| `simulateTyping`          | show "typing..." before replying                      |

## Notes

This is a Node.js server bot — it must run on a machine that can keep a
long-lived WebSocket open (VPS, Railway, Render, a home server, etc.).
It cannot run inside the Lovable web preview.
