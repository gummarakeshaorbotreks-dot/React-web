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


PLACEHOLDER = re.compile(r"update soon|aorbo certified|to be (added|updated)", re.I)
FAR_KM = 300


def confirm_far(content, item):
    """Second look at one suspect: the distance to the NEAREST stop of the trip, stops listed
    explicitly (the first pass measured Taj Mahal from Ayodhya, not from Mathura 55 km away,
    and missed that 'Mathura-Agra-Ayodhya-Nepal' includes Pokhara)."""
    # Asking "is X near this trip?" leads Gemini to say yes (it called Dolphin's Nose "near"
    # Sandakphu). So it only says WHERE things are; the distance is computed here.
    from ai import generate_json
    from trek_geo import km
    stops = [s.strip() for s in re.split(r"[-–,&/]", content["name"]) if s.strip()]
    stops += [p for p in content["places"] if p != item][:12]
    point = {"type": "object", "properties": {"name": {"type": "string"}, "lat": {"type": "number"}, "lon": {"type": "number"}},
             "required": ["name", "lat", "lon"]}
    out = generate_json(
        "Give the approximate map position of each of these, as typed on an Indian travel site. For an "
        "activity, give the position of the place it is famous for (e.g. 'Houseboat Stay' -> Alappuzha).\n"
        f"Item: {json.dumps(item, ensure_ascii=False)}\nPlaces: {json.dumps(stops, ensure_ascii=False)}",
        {"type": "object", "properties": {"item": point, "places": {"type": "array", "items": point}},
         "required": ["item", "places"]}, temperature=0.0)
    it = out.get("item") or {}
    places = [p for p in out.get("places", []) if p.get("lat") and p.get("lon")]
    if not (it.get("lat") and it.get("lon") and places):
        return False  # can't tell: don't accuse
    return min(km(it["lat"], it["lon"], p["lat"], p["lon"]) for p in places) >= FAR_KM


def content_audit(contents):
    """{trek id: [problem, ...]} for places, activities or descriptions that belong to another trip
    (found on the live site: Ooty's Dolphin's Nose on Sandakphu, Kerala houseboats on Rajmachi,
    the Kerala description on a Mathura trip). Only treks changed since their last check are
    sent to Gemini (state "content_audit")."""
    import hashlib
    from ai import generate_json
    cache = state_get("content_audit", {})
    digest = lambda c: hashlib.sha256(json.dumps(c, sort_keys=True, ensure_ascii=False).encode()).hexdigest()  # noqa: E731
    todo = [c for c in contents if cache.get(c["id"], {}).get("hash") != digest(c)]
    schema = {"type": "object", "properties": {"treks": {"type": "array", "items": {"type": "object", "properties": {
        "id": {"type": "string"}, "suspects": {"type": "array", "items": {"type": "object", "properties": {
            "item": {"type": "string"}, "belongs_to": {"type": "string"}, "km_from_route": {"type": "number"}},
            "required": ["item", "belongs_to", "km_from_route"]}}},
        "required": ["id", "suspects"]}}}, "required": ["treks"]}
    for i in range(0, len(todo), 20):
        batch = todo[i:i + 20]
        prompt = ("Trip packages on an Indian travel site, typed by a team that sometimes copy-pastes from another "
                  "package. For each package, list famous places, activities or description sentences that may "
                  "belong to a different destination, with where they really are and your estimate of their "
                  "distance in km from the nearest place this trip visits (its name and other places). Empty list "
                  "if nothing is suspicious.\n\n" + json.dumps(batch, ensure_ascii=False))
        answer = {x["id"]: x["suspects"] for x in generate_json(prompt, schema, temperature=0.1).get("treks", [])}
        for c in batch:
            # Only far-away items are mistakes: stops on the way (Mysore on a Wayanad trip, Kasol on a
            # Manali trip) are 50-250 km; the copy-paste errors found were 1,000-2,500 km off.
            far = [x for x in answer.get(c["id"], []) if (x.get("km_from_route") or 0) >= FAR_KM]
            far = [x for x in far if confirm_far(c, x["item"])]
            cache[c["id"]] = {"hash": digest(c), "problems": [
                f"content: '{x['item']}' is in {x['belongs_to']}, about {round(x['km_from_route'], -1):.0f} km from this trip" for x in far][:3]}
        state_set("content_audit", cache)
    live = {c["id"] for c in contents}
    return {tid: v["problems"] for tid, v in cache.items() if tid in live and v["problems"]}


def main():
    con = db()
    treks = all_pages("/api/treks/")
    issues = {}
    contents, no_organiser = [], []

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
    # Addresses that differ only in capitals (/treks/Coorg, /treks/coorg) both work on the
    # server; they only confuse people when the two packages also share a name.
    by_lower = {}
    for t in treks:
        by_lower.setdefault(((t.get("id") or "").lower(), (t.get("name") or "").strip().lower()), []).append(t.get("id"))
    for ids in by_lower.values():
        if len(ids) > 1:
            for t in treks:
                if t.get("id") in ids:
                    add(t, f"same name and address as {', '.join(i for i in ids if i != t.get('id'))} (differs only in capitals): rename one")

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
        contents.append({"id": t.get("id"), "name": name, "state": state, "description": (d.get("description") or "")[:700],
                         "places": d.get("famous_places") or [], "activities": d.get("activities") or []})
        if all(PLACEHOLDER.search(o) for o in (d.get("operators") or ["x"])) or not d.get("operators"):
            no_organiser.append(name)
        lat, lon = d.get("latitude"), d.get("longitude")
        if lat and lon and state:
            real = osm_state(con, float(lat), float(lon))
            if real and norm(real) != norm(state) and norm(state) not in norm(real):
                add(t, f"state '{state}' but its map position is in {real}: fix whichever is wrong")

    try:  # copy-pasted places / activities / descriptions (a rule can't see those; Gemini can)
        for tid, problems in content_audit(contents).items():
            for p in problems:
                add(next(t for t in treks if t.get("id") == tid), p)
    except Exception as e:  # noqa: BLE001 - Gemini busy: checked next week
        print("content check failed:", e)

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
    if no_organiser:
        msg += (f"\n\n👤 <b>{len(no_organiser)} treks have no real organiser name</b> (\"we will update soon\"); the "
                f"pages say \"Coming soon\". Add the organisers in the admin.")
    telegram(msg, silent=not issues and not geo_problems)
    print(msg)
    return 0


if __name__ == "__main__":
    sys.exit(main())
