"""Devlog builder: devlog/posts.json + devlog/posts/<slug>.<lang>.html -> docs/ pages.

    python devlog/build.py

Run it after editing a post by hand; the devlog editor (devlog/editor.py) runs it for you.

Builds every post page (HE + EN), and both index pages, from the Tools page
template of each language. Posts are listed newest first; each post links to
its older and newer neighbour. {download:<file>|<version>} cards link betas from devlog/downloads/,
copied to docs/downloads/fist2/ only while a published post links them.
"""
import re, json, pathlib, datetime, shutil

HERE = pathlib.Path(__file__).resolve().parent          # devlog/
SITE = HERE.parent / "docs"
IMG_DIR = SITE / "assets" / "images" / "devlog"
DL_SRC = HERE / "downloads"                             # uploaded betas (tracked in git, never served)
DL_OUT = SITE / "downloads" / "fist2"                   # served copies: only what a published post links
DL_URL = "downloads/fist2/"
ACTIVE = " bg-white/10 shadow-[0_0_20px_rgba(0,255,243,0.4)]"

POSTS = []          # oldest first, filled by load()
DATA = {}


def load(include=None):
    """Read posts.json. Drafts are skipped, except the slug named in `include` (for previews)."""
    global POSTS, DATA
    DATA = json.loads((HERE / "posts.json").read_text(encoding="utf-8"))
    POSTS[:] = sorted([p for p in DATA["posts"] if not p.get("draft") or p["slug"] == include], key=lambda p: p["when"])

HE_MONTHS = ["ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני", "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"]
EN_MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]


# 8x8 pixel icons, drawn as SVG squares in the current text colour. Use {icon:name} in a body.
ICONS = {
    "tape":     ["########", "#......#", "#.#..#.#", "#......#", "#.####.#", "#.#..#.#", "########", "........"],
    "chip":     ["..#.#.#.", ".######.", "##....##", ".#.##.#.", "##.##.##", ".#....#.", ".######.", "..#.#.#."],
    "joystick": ["...##...", "...##...", "....#...", "....#...", "..####..", ".######.", ".######.", "........"],
    "bug":      ["#..##..#", ".######.", "##.##.##", ".######.", "##.##.##", ".######.", "#.####.#", "........"],
    "note":     ["..#####.", "..#...#.", "..#...#.", "..#...#.", "###.###.", "###.###.", "........", "........"],
    "map":      ["########", "#.#..#.#", "########", "#..#.#.#", "########", "#.#..#.#", "########", "........"],
    "fist":     [".####...", "#.#.##..", "######..", "######..", "#######.", ".######.", "..####..", "........"],
    "star":     ["...#....", "...#....", "#######.", ".#####..", "..###...", ".##.##..", "##...##.", "........"],
    "eye":      ["........", "..####..", ".#....#.", "#..##..#", "#..##..#", ".#....#.", "..####..", "........"],
    "ruler":    ["........", "########", "#.#.#.##", "#.#.#.##", "#......#", "########", "........", "........"],
    "page":     ["#######.", "#.....##", "#.###..#", "#......#", "#.####.#", "#......#", "#.###..#", "########"],
    "tool":     [".....##.", "....#..#", "....#.#.", "...###..", "..###...", ".###....", "###.....", "##......"],
    "clock":    ["..####..", ".#....#.", "#...#..#", "#...#..#", "#..##..#", "#......#", ".#....#.", "..####.."],
    "disk":     ["########", "#......#", "#..##..#", "#.#..#.#", "#..##..#", "#......#", "#...#..#", "########"],
}


def icon(name, cls="text-pink-300", size=18):
    rows = ICONS[name]
    rects = "".join(f'<rect x="{x}" y="{y}" width="1" height="1"/>'
                    for y, row in enumerate(rows) for x, c in enumerate(row) if c == "#")
    return (f'<svg class="shrink-0 {cls}" width="{size}" height="{size}" viewBox="0 0 8 8" fill="currentColor" '
            f'shape-rendering="crispEdges" aria-hidden="true" style="filter:drop-shadow(0 0 4px rgba(255,45,210,.55))">{rects}</svg>')


