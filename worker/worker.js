/**
 * Cloudflare Worker — a dynamic Sesame agent tool with rotating-key auth.
 *
 * Deploy (free):
 *   1. https://dash.cloudflare.com → Workers → Create → paste this file.
 *   2. Settings → Variables → add secret `TOOL_SECRET` (the same string you put in the app).
 *   3. Your endpoint is  https://<name>.<you>.workers.dev/tool
 *
 * Contract:  GET /tool?dir=<path>&depth=<1-3>&key=<rotating-key>  ->  text directory tree
 *
 * This example serves a sliced view of a fixed in-memory tree. Replace TREE / renderTree with
 * anything: read a real snapshot, query a database, return notes — whatever your agents need.
 */

const ROTATE = 300;

async function keyForWindow(secret, w) {
  const enc = new TextEncoder();
  const k = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", k, enc.encode(String(w)));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 10);
}
async function isValid(secret, key) {
  if (!key) return false;
  const w = Math.floor(Date.now() / 1000 / ROTATE);
  for (const x of [w, w - 1]) if ((await keyForWindow(secret, x)) === key) return true;
  return false;
}

// ---- your data ------------------------------------------------------------
// A directory is an object; a file is the value 0. Replace with your own snapshot.
const TREE = {
  Projects: { "sesame-client": 0, "sesame-agent-tools": 0, whetstone: { "README.md": 0, "src": 0 } },
  Notes: { "groceries.md": 0, "reading-list.md": 0 },
};

// Render a subtree as an indented text listing, `depth` levels deep.
function renderTree(node, depth, prefix = "") {
  const out = [];
  for (const name of Object.keys(node).sort((a, b) => (node[a] === 0) - (node[b] === 0) || a.localeCompare(b))) {
    const v = node[name];
    if (v === 0) out.push(`${prefix}${name}`);
    else if (depth > 1) { out.push(`${prefix}${name}/`); out.push(...renderTree(v, depth - 1, prefix + "  ")); }
    else out.push(`${prefix}${name}/`);
  }
  return out;
}
// ---------------------------------------------------------------------------

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname !== "/tool") return new Response("sesame-agent-tools worker", { status: 200 });

    const secret = env.TOOL_SECRET;
    if (!secret) return new Response("server misconfigured: set TOOL_SECRET", { status: 500 });
    if (!(await isValid(secret, url.searchParams.get("key")))) return new Response("forbidden", { status: 403 });

    const dir = (url.searchParams.get("dir") || "").replace(/^\/+|\/+$/g, "");
    const depth = Math.max(1, Math.min(3, parseInt(url.searchParams.get("depth") || "1", 10) || 1));

    let node = TREE;
    for (const seg of dir ? dir.split("/") : []) {
      node = node?.[seg];
      if (node === undefined || node === 0) return new Response(`no such directory: ${dir}`, { status: 404 });
    }
    const body = `# ${dir || "."} (depth ${depth})\n` + renderTree(node, depth).join("\n");
    return new Response(body, { status: 200, headers: { "content-type": "text/plain; charset=utf-8" } });
  },
};
