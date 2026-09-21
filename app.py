#!/usr/bin/env python3
"""Local preview server for 8bitretro.tech.

Serves the static site in docs/ and opens it in a browser tab, so you can look
at a change before pushing it to GitHub Pages.

The site itself has no build step and no dependencies, so neither does this:
everything here is Python standard library.

    python app.py                  # serve docs/ and open the home page
    python app.py --page tools     # open the tools page instead
    python app.py --port 8080      # use a different port
    python app.py --no-browser     # just serve, don't open a tab
"""

import os
import sys

DEFAULT_HOST = "127.0.0.1"
DEFAULT_PORT = 8000  # 5000 belongs to the 8bit Legends editor; stay out of its way

ROOT = os.path.dirname(os.path.abspath(__file__))
DOCS_DIR = os.path.join(ROOT, "docs")

# UTF-8 stdout/stderr so Hebrew page names in log lines don't crash the
# Windows console (cp1255 can't encode everything we print).
for _stream in (sys.stdout, sys.stderr):
    if hasattr(_stream, "reconfigure"):
        _stream.reconfigure(encoding="utf-8", errors="replace")


def _port_in_use(host, port):
    import socket
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(0.5)
        return s.connect_ex((host, port)) == 0


def _pids_on_port(port):
    """Best-effort: PIDs LISTENING on `port`. Empty on failure (non-fatal)."""
    import subprocess
    pids = set()
    try:
        if sys.platform == "win32":
            out = subprocess.run(
                ["netstat", "-ano", "-p", "TCP"],
                capture_output=True, text=True, timeout=10,
            ).stdout
            for line in out.splitlines():
                parts = line.split()
                if len(parts) >= 5 and parts[-1].isdigit() and "LISTENING" in line:
                    if parts[1].endswith(f":{port}"):
                        pids.add(int(parts[-1]))
        else:
            out = subprocess.run(
                ["lsof", "-ti", f"tcp:{port}", "-sTCP:LISTEN"],
                capture_output=True, text=True, timeout=10,
            ).stdout
            pids.update(int(p) for p in out.split() if p.strip().isdigit())
    except Exception as e:
        print(f"[WARN] couldn't inspect port {port}: {type(e).__name__}: {e}")
    return sorted(pids)


def _free_port(host, port):
    """Kill whatever is LISTENING on `port` so the launcher can bind it."""
    import subprocess
    if not _port_in_use(host, port):
        return
    pids = _pids_on_port(port)
    if not pids:
        print(f"[WARN] port {port} is busy but I couldn't find the owner - "
              f"start may fail. Use --port to pick another.")
        return
    own = os.getpid()
    for pid in pids:
        if pid in (0, own):
            continue
        print(f"[INFO] freeing port {port}: stopping pid {pid}")
        try:
            if sys.platform == "win32":
                subprocess.run(["taskkill", "/F", "/PID", str(pid)],
                               capture_output=True, timeout=10)
            else:
                os.kill(pid, 9)
        except Exception as e:
            print(f"[WARN] couldn't stop pid {pid}: {type(e).__name__}: {e}")


def _resolve_page(page):
    """Turn 'tools', 'tools.html' or 'en/tools' into a path under docs/.

    Returns the request path (e.g. '/tools.html'), or None if no such page.
    """
    if not page:
        return "/index.html"

    rel = page.strip().lstrip("/").replace("\\", "/")
    if not rel.endswith(".html"):
        rel += ".html"

    # Keep the lookup inside docs/ - no traversing out of the served tree.
    target = os.path.normpath(os.path.join(DOCS_DIR, rel))
    if not target.startswith(DOCS_DIR + os.sep):
        print(f"[WARN] '{page}' points outside docs/ - opening the home page.")
        return "/index.html"

    if not os.path.isfile(target):
        available = sorted(
            f[:-5] for f in os.listdir(DOCS_DIR) if f.endswith(".html")
        )
        print(f"[WARN] no page '{rel}' in docs/ - opening the home page.")
        print(f"[INFO] pages: {', '.join(available)} (or en/<name>)")
        return "/index.html"

    return "/" + rel


def make_handler():
    """A no-cache static handler rooted at docs/.

    No-cache matters here: without it Chrome serves a stale copy of a page you
    just edited, and you end up debugging a file the browser never re-read.
    """
    from http.server import SimpleHTTPRequestHandler

    class PreviewHandler(SimpleHTTPRequestHandler):
        def __init__(self, *args, **kwargs):
            super().__init__(*args, directory=DOCS_DIR, **kwargs)

        def end_headers(self):
            self.send_header("Cache-Control",
                             "no-store, no-cache, must-revalidate, max-age=0")
            self.send_header("Pragma", "no-cache")
            self.send_header("Expires", "0")
            super().end_headers()

        def log_message(self, fmt, *args):
            # One tidy line per request; skip the default stderr noise.
            print(f"[{self.log_date_time_string()}] {fmt % args}")

    return PreviewHandler


def main():
    import argparse
    import threading
    import webbrowser
    from http.server import ThreadingHTTPServer

    parser = argparse.ArgumentParser(
        description="Serve 8bitretro.tech from docs/ and open it in a browser.")
    parser.add_argument("--host", default=DEFAULT_HOST)
    parser.add_argument("--port", type=int, default=DEFAULT_PORT)
    parser.add_argument("--page", default="index",
                        help="page to open: index, tools, releases, en/tools, ...")
    parser.add_argument("--no-browser", action="store_true",
                        help="don't auto-open the browser")
    parser.add_argument("--keep-port", action="store_true",
                        help="don't free the port if it's already in use")
    args = parser.parse_args()

    if not os.path.isdir(DOCS_DIR):
        print(f"[ERROR] no docs/ directory next to app.py (looked in {DOCS_DIR}).")
        return 1

    if not args.keep_port:
        _free_port(args.host, args.port)

    path = _resolve_page(args.page)
    url = f"http://{args.host}:{args.port}{path}"

    httpd = ThreadingHTTPServer((args.host, args.port), make_handler())

    print("Starting the 8bitretro.tech preview server...")
    print(f"[INFO] serving {DOCS_DIR}")
    print(f"[INFO] site -> {url}  (Ctrl+C to stop)")
    if not args.no_browser:
        # serve_forever() blocks, so open the tab a moment after we start.
        threading.Timer(1.0, lambda: webbrowser.open(url)).start()

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n[INFO] stopped.")
    finally:
        httpd.server_close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
