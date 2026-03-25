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