# ── Downloads: {download:<file>|<version>} alone in a paragraph of a body ─────
# The file lives in devlog/downloads/ (tracked in git, never served). A build copies it to
# docs/downloads/fist2/ only while a published post links it, and removes every file there that no
# published post links, so a draft's beta never reaches the site.
DL_EXT = (".prg", ".d64", ".d71", ".d81", ".crt")
DL_TOKEN = re.compile(r'\{download:([a-z0-9][a-z0-9._-]*)\|([^{}|<>"]{1,40})\}')
# Builds whose name has one of these as a separate word hold ripped third-party assets (Target Renegade
# graphics, the Heli Rescue tune). They are never published.
DL_FORBIDDEN = ("tr", "heli", "preview")


def forbidden_download(name):
    """True if "tr", "heli" or "preview" is a separate word of the name (fist2-tr.prg, heli-test.d64)."""
    return any(w in DL_FORBIDDEN for w in re.split(r"[^a-z0-9]+", name.lower()))


def download_tokens(body):
    return [(m.group(1), m.group(2).strip()) for m in DL_TOKEN.finditer(body)]


def download_info(name):
    """Size of a linked download; refuses ripped builds and files that aren't in devlog/downloads/."""
    if forbidden_download(name):
        raise ValueError(f"download {name}: builds named tr / heli / preview hold ripped assets and are never published")
    src = DL_SRC / name
    if src.suffix.lower() not in DL_EXT or not src.is_file():
        raise ValueError(f"download {name}: no such file in devlog/downloads/")
    return src.stat().st_size


def kb(size):
    return f"{max(1, -(-size // 1024))} KB"


def day(when, lang):
    d = datetime.datetime.fromisoformat(when)
    return f"{d.day} ב{HE_MONTHS[d.month - 1]} {d.year}" if lang == "he" else f"{d.day} {EN_MONTHS[d.month - 1]} {d.year}"


def htmlesc(s):
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace('"', "&quot;")


BETA_TAG = ('<span dir="ltr" class="[font-family:\'Press Start 2P\',monospace] text-[8px] leading-none tracking-widest text-black '
            'bg-pink-400 rounded px-1.5 py-1 shadow-[0_0_12px_rgba(255,45,210,0.6)]">BETA</span>')


def dl_button(name, lang, small=False):
    href = ("../" if lang == "en" else "") + DL_URL + name
    pad = "px-3 py-2 text-xs" if small else "px-5 py-3 text-sm"
    label = "הורדה ⬇︎" if lang == "he" else "Download ⬇︎"     # U+FE0E: the text arrow, not the emoji
    return (f'<a href="{href}" download class="shrink-0 text-center {pad} rounded-lg neon-btn text-pink-200 '
            f'hover:text-white font-bold transition">{label}</a>')


def download_card(name, version, when, lang):
    size = download_info(name)
    note = "רץ ב־VICE או על C64 אמיתי" if lang == "he" else "Runs in VICE or on a real C64"
    return f'''
        <div class="dl-card mt-8 flex flex-col sm:flex-row sm:items-center gap-4 rounded-xl p-4 md:p-5 bg-black/60 border border-pink-400/40 shadow-[0_0_26px_rgba(255,45,210,0.18)]">
          <div class="flex items-center gap-4 flex-1 min-w-0">
            <div class="shrink-0 grid place-items-center w-14 h-14 rounded-lg bg-black/70 border border-cyan-300/30">{icon("disk", "text-cyan-300", 30)}</div>
            <div class="min-w-0">
              <p class="flex flex-wrap items-center gap-2"><bdi dir="ltr" class="text-cyan-100 font-bold break-all">{name}</bdi> {BETA_TAG}</p>
              <p class="mt-1 text-xs text-cyan-200/70"><bdi dir="ltr">{htmlesc(version)}</bdi> &middot; <bdi dir="ltr">{kb(size)}</bdi> &middot; {day(when, lang)}</p>
              <p class="mt-1 text-xs text-sky-100/70">{note}</p>
            </div>
          </div>
          {dl_button(name, lang)}
        </div>
'''


