#!/usr/bin/env python3
"""Accurate <lastmod> dates in the new build's sitemap (20 Nov 2026).

    python3 lastmod.py <new dist> <changed pages file> <dates file>

Google uses a sitemap's lastmod only when it is consistently accurate, so a page gets a date only when its
search-facing content really changed (changed_pages.py: title, description, canonical, JSON-LD, page
content - not code-build asset hashes). The dates are kept in data/page-dates.json across deploys; a page
that has not changed since this started has no date (better than a made-up one). A lastmod the build
already wrote (blog posts: their own updated date) is kept.
"""
import json
import re
import sys
from datetime import date
from pathlib import Path

SITE = "https://aorbotreks.com"


def apply(xml, dates):
    """Adds <lastmod> to each <url> that has none and has a known date (pure; tested)."""
    def one(m):
        block = m.group(0)
        if "<lastmod>" in block:
            return block
        loc = re.search(r"<loc>([^<]+)</loc>", block)
        path = (loc.group(1)[len(SITE):] or "/") if loc else None
        d = dates.get(path)
        return block.replace("</loc>", f"</loc><lastmod>{d}</lastmod>", 1) if d else block
    return re.sub(r"<url>[\s\S]*?</url>", one, xml)


def main():
    dist, changed_file, dates_file = Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3])
    try:
        dates = json.loads(dates_file.read_text())
    except (OSError, ValueError):
        dates = {}
    today = date.today().isoformat()
    for line in changed_file.read_text().splitlines():
        if line.strip():
            dates[line.strip()] = today
    sitemap = dist / "sitemap.xml"
    sitemap.write_text(apply(sitemap.read_text(), dates))
    tmp = dates_file.with_suffix(".tmp")
    tmp.write_text(json.dumps(dates, sort_keys=True))
    tmp.replace(dates_file)
    print(f"lastmod: {sum(1 for _ in dates)} pages dated ({len([l for l in changed_file.read_text().splitlines() if l.strip()])} changed now)")


if __name__ == "__main__":
    main()
