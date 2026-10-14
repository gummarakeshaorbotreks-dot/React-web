"""Map positions for treks, used by the "Treks near <city>" pages (distances).

For every trek:
  1. Gemini reads the trek names (in batches) and says what to put on the map: the
     trailhead / peak for a trek, the first stop for a multi-stop trip, nothing for a
     whole region ("Himalayas", "Rajasthan") - regions stay off the city pages. It also
     gives the district, other spellings and its own rough position.
  2. OpenStreetMap (Nominatim, max 1 request per second) looks that place up. A result
     is accepted only if it lies in the trek's state, is a real place (town, village,
     peak, waterfall, fort, temple, park...; never a road, shop or college) and is
     within AGREE_KM of Gemini's estimate - two sources must agree.
  3. Results are cached in seo.db (table trek_geo_v2) and redone when a trek's name or
     state changes; misses are retried after 30 days.
Coordinates typed in the admin are used only when nothing verified exists and they
agree with Gemini's estimate; wrong ones are reported (state "geo_problems", sent by
data_quality.py). The trek data itself is never changed: the positions go to the web
server as a file (SSH command "geo"), read by the build.

    python trek_geo.py            update + send to the web server if anything changed
    python trek_geo.py --show     list every trek's position and where it came from
"""
import argparse
import json
import math
import re
import subprocess
import sys
import time
import urllib.parse
import urllib.request
from datetime import datetime, timedelta

from ai import generate_json
from common import db, state_get, state_set
from content_sync import all_pages
from sitedeploy import SSH

NOMINATIM = "https://nominatim.openstreetmap.org/search"
RETRY_MISSES_DAYS = 30
BATCH = 25
AGREE_KM = 80           # OpenStreetMap's match must be this close to Gemini's own estimate
ADMIN_OFF_KM = 50       # admin coordinates further than this from the verified place are reported
# What may count as "where the trek is". Anything else (roads, shops, offices,
# colleges, hotels, bus stops) is a false match on the name.
OK_TYPES = {
    "place": {"city", "town", "village", "hamlet", "locality", "suburb", "island", "isolated_dwelling", "neighbourhood",
              "county", "region"},
    "water": {"lake", "reservoir", "river", "pond"},
    "landuse": {"forest"},
    "natural": {"peak", "hill", "ridge", "valley", "cave_entrance", "water", "beach", "cliff", "volcano", "wood",
                "saddle", "glacier", "spring", "bay", "cape", "rock"},
    "waterway": {"waterfall", "river", "dam"},
    "tourism": {"attraction", "viewpoint", "camp_site", "picnic_site"},
    "historic": {"fort", "castle", "ruins", "archaeological_site", "monument", "memorial", "temple"},
    "leisure": {"nature_reserve", "park"},
    "boundary": {"national_park", "protected_area", "administrative"},
    "amenity": {"place_of_worship"},
    "mountain_pass": {"yes"},
}
ALIASES = {"pondicherry": "puducherry", "jammukashmir": "jammuandkashmir", "orissa": "odisha",
           "uttaranchal": "uttarakhand", "tamilnadu": "tamilnadu"}


def norm(s):
    s = re.sub(r"[^a-z]", "", (s or "").lower())
    for a, b in ALIASES.items():
        s = s.replace(a, b)
    return s


def same_state(osm_state, trek_state):
    """Trek states are free text ("Kerala,Tamilnadu", "Karnataka–Kerala", "Kashmir", "Multiple States")."""
    o, t = norm(osm_state), norm(trek_state)
    if not o:
        return False
    if not t or "multiple" in t:
        return True
    if o == "ladakh" and "kashmir" in t:  # Ladakh was part of J&K until 2019; old data says J&K
        return True
    if o == "jammuandkashmir" and "kashmir" in t:
        return True
    return o in t or t in o


def nominatim(q):
    url = f"{NOMINATIM}?" + urllib.parse.urlencode({"q": q, "format": "jsonv2", "countrycodes": "in",
                                                    "addressdetails": 1, "limit": 8, "accept-language": "en"})
    time.sleep(1.1)  # Nominatim usage policy
    req = urllib.request.Request(url, headers={"User-Agent": "AorboSeoBot/1.0 (care@aorbotreks.com)"})
    return json.load(urllib.request.urlopen(req, timeout=40))


def acceptable(r, trek_state):
    if r.get("type") not in OK_TYPES.get(r.get("category"), ()):
        return False
    if r.get("category") == "boundary" and r.get("type") == "administrative" and int(r.get("place_rank", 0)) < 10:
        return False  # a state (rank 8) or bigger; districts (10) are fine
    return same_state(r.get("address", {}).get("state"), trek_state)


