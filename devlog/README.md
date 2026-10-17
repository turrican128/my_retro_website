<div dir="rtl" lang="he">

## בקצרה (עברית)

1. מפעילים: לחיצה כפולה על `devlog/editor.cmd` (או `python devlog/editor.py`), והעורך נפתח ב־<bdi dir="ltr">http://127.0.0.1:5120</bdi>.
2. **+ פוסט חדש**: כותבים כותרת בעברית. ה־slug (כתובת הדף) הוא באנגלית בלבד, ואי אפשר לשנות אותו אחרי היצירה.
3. כותבים רק בעברית: כותרת, תקציר, טקסטים לבאנר וגוף הפוסט. **שמירה** או Ctrl+S.
4. **תצוגה מקדימה** פותחת את הדף בעברית בדיוק כמו באתר. **באנגלית** מתרגם קודם (אם העברית השתנתה) ופותח את הדף באנגלית.
5. הגרסה האנגלית נוצרת אוטומטית: Claude מתרגם את העברית כשמפרסמים. לא עורכים אנגלית.
6. **כותרת היומן** (בצד) עורכת את הבלוק שבראש דף היומן ואת תיאור הדף.
7. **טיוטה מהמשחק**: Claude כותב טיוטה קצרה בעברית ממה שמוזג ב־repo של המשחק, רק מעובדות שכתובות שם.
8. כשהפוסט מוכן: מכבים את **טיוטה**, שומרים ולוחצים **פרסום**. נפתח PR ב־GitHub, ושום דבר לא עולה לאוויר עד שממזגים אותו.
9. **📦 הורדה**: מעלים קובץ <bdi dir="ltr">.prg</bdi> או <bdi dir="ltr">.d64</bdi> (עד 2 MB), כותבים גרסה (ברירת המחדל beta), ונכנס לפוסט כרטיס הורדה. הקובץ עולה לאתר רק כשהפוסט מתפרסם. גרסאות עם „tr”, „heli” או „preview” בשם נחסמות: יש בהן חומרים ממשחקים אחרים.

</div>

# Devlog editor

A small local web app for writing the Fist II Remaster devlog. The interface is Hebrew and right-to-left,
and you write **only in Hebrew**: the English side is translated by Claude automatically. The real page
is one click away, and Publish opens a pull request.

## Run it

Double-click `devlog/editor.cmd`, or:

```
python devlog/editor.py              # opens http://127.0.0.1:5120
python devlog/editor.py --no-browser # just serve
python devlog/editor.py --port 5121  # if 5120 is taken
```

Python standard library only, nothing to install. Close the window (or Ctrl+C) to stop it.

## Write a post

1. **+ פוסט חדש** (new post) at the top of the sidebar. Type a working title in Hebrew. The page address
   (slug, `docs/devlog-<slug>.html`) has to be ASCII: it's prefilled as `post-YYYYMMDD-HHMM` and you can
   type English words instead. The slug can't change later; the title can.
2. New posts are **drafts** (טיוטה): they never appear on the site until you switch off the draft toggle.
3. Fill in the Hebrew title, teaser, banner caption and alt text, the date and time (Israel time;
   summer/winter offset is worked out for you) and the kicker (the small pink line above the title,
   kept in English capitals for both languages).
4. Write the body in the Hebrew editor. The toolbar has the site's own building blocks:
   - **H2**: a section heading. **אייקון** (icon): a pixel icon, put at the start of the heading you're in.
   - **צילום מסך** (screenshot): pick an image from the library (or upload one) and add a caption.
   - **# כרטיס** (number tile): label, value, pink or cyan. Put the cursor in an existing row of tiles to
     add to it; up to 4 share a row.
   - **פתיח** (lead): turns the paragraph you're in into the bigger opening line.
   - `<>` (the second one) shows the HTML if you want to fix something by hand.
5. **שמירה** (save) or Ctrl+S. The dot in the top bar turns pink while something isn't saved, and the
   browser warns you before you close the tab with unsaved changes. Saving never calls the Claude API.

## The English side is automatic

English is never edited in the editor. Claude translates the Hebrew (title, teaser, banner texts, body)
into `title_en`, `teaser_en`, `banner_*_en` and `posts/<slug>.en.html`:

- on **Publish**, for every published post (and the index header) whose Hebrew changed since its last
  translation. If there's no API key, or the translation fails, Publish stops and nothing is committed;
  a stale or empty English page never goes out.
- on **באנגלית** (preview in English), so you can read the English before publishing. The English
  preview has a small notice saying it's generated.

How "changed" is tracked: a post may carry `en_source_hash` in `posts.json` (the hash of the Hebrew the
English was made from); the index header uses the top-level `index_en_source_hash`. Both are optional.
With no hash, English that exists is treated as current, so the hand-written English of the older posts
stays untouched until their Hebrew changes. The hash is written only when the Hebrew really changes (or
after a translation), so saving an untouched post leaves `posts.json` byte-identical.

The translation keeps the HTML, icons, images, code, numbers and names exactly, and is told to write
natural English in the voice of the existing English posts (one published post is sent as a bilingual
reference).

## The index header

