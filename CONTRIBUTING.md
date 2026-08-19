# Contributing

Contributions are welcome — new host adapters, tool examples, or docs improvements.

## Layout

```
tool.txt              static example the agent can fetch (GitHub Pages path)
index.html            landing page / docs
worker/worker.js      Cloudflare Worker — dynamic tool with rotating-key auth
server/tree_server.py Python reference server (key-gated, sandboxed)
lib/keys.js           rotating-key: JS (Node + Web Crypto)
lib/keys.py           rotating-key: Python
```

## Guidelines

- **Never commit secrets.** `TOOL_SECRET`, `TOOL_STATIC_KEY`, `ADMIN_SECRET` come from the
  host's environment — not the repo. Don't add real keys, even in examples.
- **Keep the key logic identical across languages.** `lib/keys.js` and `lib/keys.py` must stay
  byte-for-byte compatible with the Sesame client
  (`HMAC-SHA256(secret, floor(unixtime/300))`, first 10 hex chars, current + previous window).
  If you change one, change all and note it in the PR.
- **Endpoint contract:** `GET <base>/tool?dir=<path>&depth=<1-3>&key=<key>` → verify key, else
  `403`; return plain text. New adapters should honor the same contract.
- **Least privilege in examples.** Return names/metadata, not raw contents; sandbox any
  filesystem access.

## Adding a host adapter

Mirror `worker/worker.js` or `server/tree_server.py`: read the shared secret from the
environment, validate the key with the shared logic, run your tool, return text. Add a short
note to the README's "Pick a host" table.

## Pull requests

Branch from `main`, keep PRs focused, and describe the change. For security-sensitive issues,
follow [`SECURITY.md`](SECURITY.md) instead of opening a public issue.
