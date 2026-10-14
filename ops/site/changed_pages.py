"""List the pages whose search-facing content changed between two builds, one path per line.

    python3 changed_pages.py <live dir> <new dist>

Compares title, description, canonical and JSON-LD (not asset hashes, which change
on every code build), and includes new pages. deploy.sh sends these to IndexNow.
"""
import re
import sys
from pathlib import Path

SITE = "https://aorbotreks.com"


def seo_fingerprint(html):
    parts = re.findall(r"<title>[^<]*</title>|<meta name=\"description\"[^>]*>|<link rel=\"canonical\"[^>]*>"
                       r"|<script type=\"application/ld\+json\">[\s\S]*?</script>", html)
    return "\n".join(parts)


def pages(root):
    xml = (root / "sitemap.xml").read_text() if (root / "sitemap.xml").exists() else ""
    return [u[len(SITE):] or "/" for u in re.findall(r"<loc>([^<]+)</loc>", xml)]


def read(root, path):
    f = root / "index.html" if path == "/" else root / path.strip("/") / "index.html"
    return f.read_text(encoding="utf-8", errors="replace") if f.exists() else None


def main():
    live, new = Path(sys.argv[1]), Path(sys.argv[2])
    for path in pages(new):
        before, after = read(live, path), read(new, path)
        if after is not None and (before is None or seo_fingerprint(before) != seo_fingerprint(after)):
            print(path)


if __name__ == "__main__":
    main()
