# PR Changelog

Ongoing log of all pull requests merged into this project.

---

## 2026-03-23

### PR #12 — `claude/releases-new-entries-petscii-bg` — *Merged 2026-03-23 21:38*
- **Feature:** Add 4 new 2025 CSDb releases (Happy Birthday Mythus, 50 Years of Serato, Fifty Years, Happy Birthday JLD) — total now 12 cards
- **Feature:** Add scattered PETSCII art fragments as subtle fixed background on releases page (LOAD command, PETSCII symbols, DR.J/DELYSID badge, disk directory, BASIC snippet)
- **Fix:** Percent-encode space in Happy Birthday JLD download URL
- **Fix:** Correct missing filename in Irata 50th Bday tune download link
- **Files changed:** `docs/releases.html`

### PR #13 — `claude/kleiner82-music-page` — *Merged 2026-03-23 22:20*
- **Feature:** New Kleiner'82 music page (`docs/kleiner82.html`) showcasing all 5 Bandcamp albums with interactive album-focused audio player
- **Feature:** Album grid with CRT scanline effects, click-to-expand view with centered large artwork and full track lists
- **Feature:** Now Playing bar with playback controls, progress bar, and time display
- **Feature:** C64 boot animation with album directory listing
- **Feature:** Link Kleiner'82 card in projects page to new page
- **Fix:** Unreliable `audio.src` guard replaced with `currentTrackIndex` check
- **Fix:** Moved `c64blink` keyframe from dynamic JS injection to static CSS
- **Files changed:** `docs/kleiner82.html` (new), `docs/projects.html`, `claude notes/pr_changelog.md` (new)

## 2026-03-25

### PR #14 — `claude/music-files-and-player-links` — *Merged 2026-03-25 11:43*
- **Feature:** Add 14 highlight-track MP3 files across all 5 Kleiner'82 albums
- **Feature:** Create 5 album subfolders under `docs/assets/music/` with `.gitkeep` placeholders
- **Feature:** Add `claude notes/music_files_needed.md` documenting required music files per folder
- **Fix:** Fix all track `file:` references in kleiner82.html to match actual uploaded filenames
- **Files changed:** `docs/kleiner82.html`, `claude notes/music_files_needed.md` (new), `docs/assets/music/` (14 MP3s + 5 .gitkeep)

### PR #15 — `claude/magazine-modal-pdf-list` — *Merged 2026-03-25 14:35*
- **Feature:** Add CRT power-on animation to magazine modal (scaleY flash like old TV turning on)
- **Feature:** Replace plain list with responsive 3-column grid of colored issue cards with neon gradient thumbnails
- **Feature:** PDF download links connected to actual files in assets folder
- **Files changed:** `docs/projects.html`

### PR #16 — `claude/add-newsletter-pdfs` — *Merged 2026-03-25 14:40*
- **Feature:** Add 6 newsletter PDF issues (April–July 2025) to `docs/assets/PDF download for 8bit newsletter/`
- **Feature:** Add issue #6 (July 2025) card to magazine modal
- **Files changed:** `docs/projects.html`, `docs/assets/PDF download for 8bit newsletter/` (6 PDFs)

### PR #17 — `claude/magazine-modal-pixel-art-thumbnails` — *Merged 2026-03-25 19:09*
- **Feature:** Replace 6 gradient+SVG magazine card thumbnails with custom retro pixel art PNGs (arcade cabinet, space invaders, pac-man, retro computer, joystick, spaceship)
- **Feature:** Slow CRT power-on modal animation from 280ms to 700ms with cinematic phosphor warmup effect and more keyframe steps
- **Files changed:** `docs/projects.html`, `docs/assets/images/magazine/issue-1.png` through `issue-6.png` (new)

### PR #18 — `claude/contacts-pixel-art-icons-bandcamp` — *Merged 2026-03-25*
- **Feature:** Replace emoji icons with retro pixel art thumbnails on contacts page social links (email, Facebook, YouTube, Mixcloud)
- **Feature:** Add Kleiner'82 Bandcamp link (`https://kleiner82.bandcamp.com/`) with vinyl record pixel art icon
- **Files changed:** `docs/contacts.html`, `docs/assets/images/contacts/` (5 new PNGs)

## 2026-03-29

