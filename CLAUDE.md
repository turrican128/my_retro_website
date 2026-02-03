# CLAUDE.md - AI Assistant Guide for my_retro_website

## Project Overview

A static retro 80s-themed personal website (8bitretro.tech) built using a prompt-driven development approach with GitHub Copilot in PyCharm. The site features synthwave/arcade aesthetics inspired by Commodore 64, Amiga, and 80s culture.

**Live Domain:** 8bitretro.tech (hosted on GitHub Pages)

**Primary Language:** Hebrew (RTL layout)

**Owner:** Alex Goldblat - retro enthusiast, C64/Amiga demo creator, and Synthwave musician (Kleiner'82)

## Directory Structure

```
my_retro_website/
├── docs/                    # GitHub Pages deployment directory (public files)
│   ├── index.html          # Home page
│   ├── about.html          # About page with personal bio and gallery
│   ├── projects.html       # Projects showcase with modals
│   ├── contacts.html       # Contact form with webhook integration
│   ├── CNAME               # Custom domain configuration
│   └── assets/
│       └── images/         # Site images (retro-themed JPGs, GIFs)
├── content/
│   └── site_content.md     # Source content in Markdown (Hebrew)
├── src/
│   ├── style.css           # Custom CSS (mostly unused - TailwindCSS CDN used instead)
│   └── scripts.js          # Custom JavaScript (empty - scripts inline in HTML)
├── project_guide.md        # Original project vision and workflow documentation
├── README.md               # Brief project description
└── CLAUDE.md               # This file - AI assistant guide
```

## Technology Stack

| Technology | Usage |
|------------|-------|
| TailwindCSS | Primary styling via CDN (`https://cdn.tailwindcss.com`) |
| Google Fonts | "Press Start 2P" pixel font for retro headings |
| Vanilla JavaScript | Inline scripts for interactivity (modals, forms, clipboard) |
| GitHub Pages | Static hosting from `docs/` directory |
| Make.com Webhook | Contact form submission backend |

## Key Conventions

### HTML Structure
- All pages use `lang="he"` and `dir="rtl"` for Hebrew RTL support
- Consistent navigation header across all pages (fixed position, glassmorphism style)
- Each page has a decorative SVG grid at the bottom
- Content width constrained to `w-[min(1100px,96%)]`

### Styling Patterns
- **Background:** Animated gradient from purple-900 via pink-700 to black
- **Scanlines:** CRT-style overlay using `::before` pseudo-element
- **Cards:** `bg-black/60` with `border border-cyan-400/XX` and heavy box shadows
- **Text:** Primary `text-sky-100`, headings `text-cyan-200`/`text-pink-300`
- **Buttons:** Gradient from cyan to pink with neon glow on hover
- **Font family for headings:** `[font-family:'Press Start 2P',monospace]`

### Color Palette
```
Primary Colors:
- Cyan: text-cyan-200, text-cyan-300, border-cyan-400/XX
- Pink/Magenta: text-pink-300, from-pink-500
- Purple: from-purple-900 (background)
- Sky: text-sky-100 (body text)

Neon Glow Effects:
- Cyan glow: shadow-[0_0_20px_rgba(0,255,243,0.4)]
- Pink glow: shadow-[0_0_25px_rgba(255,45,210,0.6)]
```

### JavaScript Patterns
- Scripts are inline at the bottom of each HTML file
- IIFE pattern used to avoid global scope pollution
- Clipboard API with fallback to `window.prompt()`
- Contact form uses `fetch()` to Make.com webhook with no-cors fallback

## Page Descriptions

### `docs/index.html` - Home Page
- Hero section with personal introduction (Hebrew)
- OutRun-style animated image with CSS keyframe animation
- Three info cards linking to other pages
- Large profile image linking to About page
- "Areas of Interest" section with C64 and Synthwave topics

### `docs/about.html` - About Page
- Extended personal biography
- Profile image with overlay
- Arcade-style image gallery (6 images with hover effects)
- Community section about "8bit Israel" Facebook group and newsletter
- Navigation buttons to Projects and Contact

### `docs/projects.html` - Projects Page
- Grid of project cards with CRT effect on images
- Modal popup for magazine details (triggered by button)
- GIF animations showcasing retro content
- CRT flicker animation effect

### `docs/contacts.html` - Contact Page
- Contact methods with copy-to-clipboard for email
- Social media links (Facebook, YouTube, Mixcloud)
- Contact form with webhook submission to Make.com
- Toast notification on successful submission

## Development Workflow

### Content-First Approach
1. Define/update content in `content/site_content.md`
2. Use AI prompts (Copilot/Claude) to generate HTML based on content
3. Apply consistent styling using existing TailwindCSS patterns
4. Test locally by opening HTML files in browser

### Making Changes
- **Edit content:** Modify HTML directly in `docs/` directory
- **Add images:** Place in `docs/assets/images/`
- **Styling changes:** Use TailwindCSS utility classes inline
- **New pages:** Copy existing page structure, update nav active state

### Deployment
- Push changes to GitHub repository
- GitHub Pages automatically deploys from `docs/` directory
- Custom domain configured via `docs/CNAME`

## Important Notes for AI Assistants

### Do's
- Maintain RTL (right-to-left) Hebrew text direction
- Use existing TailwindCSS class patterns for consistency
- Keep the synthwave/retro aesthetic with neon colors and glows
- Preserve inline scripts at bottom of HTML files
- Use `text-right` alignment for Hebrew content
- Test responsive design with `md:` breakpoint prefixes

### Don'ts
- Don't add external CSS frameworks beyond TailwindCSS CDN
- Don't change the navigation structure without updating all pages
- Don't remove the scanline overlay or animated background effects
- Don't use LTR-specific layouts without proper RTL consideration
- Don't modify `docs/CNAME` as it controls the custom domain

### Hebrew Text Direction
All content containers should have:
```html
<element dir="rtl" class="text-right">
```

### Adding New Sections
Follow this card pattern:
```html
<section class="rounded-xl p-6 bg-black/60 border border-white/15 shadow-[0_24px_80px_rgba(0,0,0,0.8)] backdrop-blur">
  <h2 class="[font-family:'Press Start 2P',monospace] text-xl text-cyan-200 mb-4">
    כותרת
  </h2>
  <p class="text-sm text-sky-100/85">
    תוכן
  </p>
</section>
```

## External Integrations

### Contact Form Webhook
- **Service:** Make.com (formerly Integromat)
- **Endpoint:** `https://hook.eu2.make.com/mcw37xe7c5p91p391pdr4d18979ebfow`
- **Payload:** `{ name, email, message, source, sentAt }`

### Social Links
- Email: alexgoldblat@gmail.com
- Facebook: https://www.facebook.com/alex.goldblat
- YouTube: https://www.youtube.com/@Kleiner82-tf8bz
- Mixcloud: https://www.mixcloud.com/alex-goldblat/

## File Quick Reference

| File | Purpose | Key Features |
|------|---------|--------------|
| `docs/index.html` | Home page | Hero, OutRun animation, info cards |
| `docs/about.html` | Bio page | Gallery, community section |
| `docs/projects.html` | Portfolio | CRT effects, modal |
| `docs/contacts.html` | Contact | Form, webhook, copy button |
| `content/site_content.md` | Source content | Hebrew markdown |
| `project_guide.md` | Dev guide | Original vision, workflow |
