#!/usr/bin/env python3
"""Validate and stage public files for a static Pages deployment."""

import argparse
import json
import re
import shutil
from datetime import date
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit
from site_knowledge import generate


ROOT = Path(__file__).resolve().parent.parent
CANONICAL_URL = "https://www.belcarra.com"
OLD_URLS = ["https://belcarra.github.io/belcarra_web", "https://belcarra-web.pages.dev"]


def with_analytics(html):
    """The supplied file is an HTML tag snippet, despite its .js extension."""
    snippet = (ROOT / "ganalytics.js").read_text().strip()
    if not snippet or html.count("</head>") != 1:
        raise ValueError("Analytics needs a nonempty snippet and exactly one HTML head")
    if "googletagmanager.com/gtag/js" in html:
        raise ValueError("Page already contains a Google tag; refusing duplicate tracking")
    return html.replace("</head>", snippet + "\n</head>", 1)


class Links(HTMLParser):
    def __init__(self):
        super().__init__()
        self.urls = []

    def handle_starttag(self, tag, attrs):
        for name, value in attrs:
            if name in {"href", "src"} and value:
                self.urls.append(value)


def clean_url_path(stem):
    return "/" if stem == "index" else f"/{stem}"


def to_extensionless_urls(text, site_url, stems):
    target = site_url.rstrip("/")
    stem_group = "|".join(re.escape(stem) for stem in sorted(stems, key=len, reverse=True))
    # 1. Full site URLs (canonical, og:url, JSON-LD, sitemap.xml)
    text = re.sub(
        rf"{re.escape(target)}/({stem_group})\.html([#\"'< \n\r\t]|$)",
        lambda m: target + clean_url_path(m.group(1)) + m.group(2),
        text,
    )
    # 2. Root- or page-relative HTML href/url/replace links and Markdown links
    text = re.sub(
        rf'(href=["\']?|url=|location\.replace\(["\']|]\()/?({stem_group})\.html(["\')#])',
        lambda m: m.group(1) + clean_url_path(m.group(2)) + m.group(3),
        text,
    )
    return text


def build(output, site_url):
    parsed = urlsplit(site_url)
    if parsed.scheme != "https" or not parsed.netloc or parsed.query or parsed.fragment:
        raise ValueError("Site URL must be an absolute HTTPS URL without query or fragment")
    if output.exists():
        raise ValueError(f"Output already exists: {output}; choose a new directory")

    pages = sorted(ROOT.glob("*.html"))
    stems = {page.stem for page in pages}
    manifest = json.loads((ROOT / "announcements/manifest.json").read_text())
    seen = set()
    for entry in manifest:
        date.fromisoformat(entry["date"])
        filename = entry["file"]
        if Path(filename).name != filename or Path(filename).suffix not in {".md", ".html"}:
            raise ValueError(f"Invalid announcement filename: {filename}")
        if filename in seen or not entry["title"].strip():
            raise ValueError(f"Duplicate file or missing title: {filename}")
        seen.add(filename)
        if not (ROOT / "announcements" / filename).is_file():
            raise ValueError(f"Missing announcement: {filename}")

    for page in pages:
        parser = Links()
        parser.feed(page.read_text())
        for url in parser.urls:
            parts = urlsplit(url)
            if parts.scheme or parts.netloc or not parts.path:
                continue
            target = (page.parent / unquote(parts.path).lstrip("/")).resolve()
            if not target.is_relative_to(ROOT) or not target.exists():
                raise ValueError(f"Broken local reference in {page.name}: {url}")

    output.mkdir(parents=True)
    def apply_site_url(text):
        target = site_url.rstrip("/")
        for old in OLD_URLS:
            text = text.replace(old, target)
        if target != CANONICAL_URL:
            text = text.replace(CANONICAL_URL, target)
        return to_extensionless_urls(text, target, stems)

    for page in pages:
        (output / page.name).write_text(with_analytics(apply_site_url(page.read_text())))
    shutil.copytree(ROOT / "assets", output / "assets")
    (output / "announcements").mkdir()
    shutil.copy2(ROOT / "announcements/manifest.json", output / "announcements/manifest.json")
    for filename in seen:
        content = apply_site_url((ROOT / "announcements" / filename).read_text())
        (output / "announcements" / filename).write_text(content)
    shutil.copy2(ROOT / "favicon.ico", output / "favicon.ico")
    if (ROOT / "_redirects").is_file():
        shutil.copy2(ROOT / "_redirects", output / "_redirects")
    for filename in ["robots.txt", "sitemap.xml"]:
        (output / filename).write_text(apply_site_url((ROOT / filename).read_text()))
    # A top-level 404 prevents Pages from treating missing files as SPA routes.
    (output / "404.html").write_text(with_analytics(
        '<!doctype html><html lang="en"><head><meta charset="utf-8">'
        '<meta name="viewport" content="width=device-width, initial-scale=1">'
        '<title>Page Not Found | Belcarra</title></head><body><h1>Page not found</h1>'
        '<p><a href="/">Return to Belcarra</a></p></body></html>\n'
    ))
    generate()
    print(f"Validated and staged {len(pages)} pages and {len(manifest)} announcements in {output}; rebuilt assistant references")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=ROOT / "dist")
    parser.add_argument("--site-url", default="https://www.belcarra.com")
    args = parser.parse_args()
    build(args.output.resolve(), args.site_url)