**כותרת היומן** (index header) in the sidebar edits the block at the top of `docs/devlog.html`: the
heading, the line under it and the intro paragraphs with their links (`devlog/intro.he.html`). Only
what's inside the card is edited; the card's outer `<div>` with its classes is kept as it is. The same
view edits the page's Hebrew meta description (`index_description.he` in `posts.json`). Preview, the
English preview and Publish work there as they do for a post; its English (`intro.en.html`,
`index_description.en`) is translated the same way.

## Images

Everything lives in `docs/assets/images/devlog/`. Upload in the image picker, or just drag a
screenshot into the editor (or paste it): it's uploaded and inserted as a captioned figure. PNG, GIF,
JPG and WEBP, up to 5 MB. Names are cleaned up and start with `fist2-`; an existing file is never
overwritten (a `-2` is added). Only publish our own art or screenshots of the game, never ripped
third-party assets.

## Downloads (betas)

**📦 הורדה** (download) in the toolbar adds a download card for a C64 file: pick an uploaded file or
upload one (or drag a `.prg`/`.d64` straight into the editor), type a version label (default `beta`,
English letters, digits, `.`, `-`), and the card goes in as its own paragraph. In the editor it's a
small chip, `📦 <file> · <version>`; in the post file it's the token

```
<p>{download:fist2-beta.prg|beta}</p>
```

On the page it becomes a neon card: disk icon, file name, version, a pink BETA tag, size and the
post's date, a big **הורדה ⬇** / **Download ⬇** button and "Runs in VICE or on a real C64". The devlog
index gets a **הורדות** / **Downloads** box listing every download of the published posts (no box when
there are none).

- Allowed: `.prg`, `.d64`, `.d71`, `.d81`, `.crt`, up to 2 MB. A `.d64` must have a real disk size
  (174848, 175531, 196608 or 197376 bytes), a `.prg` at least 3 bytes. Names are cleaned up (lowercase
  ASCII, no spaces); an existing file is never overwritten (a `-2` is added).
- **Never published:** any file with `tr`, `heli` or `preview` as a separate word in its name
  (`fist2-tr.prg`, `fist2-levels-preview-packed.prg`, `heli-test.d64`). Those game builds contain ripped
  third-party assets (Target Renegade graphics, the Heli Rescue tune). The upload refuses them, and
  `build.py` refuses to build a page that links one.
- Uploads are stored in `devlog/downloads/` (tracked in git, not served). `build.py` copies a file to
  `docs/downloads/fist2/` only while a **published** post links it, and deletes every file there that no
  published post links, so a draft's beta never reaches the site. Publish commits both folders.
- The English translation copies the token unchanged; if it ever doesn't, Publish stops.

## Preview

**תצוגה מקדימה** (preview) saves, runs `build.py` and opens the Hebrew page in a new tab, exactly as
it will look on the site. A draft is rendered just for the preview and never written to `docs/`.

## Claude: translation and drafts

Both need a Claude API key. Create `devlog/.env` with one line and restart the editor:

```
ANTHROPIC_API_KEY=sk-ant-...
```

(or set the `ANTHROPIC_API_KEY` environment variable). `devlog/.env` is in `.gitignore`.

- **Translation** is automatic (see above). The `/api/translate` endpoint still works both ways.
- **טיוטה מהמשחק** (draft from the game repo) lists what was merged into the game repo
  (`C:\ClaudeSandbox\C64 first demo\Fist II Remaster`) since the newest published post. Tick the PRs
  and commits to write about; Claude writes a short **Hebrew** draft (title, teaser, kicker, body, and a
  slug suggestion for a new post) into the open post, or a new draft post. It follows the Hebrew rules
  (English names stay in English letters, maqaf for prefixes like ב־C64, natural Israeli Hebrew) and may
  only use facts from those PRs and commits, nothing invented, so it can be thin: add your own story
  and screenshots. The English comes later, from the translation.

## Publish

Switch off the draft toggle, save, then **פרסום** (publish). The editor:

1. translates to English whatever Hebrew changed (stops here if there's no key or it fails),
2. builds the pages,
3. checks that nothing outside the devlog has uncommitted changes (if something does, it lists the
   files and stops),
4. makes a branch `devlog/<slug>-<date>-<time>` (or `devlog/index-header-…`) from where you are,
   commits only the devlog files (`devlog/` including `intro.*.html` and `downloads/`, `docs/devlog*.html`,
   `docs/en/devlog*.html`, `docs/assets/images/devlog/`, `docs/downloads/fist2/`), pushes it and opens a
   pull request into `main`,
5. switches back to the branch you were on and shows the PR link.

Nothing goes live until you merge the PR on GitHub. Until then the editor shows your current
branch's copy of the devlog, without the new post.

## Without the editor

The source is `posts.json` + `posts/<slug>.he.html` / `posts/<slug>.en.html`, and `intro.he.html` /
`intro.en.html` for the index header. In a body, `{IMG}` is the image folder, `{icon:name}` a pixel
icon (names in `build.py`, `ICONS`) and `<p>{download:file|version}</p>` a download card for a file in
`devlog/downloads/`. After editing by hand run `python devlog/build.py`. If you change
the Hebrew by hand, the English is re-translated on the next Publish only if the post already has an
`en_source_hash`; otherwise translate it yourself or delete the English title to force it.