### PR #19 — `claude/webhook-secret-key-filter` — *Merged 2026-03-29*
- **Feature:** Add secret key to webhook payload for form submission security
- **Files changed:** `docs/contacts.html`

## 2026-04-05

### PR #30 — `claude/fix-em-dashes-index` — *Merged 2026-04-05*
- **Fix:** Replace em dash (—) with single dash (-) after `Kleiner'82` in index hero text
- **Fix:** Replace em dash (—) with single dash (-) after `שמסביב` in index hero text
- **Files changed:** `docs/index.html`

### PR #29 — `claude/about-images-index-text` — *Merged 2026-04-05*
- **Feature:** Replace second image in קצת עליי section with personal WhatsApp photo + CRT effects
- **Feature:** Replace gallery Scene #3 with same photo (same gallery card size/CRT styling)
- **Fix:** Remove em dash (—) after מהרצליה in index hero text
- **Fix:** Change האתר → אתר in index hero text
- **Files changed:** `docs/about.html`, `docs/index.html`, `docs/assets/images/WhatsApp Image 2026-04-05 at 14.25.02.jpeg` (new)

### PR #28 — `claude/newsletter-signup-modal` — *Merged 2026-04-05*
- **Feature:** Add email-only newsletter signup form above issues list in magazine modal
- **Feature:** POSTs to Make webhook (placeholder) → Airtable record → Smoove mailing list sync
- **Feature:** Inline success message, no-cors fallback, same secret_key pattern as contact form
- **Files changed:** `docs/projects.html`

### PR #24 — `claude/fix-magazine-modal-scroll` — *Merged 2026-04-05*
- **Fix:** Remove horizontal scrollbar from magazine modal popup
- **Fix:** Widen modal from `max-w-lg` (512px) to `max-w-xl` (576px)
- **Fix:** Add `overflow-x-hidden` to issues list to clip grid overflow caused by vertical scrollbar
- **Files changed:** `docs/projects.html`

### PR #21 — `claude/neon-dreams-album` — *Merged 2026-04-05*
- **Feature:** Add Neon Dreams (2026) as 6th album to Kleiner'82 page
- **Feature:** 14 tracks listed, 8 playable MP3 highlights uploaded to `docs/assets/music/neon-dreams/`
- **Fix:** Update album count from 5 → 6 in page header
- **Files changed:** `docs/kleiner82.html`, `docs/assets/music/neon-dreams/` (8 MP3s)

### PR #22 — `claude/newsletter-fixes` — *Merged 2026-04-05*
- **Fix:** Remove em dash (—) from newsletter modal subtitle between ה8ביט and הורד
- **Fix:** Mark issue #17 (אפריל 2026) comment as released (removed "upcoming" label)
- **Files changed:** `docs/projects.html`

### PR #23 — `claude/gallery-crt-effects` — *Merged 2026-04-05*
- **Feature:** Add CRT scanlines (`::before`) to each arcade gallery card
- **Feature:** Add CRT vignette (`::after`) — radial gradient simulating curved screen dark corners
- **Feature:** Subtle screen flicker animation (`crtFlicker`) every ~9s
- **Feature:** Phosphor color filter on images (brightness/contrast/saturation boost)
- **Feature:** Hover RGB shift effect (`hue-rotate(6deg)`) for color-bleed CRT look
- **Fix:** Set `z-[5]` on figcaptions to keep text above CRT overlay pseudo-elements
- **Files changed:** `docs/about.html`

### PR #31 — `claude/newsletter-webhook-url` — *Merged 2026-04-05*
- **Fix:** Replace placeholder webhook URL with live Make webhook URL for newsletter signup form
- **Files changed:** `docs/projects.html`

