"""Check that every deployed HTML page receives exactly one Google tag."""
import tempfile
from pathlib import Path
from build_site import ROOT, build, with_analytics

snippet = (ROOT / "ganalytics.js").read_text().strip()
with tempfile.TemporaryDirectory() as directory:
    output = Path(directory) / "site"
    build(output, "https://belcarra-web.pages.dev")
    pages = list(output.glob("*.html"))
    assert len(pages) == len(list(ROOT.glob("*.html"))) + 1
    for page in pages:
        html = page.read_text()
        assert html.count(snippet) == 1, page.name
        assert html.count("googletagmanager.com/gtag/js") == 1, page.name
        assert html.index(snippet) < html.index("</head>"), page.name
    assert not (output / "ganalytics.js").exists()
try:
    with_analytics("<head>" + snippet + "</head>")
except ValueError:
    pass
else:
    raise AssertionError("Duplicate Google tags were not rejected")
print(f"Analytics tag included once in all {len(pages)} deployed pages; duplicate prevention passed.")
