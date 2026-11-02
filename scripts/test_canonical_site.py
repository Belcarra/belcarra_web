"""Validate the actual deployment artifact, including its configured site URL."""
import sys
import xml.etree.ElementTree as ET
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit

from build_site import CANONICAL_URL


class Metadata(HTMLParser):
    def __init__(self):
        super().__init__()
        self.canonicals = []
        self.social_urls = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "link" and attrs.get("rel") == "canonical":
            self.canonicals.append(attrs.get("href", ""))
        if tag == "meta" and attrs.get("property") == "og:url":
            self.social_urls.append(attrs.get("content", ""))


def verify(output):
    pages = sorted(path for path in output.glob("*.html") if path.name != "404.html")
    assert pages, "No deployed HTML pages found"
    for page in pages:
        parser = Metadata()
        parser.feed(page.read_text())
        expected = CANONICAL_URL + ("/" if page.name == "index.html" else "/" + page.name)
        assert parser.canonicals == [expected], (page.name, parser.canonicals)
        assert all(url == expected for url in parser.social_urls), (page.name, parser.social_urls)
    root = ET.parse(output / "sitemap.xml").getroot()
    assert root.tag == "{http://www.sitemaps.org/schemas/sitemap/0.9}urlset"
    urls = [item.text for item in root.findall("{*}url/{*}loc")]
    assert urls and len(urls) == len(set(urls)), "Empty sitemap or duplicate URLs"
    for url in urls:
        parsed = urlsplit(url)
        assert parsed.scheme + "://" + parsed.netloc == CANONICAL_URL, url
        assert not parsed.query and not parsed.fragment, url
        filename = parsed.path.lstrip("/") or "index.html"
        assert (output / filename).is_file(), f"Sitemap target missing: {url}"
    expected_urls = {CANONICAL_URL + ("/" if page.name == "index.html" else "/" + page.name) for page in pages}
    assert set(urls) == expected_urls, "Sitemap does not match deployed public pages"
    robots = (output / "robots.txt").read_text().splitlines()
    assert [line for line in robots if line.startswith("Sitemap:")] == ["Sitemap: " + CANONICAL_URL + "/sitemap.xml"]
    print(f"Canonical tags, social URLs, {len(urls)} XML sitemap URLs and robots.txt use {CANONICAL_URL}.")


if __name__ == "__main__":
    verify(Path(sys.argv[1] if len(sys.argv) > 1 else "dist"))
