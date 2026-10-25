"""Regression checks for the public-only assistant corpus."""
import json
import tempfile
from pathlib import Path
from site_knowledge import ROOT, PageText, documents

docs = documents()
manifest = json.loads((ROOT / "announcements/manifest.json").read_text())
assert len(docs) == len(list(ROOT.glob("*.html"))) + len(manifest)
assert len({doc["url"] for doc in docs}) == len(docs)
assert all(doc["text"].strip() and doc["title"].strip() for doc in docs)
assert not any("GEMINI_API_KEY" in doc["text"] or "<script" in doc["text"] for doc in docs)
assert any(doc["date"] == "2023-03-01" or "ARM64" in doc["title"] for doc in docs)
parser = PageText()
parser.feed('<title>Title</title><nav>navigation</nav><main><h1>Heading</h1>'
            '<p>Public &amp; current</p><script>private script</script>'
            '<form>form contents</form><p>After form</p></main><footer>footer</footer>')
assert parser.text() == "Heading\nPublic & current\nAfter form"
with tempfile.TemporaryDirectory() as directory:
    root = Path(directory)
    (root / "announcements").mkdir()
    (root / "announcements/manifest.json").write_text("[]")
    (root / "new.html").write_text('<title>New page</title><main><p>New public material</p></main>')
    (root / "README.md").write_text('private setup instructions')
    (root / "secrets.env").write_text('not public')
    assert documents(root) == [dict(title="New page", url="/new.html", date=None, text="New public material")]
print(f"Public-only extraction, all {len(docs)} documents, and automatic new-page discovery passed.")