def plan_lookups(treks):
    """Gemini: what to put on the map for each trek name."""
    schema = {"type": "object", "properties": {"treks": {"type": "array", "items": {"type": "object", "properties": {
        "id": {"type": "string"},
        "kind": {"type": "string", "enum": ["place", "multi_stop", "region"]},
        "lookup": {"type": "string"}, "other_names": {"type": "array", "items": {"type": "string"}},
        "district": {"type": "string"}, "state": {"type": "string"},
        "approx_lat": {"type": "number"}, "approx_lon": {"type": "number"}},
        "required": ["id", "kind", "lookup", "other_names", "district", "state", "approx_lat", "approx_lon"]}}},
        "required": ["treks"]}
    prompt = ("These are trek / trip listings on an Indian trekking site (id, name, state as typed by the team; "
              "names may have typos). For each, say what single place should go on a map:\n"
              "- kind 'place': one trek, peak, falls, fort, hill station or town. lookup = that place's correct "
              "name as on maps (trailhead or peak for a trek, e.g. 'Triund Mcleodganj' -> 'Triund', "
              "'Darjelling' -> 'Darjeeling', 'Nandhi Hills' -> 'Nandi Hills').\n"
              "- kind 'multi_stop': a trip through several places ('Gokarna-Dandeli', 'Shimla-Manali'). "
              "lookup = the FIRST real place; skip state or region names ('Sikkim-Gangtok' -> 'Gangtok').\n"
              "- kind 'region': a whole state or large region ('Rajasthan', 'Himalayas', 'Meghalaya', "
              "'Rangeelo Rajasthan'). lookup = ''.\n"
              "other_names = up to 3 other spellings / names used on maps ('Coorg' -> ['Kodagu', 'Madikeri']; "
              "'Rajgad Fort' -> ['Rajgad', 'Rajgarh Fort']). district = the district the place is in. "
              "approx_lat / approx_lon = your best estimate of its position (0, 0 for a region). "
              "state = the official Indian state / union territory where the lookup place is (current name, "
              "e.g. Ladakh, Puducherry). Do not guess places you don't know: then use kind 'region'.\n\n"
              + json.dumps([{"id": t["id"], "name": t["name"], "state": t.get("state") or ""} for t in treks],
                           ensure_ascii=False))
    out = generate_json(prompt, schema, temperature=0.1)
    return {x["id"]: x for x in out.get("treks", [])}


def locate(trek, plan):
    """(lat, lon, note) or (None, None, why not)."""
    if not plan:
        return None, None, "no plan from Gemini"
    if plan["kind"] == "region" or not plan["lookup"].strip():
        return None, None, "region (not one place)"
    lookup, district, state = plan["lookup"].strip(), plan.get("district", "").strip(), plan["state"].strip()
    names = [lookup] + [n.strip() for n in plan.get("other_names", []) if n.strip()][:3]
    queries = ([f"{lookup}, {district}, {state}"] if district else []) + [f"{n}, {state}" for n in names] + [lookup]
    guess = (plan.get("approx_lat") or 0, plan.get("approx_lon") or 0)
    if not (6 < guess[0] < 37 and 68 < guess[1] < 98):
        return None, None, f"no position estimate for '{lookup}'"
    far = None
    for q in dict.fromkeys(queries):  # most specific first: "Ramanagara" alone finds one in Belagavi
        for r in nominatim(q):
            if not acceptable(r, trek.get("state") or state):
                continue
            lat, lon = float(r["lat"]), float(r["lon"])
            off = km(lat, lon, *guess)
            if off > AGREE_KM:  # a namesake elsewhere: two sources must agree
                far = far or f"'{lookup}': OpenStreetMap's {r.get('display_name', '')[:50]} is {off:.0f} km from Gemini's estimate"
                continue
            return lat, lon, f"{lookup} -> {r.get('category')}/{r.get('type')}: {r.get('display_name', '')[:80]}"
    return None, None, far or f"'{lookup}' not found as a place in {state}"


def km(lat1, lon1, lat2, lon2):
    p = math.pi / 180
    h = math.sin((lat2 - lat1) * p / 2) ** 2 + math.cos(lat1 * p) * math.cos(lat2 * p) * math.sin((lon2 - lon1) * p / 2) ** 2
    return 12742 * math.asin(math.sqrt(h))


def init(con):
    # Per trek: OpenStreetMap's verified position (lat/lon, NULL if none) and Gemini's own estimate.
    con.execute("""CREATE TABLE IF NOT EXISTS trek_geo_v2 (
        id TEXT PRIMARY KEY, name TEXT, state TEXT, lat REAL, lon REAL, est_lat REAL, est_lon REAL,
        note TEXT, checked TEXT)""")
    con.execute("DROP TABLE IF EXISTS trek_geo")  # v1 trusted admin coordinates blindly


