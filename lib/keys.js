// Rotating access key — matches the Sesame client (ToolKey.swift) exactly.
//   key = HMAC_SHA256(secret, floor(unixtime / 300))  → first 10 hex chars.
// Node crypto version + Web Crypto (Workers/browser) version.

const ROTATE = 300; // seconds per window (5 min)

// --- Node.js ---
function keyForWindowNode(secret, w) {
  const crypto = require("crypto");
  return crypto.createHmac("sha256", secret).update(String(w)).digest("hex").slice(0, 10);
}
function currentKeyNode(secret, now = Date.now() / 1000) {
  return keyForWindowNode(secret, Math.floor(now / ROTATE));
}
function isValidNode(secret, key, now = Date.now() / 1000) {
  if (!key) return false;
  const w = Math.floor(now / ROTATE);
  return [w, w - 1].some((x) => timingSafeEq(keyForWindowNode(secret, x), key));
}
function timingSafeEq(a, b) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

// --- Web Crypto (Cloudflare Workers, browsers) ---
async function keyForWindowWeb(secret, w) {
  const enc = new TextEncoder();
  const k = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", k, enc.encode(String(w)));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 10);
}
async function isValidWeb(secret, key, now = Date.now() / 1000) {
  if (!key) return false;
  const w = Math.floor(now / ROTATE);
  for (const x of [w, w - 1]) if ((await keyForWindowWeb(secret, x)) === key) return true;
  return false;
}

module.exports = { ROTATE, keyForWindowNode, currentKeyNode, isValidNode, keyForWindowWeb, isValidWeb };
