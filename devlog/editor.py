#!/usr/bin/env python3
"""Devlog editor: a small local web app for writing the Fist II Remaster devlog.

    python devlog/editor.py              # serve on http://127.0.0.1:5120 and open a tab
    python devlog/editor.py --no-browser # just serve
    python devlog/editor.py --port 5121  # another port

Standard library only, like app.py. It edits devlog/posts.json and devlog/posts/<slug>.<lang>.html,
runs build.py for previews, and can ask Claude to translate a post or draft one from the game repo
(needs ANTHROPIC_API_KEY in the environment or in devlog/.env). See devlog/README.md.
"""
import argparse
import base64
import datetime
import hmac
import json
import os
import pathlib
import re
import secrets
import subprocess
import sys
import threading
import urllib.error
import urllib.parse
import urllib.request
import webbrowser
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

HERE = pathlib.Path(__file__).resolve().parent            # devlog/
REPO = HERE.parent
SITE = REPO / "docs"
IMG_DIR = SITE / "assets" / "images" / "devlog"
STATIC = HERE / "editor"
POSTS_JSON = HERE / "posts.json"
POSTS_DIR = HERE / "posts"
GAME_REPO = pathlib.Path(r"C:\ClaudeSandbox\C64 first demo\Fist II Remaster")

sys.path.insert(0, str(HERE))
import build  # noqa: E402  (devlog/build.py)

for _stream in (sys.stdout, sys.stderr):
    if hasattr(_stream, "reconfigure"):
        _stream.reconfigure(encoding="utf-8", errors="replace")

# A fresh secret per run. The page gets it in a <meta> tag and sends it as X-Editor-Token on every
# /api call, so another website open in the same browser can't drive the API (CSRF); the Host check
# below stops DNS rebinding. Nothing here sends CORS headers, so cross-site preflights always fail.
TOKEN = secrets.token_urlsafe(32)
PORT = 5120