def render_downloads(body, when, lang):
    """A token alone in a paragraph becomes the card (the <p> goes); a stray token elsewhere too."""
    card = lambda m: download_card(m.group(1), m.group(2).strip(), when, lang)
    body = re.sub(r"[ \t]*<p\b[^>]*>\s*" + DL_TOKEN.pattern + r"\s*</p>[ \t]*\n?", card, body)
    return DL_TOKEN.sub(card, body)


def post_downloads(post, lang):
    path = HERE / "posts" / f"{post['slug']}.{lang}.html"
    return download_tokens(path.read_text(encoding="utf-8")) if path.exists() else []


def sync_downloads():
    """Copy every file a published post links to docs/downloads/fist2/; remove everything else there."""
    wanted = {name for post in POSTS for lang in ("he", "en") for name, _ in post_downloads(post, lang)}
    for name in wanted:
        download_info(name)
    if DL_OUT.exists():
        for f in DL_OUT.iterdir():
            if f.name not in wanted:
                f.unlink() if f.is_file() else shutil.rmtree(f)
    for name in sorted(wanted):
        src, dst = DL_SRC / name, DL_OUT / name
        if not dst.exists() or dst.read_bytes() != src.read_bytes():
            DL_OUT.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(src, dst)
    for d in (DL_OUT, DL_OUT.parent):                        # no downloads: no empty folders left behind
        if d.exists() and not any(d.iterdir()):
            d.rmdir()


def downloads_box(lang):
    """Index box: every download of the published posts, newest post first. "" when there are none."""
    he = lang == "he"
    rows = []
    for post in reversed(POSTS):
        for name, version in post_downloads(post, lang):
            size = download_info(name)
            rows.append(f'''          <li class="flex flex-wrap items-center gap-3 rounded-lg p-3 bg-black/40 border border-cyan-400/15">
            {icon("disk", "text-cyan-300")}
            <div class="flex-1 min-w-0">
              <p class="flex flex-wrap items-center gap-2 text-sm"><bdi dir="ltr" class="text-cyan-100 font-bold break-all">{name}</bdi> {BETA_TAG}</p>
              <p class="mt-1 text-xs text-cyan-200/60"><bdi dir="ltr">{htmlesc(version)}</bdi> &middot; <bdi dir="ltr">{kb(size)}</bdi> &middot; {day(post['when'], lang)} &middot; <a href="devlog-{post['slug']}.html" class="text-cyan-300 hover:text-pink-300 underline underline-offset-2">{post['title_' + lang]}</a></p>
            </div>
            {dl_button(name, lang, small=True)}
          </li>''')
    if not rows:
        return ""
    title = "הורדות" if he else "Downloads"
    title_cls = "text-lg font-bold" if he else "[font-family:'Press Start 2P',monospace] text-xs"
    return (f'      <div class="{"text-right " if he else ""}rounded-2xl p-5 md:p-6 bg-black/60 border border-pink-400/30 shadow-[0_0_26px_rgba(255,45,210,0.12)] mb-8">\n'
            f'        <h2 class="flex items-center gap-3 {title_cls} text-pink-300">{icon("disk")}{title}</h2>\n'
            '        <ul class="mt-4 space-y-3">\n' + "\n".join(rows) + "\n        </ul>\n      </div>\n")


# Bodies written in the editor can hold plain <p>, <ul>, <a>, <h2> with no Tailwind classes.
# They sit directly in .devlog-body; this gives them the same reading style as the hand-made posts.
BODY_CSS = """    <style>
      .devlog-body > p:not([class]), .devlog-body > ul:not([class]), .devlog-body > ol:not([class]),
      .devlog-body > blockquote:not([class]), .devlog-body > h3:not([class]) {
        margin-top: 1.25rem; font-size: 15px; line-height: 1.85; color: rgb(224 242 254 / .9);
      }
      @media (min-width: 768px) {
        .devlog-body > p:not([class]), .devlog-body > ul:not([class]), .devlog-body > ol:not([class]),
        .devlog-body > blockquote:not([class]) { font-size: 17px; }
      }
      .devlog-body > h2 { margin-top: 2rem; }
      .devlog-body > h3:not([class]) { color: rgb(207 250 254); font-size: 1.125rem; margin-top: 1.75rem; }
      .devlog-body ul:not([class]) { list-style: disc; padding-inline-start: 1.25rem; }
      .devlog-body ol:not([class]) { list-style: decimal; padding-inline-start: 1.5rem; }
      .devlog-body ul:not([class]) > li + li, .devlog-body ol:not([class]) > li + li { margin-top: .5rem; }
      .devlog-body blockquote:not([class]) { border-inline-start: 3px solid rgb(244 114 182 / .6); padding-inline-start: 1rem; font-style: italic; }
      .devlog-body a:not([class]) { color: rgb(103 232 249); text-decoration: underline; text-underline-offset: 3px; }
      .devlog-body a:not([class]):hover { color: rgb(249 168 212); }
      .devlog-body > p code:not([class]), .devlog-body > ul code:not([class]), .devlog-body > ol code:not([class]) { color: rgb(103 232 249); }
      .devlog-body strong { color: #fff; }
    </style>
"""


