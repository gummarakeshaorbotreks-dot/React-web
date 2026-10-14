"""Rebuild the site when the content behind it changed (new / removed / edited treks or blogs).

Every page's title, price, schema and the sitemap are generated at build time from the
API, so a new trek gets no SEO page until the next build. This compares a fingerprint
of the API data with the one from the last successful deploy and deploys on a change.
"""
import hashlib
import json
import sys
import urllib.request

from common import SITE, state_get, state_set
from sitedeploy import deploy


def all_pages(path):
    def get(page):
        req = urllib.request.Request(f"{SITE}{path}?page={page}", headers={"User-Agent": "AorboSeoBot/1.0"})
        return json.load(urllib.request.urlopen(req, timeout=60))
    first = get(1)
    items = list(first.get("results", []))
    for page in range(2, (first.get("total_pages") or 1) + 1):
        items += get(page).get("results", [])
    return items


def fingerprint():
    treks = sorted((t.get("id") or t.get("slug"), t.get("name"), t.get("state"), t.get("price_start"),
                    t.get("duration_days"), len(t.get("images") or [])) for t in all_pages("/api/treks/"))
    blogs = sorted((b.get("slug"), b.get("title"), b.get("updated_at") or b.get("created_at")) for b in all_pages("/api/blogs/"))
    raw = json.dumps({"treks": treks, "blogs": blogs}, sort_keys=True, default=str)
    return hashlib.sha256(raw.encode()).hexdigest(), len(treks), len(blogs)


def main():
    digest, n_treks, n_blogs = fingerprint()
    last = state_get("content_fingerprint")
    if digest == last:
        print(f"content unchanged ({n_treks} treks, {n_blogs} blogs)")
        return 0
    if last is None:
        state_set("content_fingerprint", digest)  # first run: the site was just built from this data
        print(f"fingerprint recorded ({n_treks} treks, {n_blogs} blogs)")
        return 0
    code, out = deploy(f"trek/blog content changed ({n_treks} treks, {n_blogs} blogs)")
    print(out)
    if code == 0:
        state_set("content_fingerprint", digest)
    return 0 if code in (0, 3, 11) else code  # gate refusals are reported, not crashes


if __name__ == "__main__":
    sys.exit(main())
