# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**my_retro_website** — A static retro 80s synthwave-themed personal website for Alex Goldblat (8bitretro.tech), written in Hebrew (RTL). No build step, no backend, no framework — just HTML files with embedded TailwindCSS CDN and inline styles.

## Deployment

- Hosted on **GitHub Pages** from the `docs/` directory with a custom domain (`CNAME` → `8bitretro.tech`).
- To deploy: push to `master`. Changes to files in `docs/` go live automatically.

## Architecture

All pages live in `docs/`. There is no templating engine — navigation, `<head>`, and animations are **duplicated across every HTML file**. When making changes that affect shared structure (nav, background, fonts, scanline overlay), update each file individually.

**Key pattern across all pages:**
- `<html lang="he" dir="rtl">` — Hebrew, right-to-left
- TailwindCSS loaded via CDN (`https://cdn.tailwindcss.com`) — no local build
- "Press Start 2P" pixel font from Google Fonts
- Animations (`neonGradient`, `scanline-overlay`, `outrunPan`) defined in per-page `<style>` blocks
- All layout uses Tailwind utility classes directly in HTML; `src/style.css` and `src/scripts.js` are effectively empty

**Color palette (neon synthwave):**
- Cyan: `#00fff3` / Tailwind `cyan-300/400`
- Magenta: `#ff2dd2` / Tailwind `pink-300/400`
- Background: `bg-gradient-to-b from-purple-900 via-pink-700 to-black`

## Content

All site text is in **Hebrew** and lives in `content/site_content.md`. This is a reference/source file — it is not consumed programmatically; HTML pages are written separately.

## Pages

| File | Hebrew title | Purpose |
|------|-------------|---------|
| `docs/index.html` | דף הבית | Home: hero bio, OutRun animation, 3-card grid |
| `docs/about.html` | עליי | Personal profile + image gallery |
| `docs/projects.html` | פרויקטים | Portfolio showcase with CRT-frame styling |
| `docs/contacts.html` | צור קשר | Contact form + social links |
| `docs/releases.html` | ריליסים | C64 demo/software releases with CSDb links |

## Conventions

- No build commands. Open HTML files directly in a browser or push to GitHub Pages.
- Prefer editing existing files over creating new ones.
- New pages must replicate the nav/head/animation boilerplate from an existing page.
- Images go in `docs/assets/images/`. Reference them as relative paths (`assets/images/filename.jpg`).
- Do not introduce JavaScript frameworks or npm tooling — keep it dependency-free.
- Branch strategy: feature branches prefixed with `claude/` for AI-assisted work.
