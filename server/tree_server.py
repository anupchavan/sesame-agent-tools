#!/usr/bin/env python3
"""Python reference endpoint for a Sesame agent tool — key-gated, sandboxed dir listing.

Runs anywhere you can expose a port (put it behind a Cloudflare Tunnel / ngrok for a public
URL). Demonstrates the contract; replace `run_tool` with whatever you want your agents to do.

    GET /tool?dir=<path>&depth=<1-3>&key=<rotating-key>  ->  text directory tree

Set the shared secret (same as in the app) via env:
    TOOL_SECRET='your-long-random-secret' BASE_DIR="$HOME/Projects" ./tree_server.py 8787
"""
import os
import sys
import urllib.parse
from http.server import BaseHTTPRequestHandler, HTTPServer

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "lib"))
from keys import is_valid  # noqa: E402

SECRET = os.environ.get("TOOL_SECRET", "")
BASE_DIR = os.path.realpath(os.environ.get("BASE_DIR", os.path.expanduser("~/Projects")))


def run_tool(dir_arg: str, depth: int) -> str:
    """List a subdirectory of BASE_DIR, `depth` levels deep (sandboxed — no escaping base)."""
    rel = (dir_arg or "").strip().strip("/")
    target = os.path.realpath(os.path.join(BASE_DIR, rel))
    if not target.startswith(BASE_DIR):
        return "path not allowed"
    if not os.path.isdir(target):
        return f"not a directory: {rel or '.'}"

    def walk(path: str, d: int, prefix: str = "") -> list[str]:
        out = []
        for name in sorted(os.listdir(path))[:100]:
            full = os.path.join(path, name)
            if os.path.isdir(full):
                out.append(f"{prefix}{name}/")
                if d > 1:
                    out += walk(full, d - 1, prefix + "  ")
            else:
                out.append(f"{prefix}{name}")
        return out

    label = rel or os.path.basename(BASE_DIR)
    return f"# {label} (depth {depth})\n" + "\n".join(walk(target, depth))


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *_):  # quiet
        pass

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path != "/tool":
            return self._text(200, "sesame-agent-tools server")
        if not SECRET:
            return self._text(500, "server misconfigured: set TOOL_SECRET")
        params = urllib.parse.parse_qs(parsed.query)
        key = (params.get("key") or [""])[0]
        if not is_valid(SECRET, key):
            return self._text(403, "forbidden")
        dir_arg = (params.get("dir") or [""])[0]
        depth = max(1, min(3, int((params.get("depth") or ["1"])[0] or 1)))
        self._text(200, run_tool(dir_arg, depth))

    def _text(self, code: int, body: str):
        data = body.encode()
        self.send_response(code)
        self.send_header("Content-Type", "text/plain; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8787
    if not SECRET:
        print("warning: TOOL_SECRET not set — every request will 500", file=sys.stderr)
    print(f"serving /tool on :{port}  (BASE_DIR={BASE_DIR})", file=sys.stderr)
    HTTPServer(("0.0.0.0", port), Handler).serve_forever()