LOCK = threading.Lock()          # one writer at a time for posts.json / git
IMG_EXT = {".png": "image/png", ".gif": "image/gif", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp"}
MAX_UPLOAD = 5 * 1024 * 1024
SLUG_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
PUBLISH_PATHS = ["devlog", "docs/devlog*.html", "docs/en/devlog*.html", "docs/assets/images/devlog"]


class UserError(Exception):
    """An error with a message meant for Alex, shown as a toast."""


# ── Israel time ──────────────────────────────────────────────────────────────

def _last_sunday(year, month):
    d = datetime.date(year, month + 1, 1) - datetime.timedelta(days=1) if month < 12 else datetime.date(year, 12, 31)
    return d - datetime.timedelta(days=(d.weekday() + 1) % 7)


def israel_offset(local):
    """UTC offset of a naive Israel wall-clock time: +03:00 in summer, +02:00 in winter."""
    try:
        from zoneinfo import ZoneInfo
        return local.replace(tzinfo=ZoneInfo("Asia/Jerusalem")).utcoffset()
    except Exception:
        # Fixed rule (since 2013): summer time from the Friday before the last Sunday of March, 02:00,
        # to the last Sunday of October, 02:00.
        start = datetime.datetime.combine(_last_sunday(local.year, 3) - datetime.timedelta(days=2), datetime.time(2))
        end = datetime.datetime.combine(_last_sunday(local.year, 10), datetime.time(2))
        return datetime.timedelta(hours=3 if start <= local < end else 2)


def israel_when(local_str):
    """'2026-10-15T21:30' -> '2026-10-15T21:30:00+03:00'."""
    local = datetime.datetime.fromisoformat(local_str[:16])
    off = int(israel_offset(local).total_seconds() // 60)
    return local.strftime("%Y-%m-%dT%H:%M:00") + f"{'+' if off >= 0 else '-'}{abs(off) // 60:02d}:{abs(off) % 60:02d}"


def israel_now():
    try:
        from zoneinfo import ZoneInfo
        return datetime.datetime.now(ZoneInfo("Asia/Jerusalem")).replace(tzinfo=None)
    except Exception:
        utc = datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)
        return utc + israel_offset(utc + datetime.timedelta(hours=2))


# ── Files: keep each file's line endings so an untouched save is byte-identical ──

def read_text(path):
    raw = path.read_bytes().decode("utf-8")
    return raw.replace("\r\n", "\n"), ("\r\n" if "\r\n" in raw else "\n")


def write_text(path, text, eol=None):
    if eol is None:
        eol = read_text(path)[1] if path.exists() else os.linesep
    text = text.replace("\r\n", "\n")
    if text and not text.endswith("\n"):
        text += "\n"
    path.write_bytes(text.replace("\n", eol).encode("utf-8"))


def load_data():
    text, _ = read_text(POSTS_JSON)
    return json.loads(text)


def save_data(data):
    write_text(POSTS_JSON, json.dumps(data, indent=2, ensure_ascii=False) + "\n")


def body_path(slug, lang):
    if not SLUG_RE.match(slug):
        raise UserError("That slug isn't valid.")
    return POSTS_DIR / f"{slug}.{lang}.html"


def find_post(data, slug):
    for p in data["posts"]:
        if p["slug"] == slug:
            return p
    raise UserError(f"No post called '{slug}'.")


def published_sorted(data):
    return sorted([p for p in data["posts"] if not p.get("draft")], key=lambda p: p["when"])


# ── API handlers ─────────────────────────────────────────────────────────────

META_FIELDS = ["when", "kicker", "kicker_short", "title_en", "title_he", "teaser_en", "teaser_he", "banner", "thumb",
               "banner_alt_en", "banner_alt_he", "banner_caption_en", "banner_caption_he", "draft"]


def api_posts():
    data = load_data()
    pub = published_sorted(data)
    number = {p["slug"]: i + 1 for i, p in enumerate(pub)}
    out = []
    for p in sorted(data["posts"], key=lambda p: p["when"], reverse=True):
        out.append({"slug": p["slug"], "n": number.get(p["slug"]), "title_en": p.get("title_en", ""),
                    "title_he": p.get("title_he", ""), "when": p["when"], "draft": bool(p.get("draft")),
                    "thumb": p.get("thumb") or p.get("banner") or ""})
    return {"posts": out}


def api_get_post(slug):
    data = load_data()
    post = find_post(data, slug)
    bodies = {}
    for lang in ("en", "he"):
        path = body_path(slug, lang)
        bodies[lang] = read_text(path)[0] if path.exists() else ""
    return {"post": post, "body_en": bodies["en"], "body_he": bodies["he"]}


def api_save_post(slug, req):
    with LOCK:
        data = load_data()
        post = find_post(data, slug)
        meta = req.get("post") or {}
        if meta.get("when_local"):
            meta["when"] = israel_when(meta["when_local"])
        for key in META_FIELDS:
            if key not in meta:
                continue
            val = meta[key]
            if key == "draft":
                val = True if val else None
            if key == "thumb" and not val:
                val = None
            if val is None:
                post.pop(key, None)
            elif key in post:
                post[key] = val                     # keeps the key's place in the file
            else:
                post[key] = val
        save_data(data)
        for lang in ("en", "he"):
            key = "body_" + lang
            if key in req and req[key] is not None:
                path = body_path(slug, lang)
                new = req[key].replace("\r\n", "\n")
                if path.exists() and read_text(path)[0] == new:
                    continue                        # untouched: don't even rewrite it
                write_text(path, new)
    return {"ok": True, "post": post}


def slugify(title):
    s = re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")
    return re.sub(r"-{2,}", "-", s)[:60].strip("-")


def api_new_post(req):
    title = (req.get("title") or "").strip()
    slug = slugify(req.get("slug") or title)
    if not slug:
        raise UserError("Give the post a title with some letters or numbers in it (English).")
    with LOCK:
        data = load_data()
        if any(p["slug"] == slug for p in data["posts"]):
            raise UserError(f"There is already a post called '{slug}'. Pick another title.")
        post = {
            "slug": slug,
            "when": israel_when(israel_now().strftime("%Y-%m-%dT%H:%M")),
            "kicker": "FIST II REMASTER",
            "kicker_short": "Fist II Remaster",
            "title_en": title,
            "title_he": "",
            "teaser_en": "",
            "teaser_he": "",
            "banner": "",
            "banner_alt_en": "",
            "banner_alt_he": "",
            "banner_caption_en": "",
            "banner_caption_he": "",
            "draft": True,
        }
        data["posts"].append(post)
        save_data(data)
        for lang in ("en", "he"):
            path = body_path(slug, lang)
            if not path.exists():
                write_text(path, "", eol=os.linesep)
    return {"ok": True, "slug": slug}


def api_delete_post(slug):
    with LOCK:
        data = load_data()
        post = find_post(data, slug)
        data["posts"].remove(post)
        save_data(data)
        for lang in ("en", "he"):
            path = body_path(slug, lang)
            if path.exists():
                path.unlink()
        # A published post leaves generated pages behind; rebuild and remove them.
        for page in (SITE / f"devlog-{slug}.html", SITE / "en" / f"devlog-{slug}.html"):
            if page.exists():
                page.unlink()
        rebuild()
    return {"ok": True}


def api_images():
    files = [f for f in IMG_DIR.iterdir() if f.suffix.lower() in IMG_EXT]
    files.sort(key=lambda f: f.stat().st_mtime, reverse=True)
    return {"images": [{"name": f.name, "size": f.stat().st_size} for f in files]}


def _sniff(data):
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return ".png"
    if data[:6] in (b"GIF87a", b"GIF89a"):
        return ".gif"
    if data[:3] == b"\xff\xd8\xff":
        return ".jpg"
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return ".webp"
    return None


def api_upload(req):
    name = req.get("name") or "image.png"
    try:
        blob = base64.b64decode(req.get("data") or "", validate=False)
    except Exception:
        raise UserError("That upload didn't arrive in one piece. Try again.")
    if not blob:
        raise UserError("The file is empty.")
    if len(blob) > MAX_UPLOAD:
        raise UserError(f"That image is {len(blob) / 1048576:.1f} MB; the limit is 5 MB.")
    kind = _sniff(blob)
    if not kind:
        raise UserError("Only PNG, GIF, JPG and WEBP images can be added.")
    stem = pathlib.PurePath(name).stem.lower()
    stem = re.sub(r"[^a-z0-9._-]+", "-", stem).strip("-._") or "image"
    stem = stem[:60]
    if not stem.startswith("fist2-"):
        stem = "fist2-" + stem
    target = IMG_DIR / (stem + kind)
    n = 2
    while target.exists():
        target = IMG_DIR / f"{stem}-{n}{kind}"
        n += 1
    target.write_bytes(blob)
    return {"ok": True, "name": target.name}


def api_icons():
    return {"icons": list(build.ICONS)}


def icon_svg(name, colour="#f9a8d4"):
    rows = build.ICONS[name]
    rects = "".join(f'<rect x="{x}" y="{y}" width="1" height="1"/>'
                    for y, row in enumerate(rows) for x, c in enumerate(row) if c == "#")
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 8 8" fill="{colour}" '
            f'shape-rendering="crispEdges">{rects}</svg>')


