# belcarra_web

Modernized, stability-focused Belcarra website scaffold for GitHub Pages.

## Goals

- Present Belcarra as a long-standing, reliable USB networking partner for OEM engineering teams.
- Keep the site modern and mobile-friendly without flashy end-user marketing style.
- Keep content updates simple using plain HTML pages and Markdown announcements.

## Source precedence for migrated content

When content differs between existing sites, use this order:

1. https://usblan.belcarra.com/
2. https://usbd.belcarra.com/
3. https://www.belcarra.com/

## Site structure

- `index.html`: Homepage and announcements feed.
- `driver-overview.html`
- `protocols.html`
- `uninstalling.html`
- `troubleshooting.html`
- `gadget.html`
- `faq.html`
- `contact-us.html`
- `assets/styles.css`: Shared styling.
- `assets/site.js`: Year + Markdown announcements loader.
- `announcements/manifest.json`: Announcement metadata and order source.
- `announcements/*.md`: Markdown announcement content.

## Announcement workflow (Markdown)

1. Create a new markdown file in `announcements/` (for example `2026-03-01-release-note.md`).
2. Add an entry to `announcements/manifest.json` with:
   - `title`
   - `date` in `YYYY-MM-DD`
   - `file`
3. Commit and push to the GitHub Pages branch.

Announcements are rendered newest-to-oldest by `date`.

## Tab page workflow (HTML)

Each tab page is a standalone HTML file so updates are easy:

- Open the page file (for example `protocols.html`).
- Edit content directly.
- Commit and push.

## Content migration checklist

Migrate in this exact order:

1. `https://usblan.belcarra.com/`
2. `https://usbd.belcarra.com/`
3. `https://www.belcarra.com/`

For each tab page, update:

- Current Windows 11 guidance for `amd64` and `arm64`
- Any deprecated version references
- Installation/uninstall/troubleshooting steps for current signing and deployment expectations
- FAQ language to target engineering and integration teams (not end-user marketing)

## Current technical focus

- Windows 11
- amd64 and arm64 driver targets

## Deployment

Target deployment platform: GitHub Pages.