def choose(t, row, shared):
    """Final position for one trek: (lat, lon, source) or None, plus an admin-data problem (or None).

    The admin's coordinates were often wrong (three Andhra treks shared one default
    point; Himalayan ones 50-100 km off), so they are only used when nothing better
    exists and they agree with Gemini's estimate.
    """
    admin = (float(t["latitude"]), float(t["longitude"])) if t.get("latitude") and t.get("longitude") else None
    osm = (row[3], row[4]) if row and row[3] is not None else None
    est = (row[5], row[6]) if row and row[5] else None
    problem = None
    if admin and admin in shared:
        problem = "map position in the admin is shared with other treks (a default value?)"
    if osm:
        if admin and not problem and km(*admin, *osm) > ADMIN_OFF_KM:
            problem = f"map position in the admin is {km(*admin, *osm):.0f} km from where it really is"
        return (*osm, "osm"), problem
    if admin and not problem and est and km(*admin, *est) <= AGREE_KM:
        return (*admin, "admin"), None
    if admin and not problem and est:
        problem = f"map position in the admin is {km(*admin, *est):.0f} km from the expected place"
    return None, problem


def update():
    """Refresh positions; returns ({id: {lat, lon, source}}, {id: admin-data problem})."""
    con = db()
    init(con)
    treks = list({t["id"]: t for t in all_pages("/api/treks/") if t.get("id")}.values())
    cached = {r[0]: r for r in con.execute("SELECT * FROM trek_geo_v2")}
    retry_before = (datetime.now() - timedelta(days=RETRY_MISSES_DAYS)).isoformat()
    todo = [t for t in treks if not ((c := cached.get(t["id"])) and c[1] == t["name"] and c[2] == t.get("state")
                                     and (c[3] is not None or c[8] > retry_before))]
    for i in range(0, len(todo), BATCH):
        batch = todo[i:i + BATCH]
        try:
            plans = plan_lookups(batch)
        except Exception as e:  # noqa: BLE001 - Gemini busy: the next run tries again
            print("gemini failed:", e)
            break
        for t in batch:
            plan = plans.get(t["id"]) or {}
            try:
                lat, lon, note = locate(t, plan)
            except Exception as e:  # noqa: BLE001 - lookup failure: retried next run
                print("lookup failed:", t["id"], e)
                continue
            est = (plan.get("approx_lat"), plan.get("approx_lon")) if plan.get("kind") != "region" else (None, None)
            con.execute("INSERT OR REPLACE INTO trek_geo_v2 VALUES (?,?,?,?,?,?,?,?,?)",
                        (t["id"], t["name"], t.get("state"), lat, lon, est[0] or None, est[1] or None, note,
                         datetime.now().isoformat(timespec="seconds")))
            con.commit()
            print("OK  " if lat is not None else "MISS", t["name"], "|", note)

    rows = {r[0]: r for r in con.execute("SELECT * FROM trek_geo_v2")}
    admin_points = [(float(t["latitude"]), float(t["longitude"])) for t in treks if t.get("latitude") and t.get("longitude")]
    shared = {p for p in admin_points if admin_points.count(p) > 1}
    geo, problems = {}, {}
    for t in treks:
        pos, problem = choose(t, rows.get(t["id"]), shared)
        if pos:
            geo[t["id"]] = {"lat": round(pos[0], 5), "lon": round(pos[1], 5), "source": pos[2]}
        if problem:
            problems[t["id"]] = problem
    state_set("geo_problems", problems)  # data_quality.py reports these to the team
    return geo, problems


def push(geo):
    """Send positions to the web server (bot-entry.sh 'geo'); True when the file there changed."""
    digest = json.dumps(geo, sort_keys=True)
    if digest == state_get("trek_geo_pushed"):
        return False
    p = subprocess.run(SSH + ["geo"], input=digest, capture_output=True, text=True, timeout=120)
    if p.returncode != 0:
        raise RuntimeError(f"geo upload failed: {(p.stdout + p.stderr).strip()[:300]}")
    state_set("trek_geo_pushed", digest)
    return True


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--show", action="store_true")
    ap.add_argument("--no-push", action="store_true", help="update the cache only")
    a = ap.parse_args()
    if a.show:
        con = db()
        init(con)
        for row in con.execute("SELECT name, state, lat, lon, est_lat, est_lon, note FROM trek_geo_v2 ORDER BY name"):
            print(" | ".join(str(x) for x in row))
        return 0
    geo, problems = update()
    for tid, problem in sorted(problems.items()):
        print("ADMIN DATA:", tid, "-", problem)
    if a.no_push:
        print(f"{len(geo)} treks have a position (not sent)")
        return 0
    changed = push(geo)
    print(f"{len(geo)} treks have a position; web server {'updated' if changed else 'already up to date'}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