def rebuild():
    """build.py, plus: a post switched back to draft must not leave its old pages behind."""
    n = build.build_all()
    for post in load_data()["posts"]:
        if post.get("draft"):
            for page in (SITE / f"devlog-{post['slug']}.html", SITE / "en" / f"devlog-{post['slug']}.html"):
                if page.exists():
                    page.unlink()
    return n


def api_build():
    with LOCK:
        n = rebuild()
    return {"ok": True, "built": n}


# ── git / gh ─────────────────────────────────────────────────────────────────

def run(cmd, cwd=REPO, timeout=120):
    try:
        r = subprocess.run(cmd, cwd=str(cwd), capture_output=True, text=True, encoding="utf-8",
                           errors="replace", timeout=timeout)
    except FileNotFoundError:
        raise UserError(f"'{cmd[0]}' isn't installed or not on PATH.")
    except subprocess.TimeoutExpired:
        raise UserError(f"'{' '.join(cmd[:3])}' took too long and was stopped.")
    return r.returncode, r.stdout.rstrip(), r.stderr.strip()   # rstrip: porcelain lines start with a space


def must(cmd, cwd=REPO, timeout=120):
    code, out, err = run(cmd, cwd, timeout)
    if code != 0:
        raise UserError(f"{' '.join(cmd[:3])} failed:\n{err or out}")
    return out


def publish_allowed(path):
    path = path.replace("\\", "/")
    if path.startswith("devlog/") or path.startswith("docs/assets/images/devlog/"):
        return True
    return bool(re.fullmatch(r"docs/(en/)?devlog[^/]*\.html", path))


def blocking_changes():
    out = must(["git", "status", "--porcelain", "-uall"])
    blocked = []
    for line in out.splitlines():
        path = line[3:]
        if " -> " in path:
            path = path.split(" -> ", 1)[1]
        path = path.strip('"')
        if not publish_allowed(path):
            blocked.append(line)
    return blocked


