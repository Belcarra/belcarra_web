# belcarra_web

Belcarra's static website, maintained as HTML pages and Markdown announcements and deployed to Cloudflare Pages.

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
3. Commit and push to `develop`. GitHub Actions validates and publishes the site to Cloudflare Pages.

Announcements are rendered newest-to-oldest by `date`.
Preferred filename format: `YYYY-MM-DD-short-slug.md` (or `YYYY-MM-short-slug.md` when day is unavailable).

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

Cloudflare Pages project: `belcarra-web`, with production branch `develop`.
The intended initial address is `https://belcarra-web.pages.dev`; its availability must be confirmed when the project is created.

The workflow in `.github/workflows/cloudflare-pages.yml` validates pull requests targeting `develop` and deploys pushes to `develop`. It can also be started manually from GitHub Actions on `develop`.

### One-time Cloudflare setup

Create a Cloudflare API token with **Account / Cloudflare Pages / Edit**, scoped to the deployment account. Store these repository secrets in `Belcarra/belcarra_web`:

- `CLOUDFLARE_API_TOKEN`: the scoped API token.
- `CLOUDFLARE_ACCOUNT_ID`: the account ID from Cloudflare.

Using those values in the local environment, create a Direct Upload project once:

```sh
npx wrangler@4 pages project create belcarra-web --production-branch=develop
```

Optional repository variables:

- `CLOUDFLARE_PAGES_PROJECT`: override the project name (default `belcarra-web`).
- `CLOUDFLARE_SITE_URL`: public canonical URL (default `https://belcarra-web.pages.dev`). Set this when attaching the final custom domain.

No production DNS change is needed to preview the site on `pages.dev`.

### Local validation and preview

```sh
node --check assets/site.js
python3 scripts/build_site.py
python3 -m http.server 8000 --directory dist
```

Open `http://localhost:8000`. The staging script requires a new output directory; move or remove the previous generated `dist/` directory before rebuilding, or pass `--output` with a new path.

`scripts/build_site.py` validates local page references, announcement filenames, dates, and file availability. It stages public HTML, assets, and announcement content into ignored `dist/`, and rewrites canonical/social URLs, structured data, robots.txt, and the sitemap for the configured deployment URL. The repository's GitHub Pages URLs remain unchanged in source so the existing preview can continue working.

Announcements are rendered by `assets/site.js` using `announcements/manifest.json`. There is no Jekyll build: filename dates do not automatically create standalone post pages or titles.

## Contact form email delivery

The contact form selects `info@belcarra.com` or `security@belcarra.com` explicitly. The server maintains the recipient allowlist; visitor input cannot choose arbitrary recipients. Messages use the visitor's email as Reply-To. No visitor confirmation emails are sent.

Production Pages environment settings (configured through the Cloudflare API):

- `CONTACT_EMAIL_API_TOKEN`: encrypted secret containing the email-scoped API token.
- `CONTACT_EMAIL_ACCOUNT_ID`: Cloudflare account ID.
- `SENDING_EMAIL_ADDRESS`: `website@belcarra.com`; the sender domain must be onboarded to Email Service.

Cloudflare's free delivery path requires both destination inboxes to be registered and verified. Verification emails were requested on 2026-10-23; inbox owners must follow their links. Sender onboarding is separate: Compute > Email Service > Email Sending > Onboard Domain. Preserve existing inbound MX records and existing DMARC policy; do not enable paid service for this contact form. Confirm account eligibility and a real delivery before considering email setup complete.

The available account email token can register recipients and reach the sending endpoint, but zone sender-configuration requests currently return Unauthorized. Complete sender setup in the dashboard or supply the needed zone permissions. Until setup is complete, the form reports that the message was not sent and preserves the visitor's text.

The handler validates types, lengths, recipient choice, email syntax, request size, and Origin when present. A honeypot rejects simple bots; this is not a substitute for rate limiting or server-verified Turnstile if submission abuse occurs. Message contents and API credentials are not logged or exposed in frontend assets.
