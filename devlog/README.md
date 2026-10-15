# Devlog editor

A small local web app for writing the Fist II Remaster devlog: English and Hebrew side by side,
the real page one click away, and a pull request when it's done.

## Run it

Double-click `devlog/editor.cmd`, or:

```
python devlog/editor.py              # opens http://127.0.0.1:5120
python devlog/editor.py --no-browser # just serve
python devlog/editor.py --port 5121  # if 5120 is taken
```

Python standard library only, nothing to install. Close the window (or Ctrl+C) to stop it.

## Write a post

1. **+ New post** on the left. Type a working title in English; it becomes the page address
   (`docs/devlog-<slug>.html`) and can't change later, the title can.
2. New posts are **drafts**: they never appear on the site until you switch off **Draft**.
3. Fill in the date and time (Israel time; summer/winter offset is worked out for you), the kicker
   (the small pink line above the title), titles, teasers and the banner texts for both languages.
4. Write the body in the two editors. The toolbar has the site's own building blocks:
   - **H2**: a section heading. **Icon**: a pixel icon, put at the start of the heading you're in.
   - **Screenshot**: pick an image from the library (or upload one) and add a caption.
   - **# Tile**: a number tile (label, value, pink or cyan). Put the cursor in an existing row of
     tiles to add to it; up to 4 share a row.
   - **Lead**: turns the paragraph you're in into the bigger opening line.
   - `<>` (the second one) shows the HTML if you want to fix something by hand.
5. **Save** (or Ctrl+S). The dot next to the title turns pink while something isn't saved, and the
   browser warns you before you close the tab with unsaved changes.

## Images

Everything lives in `docs/assets/images/devlog/`. Upload in the image picker, or just drag a
screenshot into an editor (or paste it): it's uploaded and inserted as a captioned figure. PNG, GIF,
JPG and WEBP, up to 5 MB. Names are cleaned up and start with `fist2-`; an existing file is never
overwritten (a `-2` is added). Only publish our own art or screenshots of the game, never ripped
third-party assets.

## Preview

**Preview EN / Preview HE** saves, runs `build.py` and opens the page in a new tab, exactly as it
will look on the site. A draft is rendered just for the preview and never written to `docs/`.

## Translate and draft (Claude)

These two need a Claude API key. Create `devlog/.env` with one line and restart the editor:

```
ANTHROPIC_API_KEY=sk-ant-...
```

(or set the `ANTHROPIC_API_KEY` environment variable). `devlog/.env` is in `.gitignore`.

- **EN → HE / HE → EN** fills the other language's title, teaser, banner texts and body. It keeps
  the HTML, icons, images, code and addresses, and keeps names like C64, SpritePad or multicolor in
  English, with a maqaf for prefixes (ב־C64). Read it through before saving.
- **Draft from game repo** lists what was merged into the game repo
  (`C:\ClaudeSandbox\C64 first demo\Fist II Remaster`) since the newest published post. Tick the PRs
  and commits to write about; Claude writes a short English draft (title, teaser, kicker, body) into
  the open post, or a new draft post. It may only use facts from those PRs and commits, nothing
  invented, so it can be thin: add your own story, screenshots, then translate.

## Publish

Switch off **Draft**, save, then **Publish**. The editor:

1. builds the pages,
2. checks that nothing outside the devlog has uncommitted changes (if something does, it lists the
   files and stops),
3. makes a branch `devlog/<slug>-<date>-<time>` from where you are, commits only the devlog files
   (`devlog/`, `docs/devlog*.html`, `docs/en/devlog*.html`, `docs/assets/images/devlog/`),
   pushes it and opens a pull request into `main`,
4. switches back to the branch you were on and shows the PR link.

Nothing goes live until you merge the PR on GitHub. Until then the editor shows your current
branch's copy of the devlog, without the new post.

## Without the editor

The source is `posts.json` + `posts/<slug>.en.html` / `posts/<slug>.he.html`.
In a body, `{IMG}` is the image folder and `{icon:name}` a pixel icon (names in `build.py`, `ICONS`).
After editing by hand run `python devlog/build.py`.