def publish_plan(post, branch, prev):
    title = post["title_en"] or post["slug"]
    body = (f"New devlog post: **{title}**\n\n"
            f"- Hebrew: {post.get('title_he') or '(no Hebrew title yet)'}\n"
            f"- Date: {post['when']}\n"
            f"- Pages: `docs/devlog-{post['slug']}.html`, `docs/en/devlog-{post['slug']}.html`\n\n"
            "Published from the devlog editor.")
    return [
        ["git", "checkout", "-b", branch],
        ["git", "add", "-A", "--"] + PUBLISH_PATHS,
        ["git", "commit", "-m", f"devlog: {title}"],
        ["git", "push", "-u", "origin", branch],
        ["gh", "pr", "create", "--base", "main", "--head", branch, "--title", f"devlog: {title}", "--body", body],
        ["git", "checkout", prev],
    ]


def api_publish(slug, req):
    dry = bool(req.get("dry_run"))
    with LOCK:
        data = load_data()
        post = find_post(data, slug)
        if post.get("draft"):
            raise UserError("This post is still a draft. Switch off 'Draft' and save, then publish.")
        if not (post.get("title_en") and post.get("title_he")):
            raise UserError("Give the post both an English and a Hebrew title before publishing.")
        rebuild()
        blocked = blocking_changes()
        if blocked:
            return {"ok": False, "blocked": blocked}
        prev = must(["git", "rev-parse", "--abbrev-ref", "HEAD"])
        if prev == "HEAD":
            raise UserError("git is not on a branch (detached HEAD). Check out a branch first.")
        stamp = israel_now().strftime("%Y%m%d-%H%M")
        branch = f"devlog/{slug}-{stamp}"
        plan = publish_plan(post, branch, prev)
        if dry:
            return {"ok": True, "dry_run": True, "commands": plan}
        if not must(["git", "status", "--porcelain", "--"] + PUBLISH_PATHS):
            raise UserError("Nothing to publish: there are no changes in the devlog since the last commit.")
        url = ""
        done = []
        try:
            for cmd in plan[:-1]:
                out = must(cmd, timeout=180)
                done.append(cmd[:2])
                if cmd[0] == "gh":
                    url = out.splitlines()[-1] if out else ""
        finally:
            if done:                                  # always go back to where Alex was
                run(plan[-1])
    return {"ok": True, "branch": branch, "url": url, "back_on": prev}


# ── Game repo: what changed since the last post ──────────────────────────────

def api_repo_changes():
    if not GAME_REPO.exists():
        raise UserError(f"Can't find the game repo at {GAME_REPO}.")
    data = load_data()
    pub = published_sorted(data)
    since = pub[-1]["when"] if pub else "2026-01-01T00:00:00+03:00"
    since_dt = datetime.datetime.fromisoformat(since)
    run(["git", "fetch", "-q"], cwd=GAME_REPO, timeout=60)       # read-only for the working tree
    code, head, _ = run(["git", "rev-parse", "--abbrev-ref", "origin/HEAD"], cwd=GAME_REPO)
    ref = head if code == 0 and head else "HEAD"
    log = must(["git", "log", ref, "--first-parent", f"--since={since}", "--format=%H%x1f%cI%x1f%s%x1f%b%x1e"],
               cwd=GAME_REPO)
    commits = []
    for rec in log.split("\x1e"):
        parts = rec.strip().split("\x1f")
        if len(parts) < 3:
            continue
        sha, when, subj = parts[0], parts[1], parts[2]
        body = parts[3].strip() if len(parts) > 3 else ""
        if subj.startswith("Merge pull request"):
            continue                                 # PRs are listed on their own
        commits.append({"sha": sha, "short": sha[:7], "when": when, "subject": subj, "body": body})
    out = must(["gh", "pr", "list", "--state", "merged", "--limit", "100",
                "--json", "number,title,body,mergedAt"], cwd=GAME_REPO, timeout=60)
    prs = []
    for pr in json.loads(out or "[]"):
        merged = datetime.datetime.fromisoformat(pr["mergedAt"].replace("Z", "+00:00"))
        if merged > since_dt:
            prs.append(pr)
    prs.sort(key=lambda p: p["mergedAt"])
    return {"since": since, "since_title": pub[-1]["title_en"] if pub else "", "prs": prs, "commits": commits}


# ── Claude API (Messages API over urllib) ────────────────────────────────────

MODEL = "claude-opus-5-5"
API_URL = "https://api.anthropic.com/v1/messages"
NO_KEY = ("No Claude API key yet. Create devlog/.env with one line:  ANTHROPIC_API_KEY=sk-ant-...  "
          "(or set the ANTHROPIC_API_KEY environment variable), then restart the editor. "
          "Everything else works without it.")


