# my_retro_website

A retro 80s synthwave-themed personal website for [8bitretro.tech](https://8bitretro.tech), written in Hebrew (RTL). Built with plain HTML5, TailwindCSS via CDN, and no backend or build step.

## Pages

| File | Purpose |
|------|---------|
| `index.html` | Home: hero bio, OutRun animation, 3-card grid |
| `about.html` | Personal profile and image gallery |
| `projects.html` | Portfolio showcase with CRT-frame styling |
| `contacts.html` | Contact form and social links |
| `releases.html` | C64 demo/software releases with CSDb links |

## Tech Stack

- Static HTML5, Hebrew/RTL (`lang="he" dir="rtl"`)
- [TailwindCSS](https://tailwindcss.com) via CDN — no local build
- [Press Start 2P](https://fonts.google.com/specimen/Press+Start+2P) pixel font from Google Fonts
- Hosted on **GitHub Pages** from the `docs/` folder
- Custom domain `8bitretro.tech` via CNAME

## Deployment

Push to `main`. Changes to `docs/` go live automatically via GitHub Pages.

## Development

No build step required. Edit HTML files directly and open in a browser to preview.

New pages should replicate the nav/head/animation boilerplate from an existing page. Images go in `docs/assets/images/`.
