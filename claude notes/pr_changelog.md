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

### PR #46 — `claude/fix-en-asset-paths` — *Merged 2026-09-03*
- **Fix:** `global-player.js` and `social-strip.js` built asset URLs as page-relative strings (`'assets/...'`), which resolve to `docs/en/assets/` from English pages and 404. Live impact: the global music player had no audio and all 4 social icons were missing on all 6 English pages (5 console 404s per page), from the moment the English version shipped
- **Fix:** Both files now derive `var ASSET_BASE = /\/en\//.test(location.pathname) ? '../' : ''` once and apply it where the URL is consumed (`audio.src` ×2, `img.src` ×1) — the 13-track playlist and 4-link social table are left untouched
- **Note:** `'../'` rather than root-absolute `/assets/...` so the site survives being served from a subpath and local previews match production
- **Verified:** English page 5 console errors → 0, social icons 0/4 → 4/4, audio resolves to `/assets/music/` instead of `/en/assets/music/`; Hebrew page unchanged at 0 errors with unprefixed paths
- **Files changed:** `docs/assets/js/global-player.js`, `docs/assets/js/social-strip.js`

### PR #47 — `claude/remove-em-dashes` — *Merged 2026-09-03*
- **Fix:** Replace every user-visible em dash (`—`) with a plain hyphen across the site, per standing preference (see earlier `fix: replace em dashes with single dashes in index hero text`)
- **Scope:** 49 replacements in 11 files — 10 HTML pages (Hebrew + English) and `global-player.js` (13 artist names that render in the player pill). Diff is 47 insertions / 47 deletions, a pure 1:1 character swap with no prose rewritten
- **Left alone:** 47 em dashes inside JS/HTML comments (invisible to visitors; rewriting them would have doubled the diff for no user-facing change)
- **Left alone:** en dashes (`–`), a different character, used mainly as the page-title separator (`About – 8bitretro.tech`) and in a few headings — flagged for a possible follow-up
- **Verified:** `document.body.innerText` contains 0 em dashes on both index pages; no regressions (8 video cards, 8 thumbnails, 4 social icons, 0 console errors)
- **Files changed:** `docs/{about,index,kleiner82,projects,releases}.html`, `docs/en/{about,index,kleiner82,projects,releases}.html`, `docs/assets/js/global-player.js`

### PR #48 — `claude/newsletter-issues-18-22` — *Merged 2026-09-03*
- **Feature:** Add newsletter issues #18–#22 (מאי–ספטמבר 2026) to the magazine archive, which had stopped at אפריל 2026 (#17). The five newer issues only ever existed as email and were recovered from the mail archive
- **Feature:** 5 PDFs generated from the newsletter content, laid out in the site's own retro style (Hebrew RTL, neon/CRT palette) and rendered via headless Chrome — rather than printed from the raw email, so issues 18–22 stay visually coherent with the 17 magazine PDFs already in the list
- **Feature:** 5 generated synthwave cover thumbnails (`icon-18`…`icon-22`) — sun, perspective grid, neon frame — in the same 736×1076 portrait format as the existing icons, one per issue so no two rows share artwork
- **Feature:** 5 rows added to `docs/projects.html` and `docs/en/projects.html`, continuing the existing alternating purple/teal numbering
- **Note:** Rows are labelled by month, not by the issue numbers in the email subjects — those are inconsistent (June *and* July both say "גיליון 21", August 22, September 23), while the site's rows have always been month-based
- **Note:** July's original newsletter was no longer in the mailbox; recovered from a forward. August's was sitting in Trash
- **Note:** Item #05 of the August issue contains apparent accidental text (`dfsdfsdf` and a stray personal line mid-article); omitted from the archived PDF
- **Verified:** 5 rows render in the archive modal on both pages newest-first, all 5 covers load, every PDF/icon reference resolves against disk (0 broken), 0 console errors
- **Files changed:** `docs/projects.html`, `docs/en/projects.html`, 5 new PDFs, 5 new icons (12 files, +80 lines)

