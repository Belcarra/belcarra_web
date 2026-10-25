#!/usr/bin/env python3
"""Validate and stage public files for a static Pages deployment."""

import argparse
import json
import shutil
from datetime import date
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit
from site_knowledge import generate


ROOT = Path(__file__).resolve().parent.parent
OLD_URL = "https://belcarra.github.io/belcarra_web"


class Links(HTMLParser):
    def __init__(self):
        super().__init__()
        self.urls = []

    def handle_starttag(self, tag, attrs):
        for name, value in attrs:
            if name in {"href", "src"} and value:
                self.urls.append(value)


def build(output, site_url):
    parsed = urlsplit(site_url)
    if parsed.scheme != "https" or not parsed.netloc or parsed.query or parsed.fragment:
        raise ValueError("Site URL must be an absolute HTTPS URL without query or fragment")
    if output.exists():
        raise ValueError(f"Output already exists: {output}; choose a new directory")

    pages = sorted(ROOT.glob("*.html"))
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
    for page in pages:
        (output / page.name).write_text(page.read_text().replace(OLD_URL, site_url.rstrip("/")))
    shutil.copytree(ROOT / "assets", output / "assets")
    (output / "announcements").mkdir()
    shutil.copy2(ROOT / "announcements/manifest.json", output / "announcements/manifest.json")
    for filename in seen:
        shutil.copy2(ROOT / "announcements" / filename, output / "announcements" / filename)
    shutil.copy2(ROOT / "favicon.ico", output / "favicon.ico")
    for filename in ["robots.txt", "sitemap.xml"]:
        (output / filename).write_text((ROOT / filename).read_text().replace(OLD_URL, site_url.rstrip("/")))
    # A top-level 404 prevents Pages from treating missing files as SPA routes.
    (output / "404.html").write_text(
        '<!doctype html><html lang="en"><meta charset="utf-8">'
        '<meta name="viewport" content="width=device-width, initial-scale=1">'
        '<title>Page Not Found | Belcarra</title><h1>Page not found</h1>'
        '<p><a href="/">Return to Belcarra</a></p></html>\n'
    )
    generate()
    print(f"Validated and staged {len(pages)} pages and {len(manifest)} announcements in {output}; rebuilt assistant references")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=ROOT / "dist")
    parser.add_argument("--site-url", default="https://belcarra-web.pages.dev")
    args = parser.parse_args()
    build(args.output.resolve(), args.site_url)