def dress(body):
    """Reading layout: icons, roomier text, section headings with their icon."""
    body = re.sub(r"\{icon:(\w+)\}", lambda m: icon(m.group(1)), body)
    body = body.replace('text-sm md:text-[15px] text-sky-100/85 leading-relaxed', 'text-[15px] md:text-[17px] text-sky-100/90 leading-[1.85]')
    # Hand-made headings carry "text-lg text-cyan-100"; editor-made ones are bare <h2>. Both get the same look.
    body = re.sub(r'<h2(?: class="text-lg text-cyan-100( pt-2)?")?>\s*(<svg.*?</svg>)?\s*',
                  lambda m: '<h2 class="flex items-center gap-3 text-xl md:text-2xl text-cyan-100 pt-4">' + (m.group(2) or ""), body)
    return '        <div class="devlog-body">\n' + body + '        </div>\n'


def reading_minutes(html):
    words = len(re.sub(r"<[^>]+>", " ", html).split())
    return max(1, round(words / 200))


def stamp(when, lang):
    d = datetime.datetime.fromisoformat(when)
    if lang == "he":
        text = f"{d.day} ב{HE_MONTHS[d.month - 1]} {d.year} &middot; {d:%H:%M}"
    else:
        text = f"{d.day} {EN_MONTHS[d.month - 1]} {d.year} &middot; {d:%H:%M}"
    return f'<time datetime="{when}">{text}</time>'


def img(path, lang):
    return ("../" if lang == "en" else "") + "assets/images/devlog/" + path


def page(lang, name, title, desc, main_html, og_image=None, write=True):
    base = SITE / "en" if lang == "en" else SITE
    src = (base / "tools.html").read_text(encoding="utf-8")
    head, rest = src.split("</head>", 1)
    old_desc = re.search(r'<meta name="description" content="([^"]*)"', head).group(1)
    head = head.replace(old_desc, desc)
    head = re.sub(r"<title>.*?</title>", "<title>" + title + "</title>", head)
    short = title.replace(" – 8bitretro.tech", " | 8bitretro.tech")
    head = re.sub(r'(og:title" content=")[^"]*', lambda m: m.group(1) + short, head)
    head = re.sub(r'(twitter:title" content=")[^"]*', lambda m: m.group(1) + short, head)
    head = head.replace("tools.html", name)
    head = re.sub(r"[ \t]*<!-- TODO: replace with a dedicated[^\n]*\n", "", head)
    head = re.sub(r'(og:image:alt" content=")[^"]*', lambda m: m.group(1) + "Fist II Remaster devlog", head)
    body = rest.replace('href="tools.html" class="whitespace-nowrap px-2 py-2 rounded-md text-cyan-200' + ACTIVE,
                        'href="tools.html" class="whitespace-nowrap px-2 py-2 rounded-md text-cyan-200', 1)
    body = body.replace('href="devlog.html" class="whitespace-nowrap px-2 py-2 rounded-md text-cyan-200',
                        'href="devlog.html" class="whitespace-nowrap px-2 py-2 rounded-md text-cyan-200' + ACTIVE, 1)
    flag_from, flag_to = ('href="../tools.html"', 'href="../' + name + '"') if lang == "en" else ('href="en/tools.html"', 'href="en/' + name + '"')
    assert body.count(flag_from) == 1, flag_from
    body = body.replace(flag_from, flag_to)
    pre, main_and_after = body.split("<main", 1)
    _, after = main_and_after.split("</main>", 1)
    main = ('<main class="min-h-screen flex flex-col items-center pt-36 md:pt-28 pb-16">\n'
            '    <div class="pointer-events-none absolute -z-10 inset-0 flex justify-center">\n'
            '      <div class="w-[30rem] h-[30rem] rounded-full bg-pink-500/20 blur-[120px] translate-y-10"></div>\n'
            '    </div>\n\n' + main_html + "  </main>")
    html = (head + "</head>" + pre + main + after).replace("\r\n", "\n")
    if write:
        # Keep the line endings the checkout already has (CRLF on Windows with core.autocrlf), so a
        # rebuild with no content change leaves git status clean.
        out = base / name
        nl = "\r\n" if out.exists() and b"\r\n" in out.read_bytes() else "\n"
        out.write_text(html, encoding="utf-8", newline=nl)
    return html


