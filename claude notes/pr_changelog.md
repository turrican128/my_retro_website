# PR Changelog

Ongoing log of all pull requests merged into this project.

---

## 2026-03-23

### PR #12 — `claude/releases-new-entries-petscii-bg`
- **Feature:** Add 4 new 2025 CSDb releases (Happy Birthday Mythus, 50 Years of Serato, Fifty Years, Happy Birthday JLD) — total now 12 cards
- **Feature:** Add scattered PETSCII art fragments as subtle fixed background on releases page (LOAD command, PETSCII symbols, DR.J/DELYSID badge, disk directory, BASIC snippet)
- **Fix:** Percent-encode space in Happy Birthday JLD download URL
- **Fix:** Correct missing filename in Irata 50th Bday tune download link
- **Files changed:** `docs/releases.html`

## 2026-03-24

### PR #13 — `claude/kleiner82-music-page`
- **Feature:** New Kleiner'82 music page (`docs/kleiner82.html`) showcasing all 5 Bandcamp albums with interactive album-focused audio player
- **Feature:** Album grid with CRT scanline effects, click-to-expand view with centered large artwork and full track lists
- **Feature:** Now Playing bar with playback controls, progress bar, and time display
- **Feature:** C64 boot animation with album directory listing
- **Feature:** Link Kleiner'82 card in projects page to new page
- **Fix:** Unreliable `audio.src` guard replaced with `currentTrackIndex` check
- **Fix:** Moved `c64blink` keyframe from dynamic JS injection to static CSS
- **Files changed:** `docs/kleiner82.html` (new), `docs/projects.html`, `claude notes/pr_changelog.md` (new)

## 2026-03-25

### PR #17 — `claude/magazine-modal-pixel-art-thumbnails`
- **Feature:** Replace 6 gradient+SVG magazine card thumbnails with custom retro pixel art PNGs (arcade cabinet, space invaders, pac-man, retro computer, joystick, spaceship)
- **Feature:** Slow CRT power-on modal animation from 280ms to 700ms with cinematic phosphor warmup effect and more keyframe steps
- **Files changed:** `docs/projects.html`, `docs/assets/images/magazine/issue-1.png` through `issue-6.png` (new)