def api_key():
    key = os.environ.get("ANTHROPIC_API_KEY", "").strip()
    if key:
        return key
    env = HERE / ".env"
    if env.exists():
        for line in env.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line.startswith("ANTHROPIC_API_KEY") and "=" in line:
                return line.split("=", 1)[1].strip().strip('"').strip("'")
    return ""


def claude_json(system, user, schema, effort="medium"):
    """One Messages API call whose answer is JSON matching `schema`."""
    key = api_key()
    if not key:
        raise UserError(NO_KEY)
    payload = {
        "model": MODEL,
        "max_tokens": 16000,
        "thinking": {"type": "adaptive"},
        "output_config": {"effort": effort, "format": {"type": "json_schema", "schema": schema}},
        "fallbacks": "default",                       # a declined request is re-run on Anthropic's pick
        "system": [{"type": "text", "text": system, "cache_control": {"type": "ephemeral"}}],
        "messages": [{"role": "user", "content": user}],
    }
    req = urllib.request.Request(API_URL, data=json.dumps(payload).encode("utf-8"), method="POST", headers={
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "anthropic-beta": "server-side-fallback-2026-07-01",
    })
    try:
        with urllib.request.urlopen(req, timeout=600) as r:
            resp = json.loads(r.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        detail = ""
        try:
            detail = json.loads(e.read().decode("utf-8")).get("error", {}).get("message", "")
        except Exception:
            pass
        if e.code == 401:
            raise UserError("Claude didn't accept the API key (401). Check the key in devlog/.env.")
        if e.code == 429:
            raise UserError("Claude is rate-limiting us right now (429). Wait a minute and try again.")
        raise UserError(f"Claude API error {e.code}: {detail or e.reason}")
    except urllib.error.URLError as e:
        raise UserError(f"Couldn't reach the Claude API: {e.reason}")
    if resp.get("stop_reason") == "refusal":
        raise UserError("Claude declined this request. Try again with different material.")
    if resp.get("stop_reason") == "max_tokens":
        raise UserError("Claude's answer was too long and got cut off. Try a shorter post.")
    text = "".join(b.get("text", "") for b in resp.get("content", []) if b.get("type") == "text")
    try:
        return json.loads(text)
    except ValueError:
        raise UserError("Claude's answer wasn't in the expected format. Try again.")


HOUSE_MARKUP = """The post body is an HTML fragment (no <html>/<body>) styled with Tailwind classes. Tokens:
{IMG} is the image folder prefix (e.g. <img src="{IMG}fist2-x.png">), {icon:NAME} is an 8x8 pixel icon placed
at the start of a section heading. Available icons: ICONS.
Building blocks, exactly as the existing posts use them:
- Lead paragraph (once, at the top): <p class="mt-6 text-base text-sky-100/95 leading-relaxed">...</p>
- Text sections: <div class="mt-8 space-y-4 text-sm md:text-[15px] text-sky-100/85 leading-relaxed"> with
  <h2 class="text-lg text-cyan-100">{icon:NAME}Heading</h2> (later headings in the same div add " pt-2" to the class)
  and plain <p> paragraphs; later section divs use "mt-6" instead of "mt-8".
- Inline code: <code class="text-cyan-300">...</code>
- Lists: <ul class="list-disc ms-5 space-y-2"><li>...</li></ul>
- Number tiles: <div class="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4"> holding tiles like
  <div class="rounded-xl p-4 bg-black/50 border border-pink-400/30"><p class="[font-family:'Press Start 2P',monospace] text-[9px] tracking-widest text-pink-300">LABEL</p><p class="mt-3 text-2xl text-pink-200">VALUE</p></div>
  (cyan variant: border-cyan-400/30, text-cyan-300, text-cyan-200).
- HTML entities as in the posts: &middot; &rarr; &times; &ndash;."""

FACT_RULES = """Hard rules:
- Use ONLY facts that appear in the material you are given. Never invent experiences, feelings, opinions,
  motives, anecdotes, numbers, dates, times or results. If the material is thin, write a shorter post; never pad.
- Numbers, version tags, addresses, file names and code identifiers are copied exactly as given.
- Write like a developer telling friends what happened: plain, concrete, short sentences, a little dry humour
  only when the material itself is funny. No hype, no marketing words, no "In this post we will".
- "We" is Alex and Claude working together on the game; it's Alex's devlog.
- Do not add images (Alex adds screenshots himself)."""

TRANSLATE_HE_RULES = """Hebrew rules:
- Natural, spoken-but-tidy Israeli Hebrew, the way a developer writes a blog post. Not a word-for-word translation.
- Program, product and technical names stay in English letters: C64, SID, VIC, VICE, Photoshop, SpritePad, CharPad,
  KickAssembler, multicolor, raster, sprite names, file names, version tags (v3.2-alpha), addresses ($C000), code.
  Never transliterate them into Hebrew letters.
- A Hebrew prefix letter attached to an English/Latin word or a number gets a maqaf: ב־C64, ל־SpritePad, ה־SID, מ־1986, ב־50 Hz.
  Use the real maqaf character "־" (U+05BE), not a hyphen.
- Inside Hebrew text, wrap a run that starts with Latin text, a time or a version and reads left-to-right in
  <bdi dir="ltr">...</bdi> when it would otherwise display in the wrong order (e.g. headings like "12:12 &middot; v1.0-baseline",
  inline <code>), exactly as the reference Hebrew post does."""

TRANSLATE_COMMON = """Translation rules:
- Translate the meaning, keep every fact, number, name and the order of sections. Add nothing, drop nothing.
- The body is HTML: keep every tag, attribute, class and the structure exactly. Translate only human-readable text,
  plus the alt text of images. Keep the tokens {IMG}... and {icon:NAME} exactly where they are.
- Keep code, addresses, file names, URLs and HTML entities (&middot; &rarr; ...) unchanged.
- Fields that are empty in the source stay empty."""

TRANSLATE_SCHEMA = {
    "type": "object",
    "properties": {k: {"type": "string"} for k in ("title", "teaser", "banner_alt", "banner_caption", "body")},
    "required": ["title", "teaser", "banner_alt", "banner_caption", "body"],
    "additionalProperties": False,
}

DRAFT_SCHEMA = {
    "type": "object",
    "properties": {k: {"type": "string"} for k in ("title_en", "teaser_en", "kicker", "body_en")},
    "required": ["title_en", "teaser_en", "kicker", "body_en"],
    "additionalProperties": False,
}


def reference_pair():
    """One published post in both languages, as a style reference."""
    data = load_data()
    pub = published_sorted(data)
    ref = next((p for p in pub if p["slug"] == "the-giant-day"), pub[-1] if pub else None)
    if not ref:
        return None, "", ""
    return ref, read_text(body_path(ref["slug"], "en"))[0], read_text(body_path(ref["slug"], "he"))[0]


def api_translate(req):
    direction = req.get("direction")
    if direction not in ("en2he", "he2en"):
        raise UserError("Unknown translation direction.")
    src, dst = ("English", "Hebrew") if direction == "en2he" else ("Hebrew", "English")
    fields = {k: (req.get("fields") or {}).get(k, "") for k in ("title", "teaser", "banner_alt", "banner_caption", "body")}
    if not any(v.strip() for v in fields.values()):
        raise UserError(f"The {src} side is empty, so there is nothing to translate.")
    ref, ref_en, ref_he = reference_pair()
    system = (f"You translate posts of Alex Goldblat's game devlog (a Commodore 64 beat'em-up, Fist II Remaster) "
              f"from {src} to {dst}. The site is bilingual; both versions must say the same thing.\n\n"
              + TRANSLATE_COMMON + "\n\n" + TRANSLATE_HE_RULES + "\n\n" + HOUSE_MARKUP.replace("ICONS", ", ".join(build.ICONS)))
    if ref:
        system += ("\n\n<reference_post>\nA published post in both languages; match its Hebrew style and markup habits.\n"
                   f"<english title=\"{ref['title_en']}\">\n{ref_en}\n</english>\n"
                   f"<hebrew title=\"{ref['title_he']}\">\n{ref_he}\n</hebrew>\n</reference_post>")
    user = (f"Translate these fields of a devlog post from {src} to {dst}. Return the same five fields.\n\n"
            + "\n".join(f"<{k}>\n{v}\n</{k}>" for k, v in fields.items()))
    return {"ok": True, "fields": claude_json(system, user, TRANSLATE_SCHEMA)}


def api_draft(req):
    prs = req.get("prs") or []
    commits = req.get("commits") or []
    if not prs and not commits:
        raise UserError("Tick at least one PR or commit to write about.")
    parts = []
    for pr in prs:
        parts.append(f"<pr number=\"{pr.get('number')}\" merged=\"{pr.get('mergedAt', '')}\">\n<title>{pr.get('title', '')}</title>\n"
                     f"<body>\n{pr.get('body', '')}\n</body>\n</pr>")
    for c in commits:
        parts.append(f"<commit sha=\"{c.get('short', '')}\" when=\"{c.get('when', '')}\">\n{c.get('subject', '')}\n{c.get('body', '')}\n</commit>")
    ref, ref_en, _ = reference_pair()
    system = ("You draft posts for Alex Goldblat's game devlog: Fist II Remaster, a Commodore 64 beat'em-up built on the "
              "1986 Fist II engine. Alex edits every draft before it goes out.\n\n" + FACT_RULES + "\n\n"
              + HOUSE_MARKUP.replace("ICONS", ", ".join(build.ICONS)))
    if ref:
        system += f"\n\n<reference_post title=\"{ref['title_en']}\">\nA published post: match its tone, length per section and markup.\n{ref_en}\n</reference_post>"
    user = ("Here is everything that was merged into the game since the last devlog post. Draft a SHORT, interesting "
            "English post about it: a lead paragraph, then 2-4 short sections with headings and icons; number tiles only "
            "if the material has striking numbers. Pick what a C64 fan would find interesting; skip housekeeping.\n"
            "Also give a short title (a few words), a one-sentence teaser for the index page, and a kicker in capitals "
            "like \"FIST II REMASTER &middot; V3.3-ALPHA\" (just \"FIST II REMASTER\" if no version is in the material).\n\n"
            "<material>\n" + "\n\n".join(parts) + "\n</material>")
    return {"ok": True, "draft": claude_json(system, user, DRAFT_SCHEMA, effort="high")}


def api_status():
    code, branch, _ = run(["git", "rev-parse", "--abbrev-ref", "HEAD"])
    return {"has_key": bool(api_key()), "branch": branch if code == 0 else "?",
            "game_repo": GAME_REPO.exists(), "icons": build.ICONS}


# ── HTTP ─────────────────────────────────────────────────────────────────────

class Handler(SimpleHTTPRequestHandler):
    server_version = "DevlogEditor/1.0"

    def log_message(self, fmt, *args):
        sys.stderr.write("[editor] " + (fmt % args) + "\n")

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def _json(self, obj, status=200):
        body = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _bytes(self, data, ctype, status=200):
        self.send_response(status)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def _file(self, path, root):
        try:
            path = path.resolve()
            path.relative_to(root.resolve())
        except (ValueError, OSError):
            return self._bytes(b"not found", "text/plain", 404)
        if path.is_dir():
            path = path / "index.html"
        if not path.is_file():
            return self._bytes(b"not found", "text/plain", 404)
        ctype = self.guess_type(str(path))
        if ctype.startswith("text/") or ctype in ("application/javascript",):
            ctype += "; charset=utf-8"
        return self._bytes(path.read_bytes(), ctype)

    def _body(self):
        n = int(self.headers.get("Content-Length") or 0)
        if n > MAX_UPLOAD * 2:
            raise UserError("That request is too big.")
        raw = self.rfile.read(n) if n else b""
        return json.loads(raw.decode("utf-8")) if raw else {}

    def _guard(self, fn, *args):
        try:
            return self._json(fn(*args))
        except UserError as e:
            return self._json({"ok": False, "error": str(e)}, 400)
        except Exception as e:                        # show it in the UI instead of a dead request
            import traceback
            traceback.print_exc()
            return self._json({"ok": False, "error": f"Something went wrong: {type(e).__name__}: {e}"}, 500)

    def _local_only(self):
        host = (self.headers.get("Host") or "").lower()
        if host not in (f"127.0.0.1:{PORT}", f"localhost:{PORT}"):
            self._bytes(b"forbidden", "text/plain", 403)
            return False
        return True

    def _token_ok(self):
        got = self.headers.get("X-Editor-Token") or ""
        if not hmac.compare_digest(got.encode(), TOKEN.encode()):
            self._json({"ok": False, "error": "Forbidden: missing or wrong editor token. Reload the page."}, 403)
            return False
        return True

    def _post_ok(self):
        origin = self.headers.get("Origin")
        if origin is not None and origin not in (f"http://127.0.0.1:{PORT}", f"http://localhost:{PORT}"):
            self._json({"ok": False, "error": "Forbidden origin."}, 403)
            return False
        ctype = (self.headers.get("Content-Type") or "").split(";")[0].strip().lower()
        if ctype != "application/json":
            self._json({"ok": False, "error": "Expected application/json."}, 403)
            return False
        return self._token_ok()

    def do_OPTIONS(self):                                  # never approve a CORS preflight
        self._bytes(b"method not allowed", "text/plain", 405)

    def do_GET(self):
        if not self._local_only():
            return
        url = urllib.parse.urlparse(self.path)
        path = urllib.parse.unquote(url.path)
        if path in ("/", "/index.html"):
            html = (STATIC / "index.html").read_text(encoding="utf-8")
            html = html.replace("</head>", f'  <meta name="editor-token" content="{TOKEN}" />\n</head>', 1)
            return self._bytes(html.encode("utf-8"), "text/html; charset=utf-8")
        if path.startswith("/api/") and not self._token_ok():
            return
        if path.startswith("/static/"):
            return self._file(STATIC / path[len("/static/"):], STATIC)
        if path.startswith("/img/"):
            return self._file(IMG_DIR / path[len("/img/"):], IMG_DIR)
        if path.startswith("/icon/") and path.endswith(".svg"):
            name = path[len("/icon/"):-4]
            if name in build.ICONS:
                return self._bytes(icon_svg(name).encode(), "image/svg+xml")
            return self._bytes(b"not found", "text/plain", 404)
        m = re.fullmatch(r"/site/(en/)?__preview-([a-z0-9-]+)\.html", path)
        if m:
            try:
                html = build.preview_html(m.group(2), "en" if m.group(1) else "he")
            except KeyError:
                return self._bytes(b"no such post", "text/plain", 404)
            banner = ('<div style="position:fixed;bottom:12px;left:12px;z-index:99;font:10px \'Press Start 2P\',monospace;'
                      'background:#ff2dd2;color:#000;padding:8px 10px;border-radius:6px;box-shadow:0 0 18px #ff2dd2">PREVIEW</div>')
            return self._bytes(html.replace("</body>", banner + "</body>", 1).encode("utf-8"), "text/html; charset=utf-8")
        if path.startswith("/site/"):
            return self._file(SITE / path[len("/site/"):], SITE)
        if path == "/api/status":
            return self._guard(api_status)
        if path == "/api/posts":
            return self._guard(api_posts)
        if path.startswith("/api/post/"):
            return self._guard(api_get_post, path[len("/api/post/"):])
        if path == "/api/images":
            return self._guard(api_images)
        if path == "/api/repo-changes":
            return self._guard(api_repo_changes)
        return self._bytes(b"not found", "text/plain", 404)

    def do_POST(self):
        if not self._local_only():
            return
        path = urllib.parse.urlparse(self.path).path
        if not self._post_ok():
            return
        try:
            req = self._body()
        except (UserError, ValueError) as e:
            return self._json({"ok": False, "error": str(e)}, 400)
        if path == "/api/new":
            return self._guard(api_new_post, req)
        if path.startswith("/api/post/"):
            return self._guard(api_save_post, path[len("/api/post/"):], req)
        if path.startswith("/api/delete/"):
            return self._guard(api_delete_post, path[len("/api/delete/"):])
        if path == "/api/upload":
            return self._guard(api_upload, req)
        if path == "/api/build":
            return self._guard(api_build)
        if path == "/api/translate":
            return self._guard(api_translate, req)
        if path == "/api/draft":
            return self._guard(api_draft, req)
        if path.startswith("/api/publish/"):
            return self._guard(api_publish, path[len("/api/publish/"):], req)
        return self._json({"ok": False, "error": "unknown endpoint"}, 404)


def main():
    ap = argparse.ArgumentParser(description="Local editor for the Fist II Remaster devlog.")
    ap.add_argument("--port", type=int, default=5120)
    ap.add_argument("--no-browser", action="store_true", help="don't open a browser tab")
    args = ap.parse_args()
    global PORT
    PORT = args.port
    try:
        httpd = ThreadingHTTPServer(("127.0.0.1", args.port), Handler)
    except OSError:
        print(f"Port {args.port} is busy. Is the editor already running? Try --port {args.port + 1}.")
        sys.exit(1)
    url = f"http://127.0.0.1:{args.port}/"
    print(f"Devlog editor on {url}  (Ctrl+C to stop)")
    if not args.no_browser:
        threading.Timer(0.6, lambda: webbrowser.open(url)).start()
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nbye")


if __name__ == "__main__":
    main()