### PR #49 — `claude/newsletter-covers-artwork` — *Merged 2026-09-03*
- **Fix:** Replace the generated template covers for issues #18–#22 shipped in #48. Those were drawn from a single programmatic template (synthwave sun + grid, number and month swapped in), so at thumbnail size all five read as the same image and none matched the archive's established look — warm, detailed retro-computing scenes and period advertising, a different subject per issue
- **Fix:** Five distinct scenes instead — #18 bedroom desk at night, #19 sunlit morning study, #20 arcade corridor at night, #21 datasette close-up with hand-written label, #22 living room at sunset with CRT television. Original scenes, not recreations of real advertisements
- **Scope:** Images only — same `736×1104` portrait format and same filenames, so no markup changes
- **Reviewed:** Checked in the running archive modal on both language pages and approved before merge
- **Files changed:** `docs/assets/images/magazine/icons/icon-18..22.jpeg`

### PR #50 — `claude/nav-releases-kleiner` — *Merged 2026-09-03*
- **Feature:** Add `ריליסים` / `Releases` and `Kleiner'82` to the nav on all 12 pages, between Projects and Contact. Both pages existed but nothing linked to them, so the CSDb release list and the Kleiner'82 album player were reachable only by typing the URL
- **Fix:** Rebuild every nav link's classes so exactly one is active per page — this also corrects two pre-existing oddities: `kleiner82.html` highlighted *Projects* rather than itself, and `releases.html` highlighted nothing at all
- **Copy:** Front-page video-series heading now ends with `דיגיטלית`; English reads "From a C64 Analog Cassette to a Digital Crack"
- **Verified:** At 1280px on both languages — no nav overflow, no link off-screen, exactly one active link per page (all 12 checked), both new links navigate and self-highlight, 0 console errors
- **Known limitation (pre-existing, worsened):** at ~390px the nav already overflowed because the in-nav music player (`#gp-root`) is 323px of a 360px bar with `flex-shrink:0`, squeezing the link strip to 0px. With two more links, Contact and the language toggle now fall off the left edge. Three mitigations were tried and rejected: nav wrapping (grew the bar to 180px and hid the page `h1` by 59px), a scrollable strip (strip still resolved to 0px because the player won't yield space), and shrinking the player below 768px (unverifiable — the browser kept serving a cached `global-player.js`). Real fix belongs in its own change against `global-player.js`
- **Files changed:** all 6 Hebrew + all 6 English HTML pages (12 files, +130 / −10)

## 2026-09-06

### PR #51 - `claude/jud-memorial` - *Pending approval*
- **Feature:** "About Kleiner'82" section on the Kleiner'82 page (Hebrew + English), directly under the hero and above the album player. Tells the story of the group from the Bandcamp bio (formed August 2016 in Herzliya by Alex and Jud, '80s new wave lovers, albums shaped by synth music and analog gear, the six albums) and, set apart under a thin pink rule, the loss of Jud (Yehuda Schpitz) on March 30, 2026, adapted from the Neon Dreams dedication
- **Content:** Hebrew page is fully in Hebrew, English page in English. Written in the first-person voice of the site's About page
- **Photo:** `docs/assets/images/jud.jpg` (new) - square crop of Alex and Jud, lightly graded (desaturation, teal shadows / warm highlights, vignette, grain), shown in the site's CRT frame with the caption "Alex and Jud, Herzliya"
- **Design:** same card, border, pixel-font heading and body text style as the rest of the page. No new fonts, no animations, no extra buttons
- **Fix:** the page used to auto-scroll to the expanded player on load, which would have scrolled straight past the new section. `openAlbum()` takes a `skipScroll` flag used only for the initial auto-open; clicking a cover still scrolls as before
- **Not changed:** the Neon Dreams album description (dedication already lives on Bandcamp)
- **Verified (Playwright, headless Chromium):** both pages at 1280px and 390px - section renders, photo loads, no horizontal overflow, 0 console errors, 0 failed requests, 0 em dashes in visible text, Hebrew text direction rtl. Inline scripts pass `node --check`
- **Files changed:** `docs/kleiner82.html`, `docs/en/kleiner82.html`, `docs/assets/images/jud.jpg` (new), `claude notes/pr_changelog.md`