def banner(post, lang):
    b = post.get("banner")
    if not b:
        return ""
    cap = post["banner_caption_" + lang]
    return f'''
        <figure class="mt-8">
          <div class="bg-black/70 rounded-xl border border-cyan-300/30 shadow-[0_0_22px_rgba(0,255,243,0.18)] crt-frame p-2">
            <img src="{img(b, lang)}" alt="{post['banner_alt_' + lang]}"
                 class="w-full h-auto rounded-lg pixelated" loading="eager" />
          </div>
          <figcaption class="mt-2 text-xs text-cyan-200/60 leading-relaxed">{cap}</figcaption>
        </figure>
'''


def post_page(i, post, lang, write=True):
    he = lang == "he"
    older = POSTS[i - 1] if i > 0 else None
    newer = POSTS[i + 1] if i + 1 < len(POSTS) else None
    back = "יומן פיתוח" if he else "Devlog"
    arrow_back = "&rarr;" if he else "&larr;"
    nav_links = []
    if older:
        label = ("&rarr; הקודם: " if he else "&larr; Previous: ") + older["title_" + lang]
        nav_links.append(f'<a href="devlog-{older["slug"]}.html" class="text-xs px-3 py-2 rounded-lg neon-btn text-cyan-300 hover:text-pink-300 transition">{label}</a>')
    if newer:
        label = ("הבא: " + newer["title_he"] + " &larr;") if he else ("Next: " + newer["title_en"] + " &rarr;")
        nav_links.append(f'<a href="devlog-{newer["slug"]}.html" class="text-xs px-3 py-2 rounded-lg neon-btn text-cyan-300 hover:text-pink-300 transition">{label}</a>')
    body = (HERE / "posts" / f"{post['slug']}.{lang}.html").read_text(encoding="utf-8").replace("{IMG}", img("", lang))
    body = dress(render_downloads(body, post["when"], lang))
    mins = reading_minutes(body)
    meta = f"{stamp(post['when'], lang)} &middot; " + (f"{mins} דקות קריאה" if he and mins > 1 else "דקת קריאה" if he else f"{mins} min read")
    title_cls = "text-2xl md:text-3xl text-cyan-200 font-bold" if he else "[font-family:'Press Start 2P',monospace] text-xl md:text-2xl text-cyan-200 leading-relaxed"
    main_html = f'''    <div id="read-progress" aria-hidden="true" style="position:fixed;top:0;{'right' if he else 'left'}:0;height:3px;width:0;z-index:60;background:linear-gradient(90deg,#00fff3,#ff2dd2);box-shadow:0 0 10px #ff2dd2"></div>
    <script>
      (function () {{
        var bar = document.getElementById('read-progress');
        function upd() {{
          var h = document.documentElement, max = h.scrollHeight - h.clientHeight;
          bar.style.width = (max > 0 ? Math.min(100, h.scrollTop / max * 100) : 0) + '%';
        }}
        window.addEventListener('scroll', upd, {{ passive: true }}); upd();
      }})();
    </script>
    <section class="w-[min(860px,94%)]"{' dir="rtl"' if he else ''}>
      <a href="devlog.html" class="inline-block mb-4 text-xs text-cyan-300 hover:text-pink-300 transition">{arrow_back} {back}</a>

      <article class="{'text-right ' if he else ''}rounded-2xl p-6 md:p-8 bg-black/60 border border-cyan-400/20 shadow-[0_20px_60px_rgba(0,0,0,0.9)] backdrop-blur">
        <p dir="ltr" class="{'text-right ' if he else ''}[font-family:'Press Start 2P',monospace] text-[9px] tracking-widest text-pink-300/90">DEVLOG #{i + 1} &middot; {post['kicker']}</p>
        <h1 class="mt-4 {title_cls}">{post['title_' + lang]}</h1>
        <p class="mt-2 text-xs text-cyan-200/60">{meta}</p>
{banner(post, lang)}
{BODY_CSS}{body}
        <div class="mt-10 pt-6 border-t border-white/10 flex flex-wrap gap-3 justify-between">
          {chr(10).join('          ' + l for l in nav_links).strip()}
        </div>
      </article>
    </section>
'''
    title = post["title_" + lang] + " – " + back + " – 8bitretro.tech"
    return page(lang, f"devlog-{post['slug']}.html", title, post["teaser_" + lang], main_html, write=write)


