"""Rebuild the site when the content behind it changed (treks, blogs, or SEO overrides).

Every page's title, price, schema and the sitemap are generated at build time from the
API, so a new trek gets no SEO page until the next build. This compares a fingerprint
of the API data with the one from the last successful deploy and deploys on a change.
"""
import hashlib
import json
import sys
import urllib.request
from datetime import date

from common import SITE, state_get, state_set
from overrides import list_overrides
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


def detail(trek_id):
    import urllib.parse
    req = urllib.request.Request(f"{SITE}/api/treks/{urllib.parse.quote(trek_id)}/", headers={"User-Agent": "AorboSeoBot/1.0"})
    return json.load(urllib.request.urlopen(req, timeout=60))


def fingerprint():
    listed = {t.get("id") or t.get("slug"): t for t in all_pages("/api/treks/")}
    # Trek pages are built with the trek's full details (description, activities, places,
    # organisers, departure days), so an edit to any of them needs a rebuild too.
    treks = []
    for tid, t in sorted(listed.items()):
        try:
            d = detail(tid)
        except Exception:  # noqa: BLE001 - list data still catches most changes
            d = {}
        treks.append((tid, t.get("name"), t.get("state"), t.get("price_start"), t.get("duration_days"),
                      len(t.get("images") or []), d.get("description"), d.get("activities"), d.get("famous_places"),
                      d.get("operators"), d.get("operating_days"), d.get("main_image"), d.get("related_treks"),
                      d.get("latitude"), d.get("longitude")))
    blogs = sorted((b.get("slug"), b.get("title"), b.get("updated_at") or b.get("created_at")) for b in all_pages("/api/blogs/"))
    overrides = sorted((o["path"], o["updated_at"]) for o in list_overrides())
    # The week number: "Treks near <city>" pages are released in weekly waves (scripts/near-pages.mjs).
    week = date.today().isocalendar()[:2]
    raw = json.dumps({"treks": treks, "blogs": blogs, "overrides": overrides, "week": week}, sort_keys=True, default=str)
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
    try:  # new or renamed treks need a map position for the city pages
        from trek_geo import push as push_geo, update as locate_treks
        push_geo(locate_treks()[0])
    except Exception as e:  # noqa: BLE001 - the site still builds with the last positions
        print("trek positions not updated:", e)
    try:  # ...and their destinations for the destination pages
        from destinations import build as build_destinations, push as push_destinations
        dests = build_destinations()
        state_set("destinations", dests)
        push_destinations(dests)
    except Exception as e:  # noqa: BLE001 - the site still builds with the last destinations
        print("destinations not updated:", e)
    code, out = deploy(f"content changed ({n_treks} treks, {n_blogs} blogs, an SEO override, or the weekly city-page wave)")
    print(out)
    if code == 0:
        state_set("content_fingerprint", digest)
    return 0 if code in (0, 3, 11) else code  # gate refusals are reported, not crashes


if __name__ == "__main__":
    sys.exit(main())
