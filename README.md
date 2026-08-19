# sesame-agent-tools

Give your Sesame agents (Maya, Miles, Charlie, Simone) a **personal tool** they can call —
list your files, read your notes, check anything only your own data knows — and teach it to
them once. This repo is a **template**: copy it, implement whatever tools you want, host it
anywhere, and point the [Sesame macOS client](https://github.com/anupchavan/sesame-client-unofficial)
at your URL.

> You host the tool. Your agents reach it. Nobody uses anyone else's server or key.

---

## How it works

Sesame's backend can **fetch a URL server-side** during a conversation. The macOS client uses
that: while the custom tool is enabled, it silently sends your agent a short note (over the
session's `location_state.address` field — invisible in chat) that says *"a tool lives at
`<your-url>`, here's the current access key."* When you ask for something the agent can't
answer on its own, it fetches:

```
GET  https://your-endpoint/tool?dir=<path>&depth=<1-3>&key=<rotating-key>
```

Your endpoint checks the key, runs whatever you want, and returns text. The agent reads the
reply and answers you naturally. Because Sesame has persistent memory, once you tell an agent
what the tool does, it remembers across sessions **and** devices.

```
You ──ask──▶ Agent ──fetch(dir,key)──▶ your endpoint ──text──▶ Agent ──answer──▶ You
                         (server-side, authorised by the rotating key)
```

## The access key (rotating, shared-secret)

The client derives a short key from a **shared secret** you set in both places:

```
key = HMAC_SHA256(secret, floor(unixtime / 300))   → first 10 hex chars   (new every 5 min)
```

Your endpoint recomputes the key from the same secret and accepts the **current or previous**
5-minute window. A leaked key is dead within ~10 minutes. Implementations: [`lib/keys.js`](lib/keys.js),
[`lib/keys.py`](lib/keys.py) — byte-for-byte identical to what the app sends.

## Pick a host

| Host | Good for | Dynamic? |
|---|---|---|
| **GitHub Pages** | static context: a knowledge base, a big "system prompt", fixed data | No — can't read the query or check keys |
| **Cloudflare Workers** (free) | real tools: run logic per request, validate the key | Yes — see [`worker/worker.js`](worker/worker.js) |
| **Your own server** | tools that touch your machine (files, mail, scripts) | Yes — see [`server/tree_server.py`](server/tree_server.py) |

GitHub Pages is the zero-setup option but static: the agent just fetches a page you publish.
For tools that *do* something per request, deploy the Worker or the Python server and put that
URL in the app.

## Quick start

1. **Use this template** (green button) → your own repo.
2. Choose a host:
   - *Static* → enable GitHub Pages (Settings → Pages → deploy from `main`). Your URL is
     `https://<you>.github.io/<repo>/tool.txt` — edit [`tool.txt`](tool.txt) to whatever context
     you want the agent to read.
   - *Dynamic* → deploy [`worker/worker.js`](worker/worker.js) to Cloudflare Workers, or run
     [`server/tree_server.py`](server/tree_server.py) behind a tunnel.
3. Set a **shared secret** (any long random string) in your endpoint and in the app.
4. In the Sesame app: **Settings → Advanced**, turn on *Custom tool endpoint*, paste your URL
   and the same secret.
5. In a chat or call, tell the agent once: *"You have a tool at your endpoint — use it when I
   ask about my projects."* Done. It remembers.

## The endpoint contract

- **Request:** `GET <base>/tool?dir=<path>&depth=<1-3>&key=<key>` (dir = folder under root, empty = top; depth 1–3)
- **Auth:** recompute the rotating key from your secret; reject if `key` isn't the current or
  previous window (return `403`).
- **Response:** plain text (or `{"result": "..."}`) — becomes the tool's answer verbatim.
- Keep replies short and factual; the agent reads them back to the user.

## Security notes

- The key is the only gate — Sesame fetches from rotating cloud IPs with spoofed user-agents,
  so you can't allowlist by source. Keep your secret secret.
- Your endpoint is world-reachable; return only what you're comfortable exposing to whoever
  holds a valid key.
- Treat any text you return as something the model will act on. Don't echo untrusted input.

## Files

```
tool.txt            static example the agent can fetch (GitHub Pages path)
index.html          landing page / docs
worker/worker.js    Cloudflare Worker — dynamic "tree" tool with key auth
server/tree_server.py  Python reference server (key-gated, sandboxed dir listing)
lib/keys.js         rotating-key: JS (Node + Web Crypto)
lib/keys.py         rotating-key: Python
```

MIT. Built as the companion to [anupchavan/sesame-client](https://github.com/anupchavan/sesame-client-unofficial).
