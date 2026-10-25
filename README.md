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

The free delivery architecture is Pages `/api/contact` -> private `CONTACT_MAILER` service binding -> `belcarra-contact-mailer` Worker -> restricted `send_email` binding. The Worker uses the legacy `EmailMessage` API and permits only the two verified destinations. Its public workers.dev and preview URLs are disabled. Sender: `website@forms.belcarra.com`.

Setup prerequisites:

- Verify both destination inboxes using Cloudflare's verification links (requested 2026-10-23).
- Configure Email Routing on `forms.belcarra.com`, preserving all root Google MX records. Do not onboard the paid Email Sending service or purchase a paid plan.
- The setup token needs Account / Email Routing Addresses / Edit and Zone / Zone Settings / Edit scoped to `belcarra.com`. The Routing DNS enable API requires Zone Settings Write.
- A deployment token needs Account / Workers Scripts / Edit. Store it as the `CLOUDFLARE_WORKERS_API_TOKEN` GitHub secret, separate from the existing Pages deployment token.
- Deploy `worker/wrangler.jsonc`, then add a production Pages service binding named `CONTACT_MAILER` referencing `belcarra-contact-mailer`. Preserve all other existing project settings.
- Once the service binding works, remove the obsolete production `CONTACT_EMAIL_API_TOKEN`, `CONTACT_EMAIL_ACCOUNT_ID`, and `SENDING_EMAIL_ADDRESS` variables from the earlier paid REST integration.

On 2026-10-23 the private Worker was deployed, Email Routing was enabled only on `forms.belcarra.com`, the production Pages `CONTACT_MAILER` service binding was configured, and the old REST credentials were removed. All four Google MX records on `belcarra.com` were checked unchanged. Destination addresses are registered but still unverified; inbox owners must click the verification links. Routing, failure handling, input validation, and MIME encoding are tested by `node scripts/test_contact.mjs`. Verify actual delivery to both inboxes after verification before considering setup complete. No paid plan was enabled.

The handler validates types, lengths, recipient choice, email syntax, request size, and Origin when present. A honeypot rejects simple bots; this is not a substitute for rate limiting or server-verified Turnstile if submission abuse occurs. Message contents and API credentials are not logged or exposed in frontend assets.

## Technical assistant

The chat widget posts to the Pages Function at `/api/chat`, which validates questions and forwards them over the existing private `CONTACT_MAILER` service binding. The Worker calls Cloudflare Workers AI through its `AI` binding, using `@cf/meta/llama-3.1-8b-instruct-fp8`. No Google API key or separate AI API token is required. AI Studio can still be used to edit this repository; it is independent of the production inference provider.

The model is eligible for Workers AI's free allocation of 10,000 neurons per account per day. On Workers Free, exhausted allowances cause errors rather than paid overages. This allowance is shared with other Workers AI applications in the account. No paid plan or automatic paid fallback is configured here; if the account is upgraded later, review its billing controls. See https://developers.cloudflare.com/workers-ai/platform/pricing/.

The assistant indexes the entire published text site: all top-level HTML page bodies and all announcements listed in `announcements/manifest.json` (currently 8 pages and 22 announcements). Edit those HTML/Markdown files normally; no separate chatbot summary needs maintaining. The build and GitHub deployment regenerate `worker/site-knowledge.mjs` using `scripts/site_knowledge.py`. Run that script manually before local Worker previews after editing documents. The generated file is tracked for convenient standalone previews, but deployment always rebuilds it from the checkout.

`worker/references.mjs` selects up to eight relevant passages using lightweight local keyword ranking, including preceding user questions for context. The model receives those excerpts, not every page on every question. Answers display links to the retrieved site references; these identify material supplied to the model, not proof that every generated statement is correct. Dated announcements are labeled historical, and instructions prioritize current pages. Visitors should still check sources. No vector database, embeddings service, additional key or paid service is required.

Only text and image alternative text are indexed. Images/diagrams are not visually interpreted, linked external sites and downloads are not crawled, and README, credentials, scripts, forms and private OEM material are excluded. This is a snapshot refreshed on deployment, not a live web browser. Questions and history are sent to Cloudflare for inference but are not stored or logged by this application.

The private Worker checks approximately five questions per IP per minute and sixty per site per minute within each Cloudflare location before inference. These distributed abuse controls are not a strict global or daily spending cap. Missing AI or limiter bindings fail closed. Public Worker URLs remain disabled, and contact-email handling is unchanged.

Requests are bounded to 32 KiB, questions to 800 characters, history to six messages of up to 1,000 characters each, and output to 600 tokens. The Pages-to-Worker request has a 25-second timeout and the widget a 35-second timeout. Concurrent widget sends are blocked. A timeout stops waiting for a response; it does not guarantee cancellation of inference already running. Provider errors are hidden and visitors are directed to documentation or Contact Us when unavailable.

Run `python3 scripts/site_knowledge.py`, `python3 scripts/test_site_knowledge.py`, `node scripts/test_chat.mjs` and `node scripts/test_contact.mjs`. GitHub Actions tests and deploys the private Worker (including its document snapshot, AI and rate-limit bindings) before Pages. No additional Pages binding is needed beyond `CONTACT_MAILER`. The obsolete `GEMINI_API_KEY` Pages secret can be removed, and unused Google keys should be revoked in AI Studio.
