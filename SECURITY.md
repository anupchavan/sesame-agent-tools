# Security Policy

## Reporting a vulnerability

Report security issues **privately** via
[GitHub private vulnerability reporting](https://github.com/anupchavan/sesame-agent-tools/security/advisories/new)
or by emailing the maintainer (see the GitHub profile). Please don't open a public issue for
anything exploitable. Include reproduction steps and impact.

## Threat model

This template lets your Sesame agents call an endpoint **you** host. Keep these in mind when
you deploy it:

- **The rotating key is the only gate.** Sesame fetches your endpoint server-side from rotating
  cloud IPs with spoofed user-agents, so you cannot allowlist by source. Anyone who obtains a
  currently-valid key (a ~10-minute window) can call your endpoint. Keep your `TOOL_SECRET`
  secret; never commit it.
- **Your endpoint is public.** Return only data you're comfortable exposing to whoever holds a
  valid key. The included examples list directory *names* only — never file contents.
- **Returned text is acted on by a model.** Treat your endpoint's output as instructions the
  agent may follow. Don't reflect untrusted input, and sanitize anything user-influenced.
- **Secrets belong in environment variables**, never in the repo. `TOOL_SECRET`,
  `TOOL_STATIC_KEY`, and `ADMIN_SECRET` are read from the host's env (Netlify/Cloudflare/your
  server). This repo contains no secrets.

## Key handling

- The rotating key is `HMAC-SHA256(secret, floor(unixtime / 300))` truncated to 10 hex chars,
  accepted for the current and previous 5-minute window. Rotate your secret if it leaks.
- Use a long, random `TOOL_SECRET` (32+ bytes). The static-key fallback is convenience only;
  prefer the rotating key.

## Scope

This is independent, unofficial tooling and is not affiliated with Sesame.
