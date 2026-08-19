"""Rotating access key — matches the Sesame client (ToolKey.swift) exactly.

    key = HMAC_SHA256(secret, floor(unixtime / 300))  -> first 10 hex chars   (new every 5 min)

Your endpoint accepts the current or previous window so a key is valid for ~5-10 minutes.
"""
import hashlib
import hmac
import time

ROTATE = 300  # seconds per window (5 min)


def key_for_window(secret: str, w: int) -> str:
    return hmac.new(secret.encode(), str(w).encode(), hashlib.sha256).hexdigest()[:10]


def current_key(secret: str, now: float | None = None) -> str:
    now = time.time() if now is None else now
    return key_for_window(secret, int(now // ROTATE))


def is_valid(secret: str, key: str, now: float | None = None) -> bool:
    if not key:
        return False
    now = time.time() if now is None else now
    w = int(now // ROTATE)
    return any(hmac.compare_digest(key, key_for_window(secret, x)) for x in (w, w - 1))