### PR #20 — `claude/magazine-modal-list-redesign` — *Merged 2026-03-29*
- **Feature:** Redesign magazine modal from card grid to scrollable list (latest issue first, #16→#1)
- **Feature:** Add 10 new newsletter PDFs (August 2025 – March 2026) to repo
- **Fix:** Rename 3 old `ניוזלטר` PDFs to `מגזין` to match actual filenames, fixing broken download links
- **Feature:** Each list row: neon issue number · date + tiny book icon · unique 16-bit SVG icon · download button
- **Feature:** 16 unique pixel-art SVG icons per issue (star, gem, lightning, mushroom, heart, flame, sword, shield, crown, bomb, music note, moon, trophy, floppy disk, 4-point star, gamepad)
- **Files changed:** `docs/projects.html`, `docs/assets/PDF download for 8bit newsletter/` (10 new PDFs + 3 renames)

> **Note:** Entries for PR #32–#42 were drafted in prior sessions but never committed to main. The next entry below picks up from PR #43.

## 2026-04-26

### PR #43 — `claude/favicon-wiring` — *Merged 2026-04-26*
- **Feature:** Add full favicon set under `docs/assets/favicon/` — `favicon.ico`, 16/32 PNGs, `apple-touch-icon.png`, `android-chrome-192x192.png` / `512x512.png`, `site.webmanifest`
- **Feature:** Wire `<link rel="icon">`, `apple-touch-icon`, `manifest`, and `theme-color` (`#0b0014`) into the `<head>` of all 12 pages — 6 Hebrew (`docs/`) and 6 English (`docs/en/`, with `../` prefixed paths)
- **Fix:** Correct `site.webmanifest` — set `name` / `short_name` to `8bitretro.tech` / `8bitretro`, fix icon paths from broken root-relative `/android-chrome-*.png` → `/assets/favicon/...`, switch theme/background colors from white → `#0b0014` to match the synthwave palette
- **Files changed:** `docs/assets/favicon/` (7 new files), all 6 Hebrew HTML pages + all 6 English HTML pages

### PR #44 — `claude/lang-toggle-flags` — *Merged 2026-04-26*
- **Feature:** Replace plain `EN` / `HE` text in the language toggle with inline pixel-art flag SVGs
- **Feature:** Hebrew pages get a Union Jack (UK flag) linking to the English version; English pages get an Israel flag (blue stripes + Star of David outline) linking back to Hebrew
- **Feature:** Pure inline SVG, no extra asset files, ~26×16px display, `image-rendering: pixelated` + neon cyan drop-shadow to match the existing pixel-art icon style
- **A11y:** `title` attribute for hover tooltip (`English` / `עברית`), `aria-label` for screen readers, `aria-hidden="true"` on the decorative SVG
- **Files changed:** all 6 Hebrew HTML pages + all 6 English HTML pages (12 files, +112 / −20)

## 2026-09-03

### PR #45 — `claude/human-race-video-series` — *Draft, open*
- **Feature:** New `#video-series` section at the bottom of the home page — an 8-episode grid for the YouTube series on cracking the Human Race cassette with modern tools (shared title: `מקסטה אנלוגית של קומודור 64 לפריצה האקינג בכלים מודרניים`)
- **Feature:** Lazy YouTube facades — each card renders `img.youtube.com/vi/<ID>/hqdefault.jpg` and only swaps in a real iframe on click, avoiding 8 third-party players loading on every home-page visit
- **Feature:** Cards reuse the CRT scanline + vignette treatment from the Breakout canvas; episode badge (`פרק 1…8` / `EP 1…8`), per-card outbound YouTube link, `youtube-nocookie.com` embeds
- **Behaviour:** Starting a video calls `GlobalPlayer.pause()` so the persistent site music cannot play over it; only one episode plays at a time (opening a card tears down any other card's iframe)
- **Behaviour:** An empty episode ID renders a `בקרוב` / `Coming soon` placeholder instead of a broken embed, so a partially-filled list degrades gracefully
- **Episodes:** All 8 IDs wired from channel `UCIoM9Tdqb2VlHO76_ACjk4Q` — `Z71GCPsKcWc`, `ED14kbgNkNQ`, `aX0nLfNu59I`, `T-RxgOkyiUQ`, `qi6SSvWJg7o`, `GtKcssJTb4g`, `IwsJfXSJF8A` (סיום / Finale), `V2A7YQ6BhXE` (בונוס / Bonus)
- **Files changed:** `docs/index.html`, `docs/en/index.html` (+113 each, pure additions)
- **Also on branch:** `5c64017` — unrelated pre-existing Breakout fixes (brick-collision push-out, auto-pause on tab hide) committed separately so either change can be reverted alone
- **Revert point:** tag `baseline-before-video-series` at `c9372cd`

> **Known issue, not from this PR:** `global-player.js` and `social-strip.js` hardcode page-relative `assets/...` paths, which resolve to `docs/en/assets/...` on the English pages. Result: the global music player has no audio and the social icons 404 on all 6 English pages. Needs a separate fix.