def index_page(lang):
    he = lang == "he"
    intro = (HERE / f"intro.{lang}.html").read_text(encoding="utf-8").replace("{IMG}", img("", lang))
    intro = re.sub(r"\{icon:(\w+)\}", lambda m: icon(m.group(1)), intro)
    cards = []
    for n, post in reversed(list(enumerate(POSTS, 1))):
        thumb = post.get("thumb") or post.get("banner")
        cards.append(f'''      <a href="devlog-{post['slug']}.html"
         class="group grid grid-cols-1 sm:grid-cols-[220px_1fr] gap-5 items-start {'text-right ' if he else ''}rounded-2xl p-5 bg-black/60 border border-cyan-400/20 shadow-[0_0_20px_rgba(0,255,243,0.06)] hover:shadow-[0_0_30px_rgba(255,45,210,0.18)] hover:border-pink-400/30 transition mb-6">
        <div class="bg-black/70 rounded-lg border border-cyan-300/25 crt-frame p-1">
          <img src="{img(thumb, lang)}" alt="" class="w-full h-auto rounded pixelated" loading="lazy" />
        </div>
        <div>
          <p class="text-xs text-cyan-200/60"><span dir="ltr" class="[font-family:'Press Start 2P',monospace] text-[9px] text-pink-300/90">#{n}</span> &middot; {stamp(post['when'], lang)} &middot; {post['kicker_short']}</p>
          <h2 class="mt-2 {'text-lg md:text-xl font-bold' if he else "[font-family:'Press Start 2P',monospace] text-sm md:text-base leading-relaxed"} text-pink-300">{post['title_' + lang]}</h2>
          <p class="mt-2 text-sm text-sky-100/85 leading-relaxed">{post['teaser_' + lang]}</p>
          <span class="mt-3 inline-block text-xs text-cyan-300 group-hover:text-pink-300">{'לקריאה &larr;' if he else 'Read &rarr;'}</span>
        </div>
      </a>''')
    box = downloads_box(lang)                  # nothing at all when no published post has a download
    main_html = (f'    <section class="w-[min(860px,94%)]"{" dir=\"rtl\"" if he else ""}>\n' + intro +
                 ("\n" + box if box else "") +
                 "\n      <!-- Generated by the devlog generator: posts newest first -->\n" + "\n\n".join(cards) + "\n    </section>\n")
    title = ("יומן פיתוח" if he else "Devlog") + " – 8bitretro.tech"
    page(lang, "devlog.html", title, DATA["index_description"][lang], main_html)


def build_all():
    load()
    sync_downloads()
    for i, post in enumerate(POSTS):
        for lang in ("en", "he"):
            post_page(i, post, lang)
    for lang in ("en", "he"):
        index_page(lang)
    return len(POSTS)


def preview_html(slug, lang):
    """The post page for `slug` (draft or not), rendered in memory; nothing is written to docs/."""
    load(include=slug)
    for i, post in enumerate(POSTS):
        if post["slug"] == slug:
            return post_page(i, post, lang, write=False)
    raise KeyError(slug)


if __name__ == "__main__":
    print("built", build_all(), "posts x 2 languages + 2 index pages")
