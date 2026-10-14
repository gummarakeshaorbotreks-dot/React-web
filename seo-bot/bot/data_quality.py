"""Weekly trek data check: the bot only writes from our data, so wrong data must be caught first.

- State vs map position: each trek's coordinates are looked up on OpenStreetMap (Nominatim,
  1 request per second, results cached) and compared with the state in our data.
- Hygiene: names or states in lowercase, names that differ only in capitals (they collide
  as page addresses), missing description / price / durations.

Problems go to Telegram for the team to fix in the admin; optimizer.py skips those treks
until they are fixed (state key "data_issues").
"""
import json
import re
import sys
import time
import urllib.parse
import urllib.request

from common import SITE, db, esc, state_get, state_set, telegram
from content_sync import all_pages
from trek_geo import push as push_geo
from trek_geo import update as locate_treks

NOMINATIM = "https://nominatim.openstreetmap.org/reverse"


def norm(s):
    return re.sub(r"[^a-z]", "", (s or "").lower().replace("&", "and"))


def osm_state(con, lat, lon):
    key = f"{lat:.4f},{lon:.4f}"
    con.execute("CREATE TABLE IF NOT EXISTS geo_cache (key TEXT PRIMARY KEY, state TEXT)")
    row = con.execute("SELECT state FROM geo_cache WHERE key=?", (key,)).fetchone()
    if row:
        return row[0]
    q = urllib.parse.urlencode({"lat": lat, "lon": lon, "format": "jsonv2", "zoom": 5, "accept-language": "en"})
    req = urllib.request.Request(f"{NOMINATIM}?{q}", headers={"User-Agent": "AorboSeoBot/1.0 (care@aorbotreks.com)"})
    time.sleep(1.1)  # Nominatim usage policy: max 1 request per second
    try:
        state = json.load(urllib.request.urlopen(req, timeout=30)).get("address", {}).get("state", "")
    except Exception:  # noqa: BLE001 - lookup failures are skipped, not reported as data errors
        return None
    con.execute("INSERT OR REPLACE INTO geo_cache VALUES (?,?)", (key, state))
    con.commit()
    return state


def detail(trek_id):
    req = urllib.request.Request(f"{SITE}/api/treks/{urllib.parse.quote(trek_id)}/", headers={"User-Agent": "AorboSeoBot/1.0"})
    return json.load(urllib.request.urlopen(req, timeout=60))


def main():
    con = db()
    treks = all_pages("/api/treks/")
    issues = {}

    def add(t, problem):
        issues.setdefault(t.get("id") or t.get("slug"), {"name": t.get("name"), "problems": []})["problems"].append(problem)

    seen, unique = set(), []
    for t in treks:
        if t.get("id") in seen:
            add(t, "listed twice by the trek list API (another trek may be missing from the site)")
            continue
        seen.add(t.get("id"))
        unique.append(t)
    treks = unique
    by_lower = {}
    for t in treks:
        by_lower.setdefault((t.get("id") or "").lower(), []).append(t.get("id"))
    for ids in by_lower.values():
        if len(ids) > 1:
            for t in treks:
                if t.get("id") in ids:
                    add(t, f"page address collides with {', '.join(i for i in ids if i != t.get('id'))} (differs only in capitals)")

    for t in treks:
        name, state = t.get("name") or "", t.get("state") or ""
        if name and name == name.lower():
            add(t, f"name in lowercase: '{name}'")
        if state and state == state.lower():
            add(t, f"state in lowercase: '{state}'")
        if not t.get("price_start"):
            add(t, "no price")
        if not t.get("duration_days"):
            add(t, "no duration")
        try:
            d = detail(t.get("id") or t.get("slug"))
        except Exception:  # noqa: BLE001
            continue
        if not (d.get("description") or "").strip():
            add(t, "no description")
        lat, lon = d.get("latitude"), d.get("longitude")
        if lat and lon and state:
            real = osm_state(con, float(lat), float(lon))
            if real and norm(real) != norm(state) and norm(state) not in norm(real):
                add(t, f"state '{state}' but its map position is in {real}: fix whichever is wrong")

    state_set("data_issues", sorted(issues))
    # Trek positions for the city pages (also re-tries treks it couldn't place before).
    # Wrong admin coordinates are reported but don't block page edits: the text never uses them.
    try:
        geo, geo_problems = locate_treks()
        push_geo(geo)
    except Exception as e:  # noqa: BLE001 - reported below with the last known problems
        print("trek positions failed:", e)
        geo_problems = state_get("geo_problems", {})
    names = {t.get("id"): t.get("name") for t in treks}
    if not issues and not geo_problems:
        msg = f"✅ Trek data check: {len(treks)} treks, no problems found."
    elif not issues:
        msg = f"✅ Trek data check: {len(treks)} treks, no blocking problems."
    else:
        lines = [f"🧹 <b>Trek data check</b>: {len(issues)} of {len(treks)} treks need fixing in the admin.",
                 "The bot won't rewrite these pages until they're fixed.", ""]
        for tid, v in sorted(issues.items(), key=lambda kv: kv[1]["name"] or "")[:25]:
            lines.append(f"• <b>{esc(v['name'])}</b> ({esc(tid)}): {esc('; '.join(v['problems']))}")
        if len(issues) > 25:
            lines.append(f"…and {len(issues) - 25} more")
        msg = "\n".join(lines)
    if geo_problems:
        msg += ("\n\n📍 <b>Map positions in the admin to fix</b> (the city pages use the verified position meanwhile):\n"
                + "\n".join(f"• {esc(names.get(tid) or tid)}: {esc(p)}" for tid, p in sorted(geo_problems.items())[:15]))
    telegram(msg, silent=not issues and not geo_problems)
    print(msg)
    return 0


if __name__ == "__main__":
    sys.exit(main())
