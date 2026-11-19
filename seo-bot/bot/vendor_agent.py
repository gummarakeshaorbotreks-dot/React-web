"""Vendor agent: when organisers list treks and dates in the app, put them on aorbotreks.com within minutes.

Owner, 19 Nov 2026: "we started onboarding vendors; as soon as their data comes, an agent should work,
connected through an n8n chain". n8n (workflow "SEO bot: vendor agent") runs the steps in order every
2 minutes; nothing happens unless the organisers' feed changed or the owner sent a correction:

    vendor_agent.py check    feed changed / owner's /wrong in Telegram / a fact due for a re-check?
                             prints CHANGED / UNCHANGED (and records proof of life for watchdog.py)
    vendor_agent.py sync     website copies the departures now (web server: manage.py sync_app_departures;
                             new places get their own page) instead of at the next hourly run
    vendor_agent.py geo      map positions + destinations for new pages (trek_geo.py, destinations.py)
    vendor_agent.py facts    trek or tour, and trek facts for trek pages (below)
    vendor_agent.py deploy   rebuild the site once (sitedeploy.py; IndexNow is pinged by deploy.sh)
    vendor_agent.py report   Telegram: what organisers added or removed, pages made, facts found or missing
    vendor_agent.py all      every step (manual run); --force runs even with an unchanged feed

Facts, never invented:
  - the organiser's own (Create Trek / Edit trip in the partner portal, checked by our team before they go
    live; feed trip.difficulty / best_months / trail_km / altitude_m). Several organisers on one trek:
    used only when they agree;
  - height from open data: a named OpenStreetMap peak near the trek AND its Wikidata entry, kept only when
    the two agree (within 3 % or 30 m). An organiser's height that open data contradicts is left out;
  - nearest main railway station and airport (scheduled flights, IATA code) from our own copies of
    OpenStreetMap's stations and OurAirports' airports (refreshed monthly, so a busy map server
    doesn't hold facts up), district from OpenStreetMap's address of the position.
A fact that cannot be confirmed is left out and listed in the report; a height not checked because the
map server was busy is re-checked later. The owner can take any agent fact off a page by replying in
Telegram:  /wrong <page>   or   /wrong <page> height|months|trail|difficulty|station|airport|district
The team's own files (aorbo-frontend/scripts/data/trek-facts.json, listing-kind.json) always win.
"""
import csv
import hashlib
import io
import json
import math
import re
import subprocess
import sys
import time
import urllib.parse
import urllib.request
from datetime import datetime, timedelta

from common import DATA, USER_AGENT, esc, secret, state_get, state_set, telegram
from sitedeploy import SSH, deploy, run

FEED = "https://api.aorbotreks.co.in/api/v1/website/departures"
SITE_API = "https://aorbotreks.com"
OVERPASS = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter",
            "https://overpass.private.coffee/api/interpreter"]
OURAIRPORTS = "https://davidmegginson.github.io/ourairports-data/airports.csv"
REF = DATA / "ref"          # our copies of India's stations and airports
REF_DAYS = 30
MAX_RESEARCH = 6            # new treks researched per run (open-data APIs: be gentle)
RETRY_DAYS = 3              # a trek with nothing confirmed is tried again after this
BUSY_HOURS = 6              # map server busy: height re-checked after this
PEAK_KM, STATION_KM, AIRPORT_KM = 20, 120, 250
# A trekker travels to a junction or main station, not the nearest wayside halt.
MAIN_STATION = re.compile(r"\b(junction|jn|central|terminus|terminal|cantonment|cantt|city)\b", re.I)
DIFFICULTY = {"easy": "easy", "moderate": "moderate", "difficult": "difficult", "extreme": "difficult"}
GENERIC = {"trek", "treks", "trip", "trips", "tour", "tours", "hike", "hiking", "package", "day", "days",
           "night", "nights", "the", "and", "to", "from", "camping", "sunrise", "weekend", "winter", "snow"}
TREK_WORDS = re.compile(r"\b(trek|treks|trekking|hike|hiking|summit|peak|betta|durga|trail|ridge|base camp|fort)\b", re.I)
# /wrong <page> [fact]: the owner's word for a fact -> the facts file's key ("*" = every agent fact on the page).
FACT_WORDS = {"all": "*", "height": "altitude_m", "altitude": "altitude_m", "months": "months", "season": "months",
              "trail": "trail_km", "distance": "trail_km", "difficulty": "difficulty", "station": "rail", "rail": "rail",
              "railway": "rail", "airport": "airport", "district": "district"}
FACT_NAMES = {"altitude_m": "height", "months": "best months", "trail_km": "trail", "difficulty": "difficulty",
              "rail": "station", "airport": "airport", "district": "district", "top": "summit name"}
WRONG = re.compile(r"^/wrong(?:@\w+)?\s+([a-z0-9][a-z0-9-]{0,79})(?:\s+([a-z]+))?\s*$", re.I)
ORGANISER_KEYS = ("difficulty", "months", "trail_km", "altitude_m")


# ---------- pure helpers (tested in test_vendor_agent.py) ----------
def km(lat1, lon1, lat2, lon2):
    p = math.pi / 180
    h = math.sin((lat2 - lat1) * p / 2) ** 2 + math.cos(lat1 * p) * math.cos(lat2 * p) * math.sin((lon2 - lon1) * p / 2) ** 2
    return 12742 * math.asin(math.sqrt(h))


def feed_digest(feed):
    """What matters in the feed (not its timestamp or the next date, which moves every week)."""
    rows = sorted(json.dumps({k: v for k, v in d.items() if k != "nextDate"}, sort_keys=True)
                  for d in (feed or {}).get("departures", []))
    return hashlib.sha256("\n".join(rows).encode()).hexdigest()


def feed_summary(feed):
    """{organiser: {destination: set(cities)}}."""
    out = {}
    for d in (feed or {}).get("departures", []):
        org = (d.get("organiser") or {}).get("name") or "?"
        dest = (d.get("destination") or {}).get("name") or "?"
        out.setdefault(org, {}).setdefault(dest, set()).add((d.get("city") or {}).get("name") or "?")
    return out


def feed_changes(old, new):
    """Lines saying what organisers added or took off, between two feeds."""
    a, b = feed_summary(old), feed_summary(new)
    lines = []
    for org in sorted(set(a) | set(b)):
        if org not in a:
            lines.append(f"🆕 {org}: " + "; ".join(f"{d} from {', '.join(sorted(c))}" for d, c in sorted(b[org].items())))
            continue
        if org not in b:
            lines.append(f"⏸ {org}: no bookable dates now")
            continue
        for dest in sorted(set(a[org]) | set(b[org])):
            if dest not in a[org]:
                lines.append(f"➕ {org}: {dest} from {', '.join(sorted(b[org][dest]))}")
            elif dest not in b[org]:
                lines.append(f"➖ {org}: {dest} (no dates now)")
            else:
                added = sorted(b[org][dest] - a[org][dest])
                if added:
                    lines.append(f"➕ {org}: {dest} now also from {', '.join(added)}")
    return lines


def place_name(name):
    """'Kudremukh Trek' -> 'Kudremukh'; 'Kedarkantha Winter Trek 5D' -> 'Kedarkantha'."""
    words = [w for w in re.split(r"[\s\-–,/&]+", name or "") if w and w.lower() not in GENERIC and not re.fullmatch(r"\d+[dn]?", w, re.I)]
    return " ".join(words).strip()


def norm(s):
    return re.sub(r"[^a-z0-9]", "", (s or "").lower())


def kind_of(listing):
    """Trek or tour, from the listing's own words (activities first): a tour never goes on a trek page."""
    acts = " ".join(listing.get("activities") or [])
    if re.search(r"trek|hik", acts, re.I):
        return "trek"
    return "trek" if TREK_WORDS.search(listing.get("name") or "") else "trip"


def best_station(stations, district=None):
    """[(name, km)] -> the nearest junction / main station (or the district town's own station),
    else the nearest station within 60 km."""
    town = norm(district) if district else None
    main = sorted((s for s in stations if MAIN_STATION.search(s[0]) or (town and town in norm(s[0]))), key=lambda s: s[1])
    if main:
        return main[0][0]
    near = sorted((s for s in stations if s[1] <= 60), key=lambda s: s[1])
    return near[0][0] if near else None


def heights_agree(a, b):
    return a is not None and b is not None and abs(a - b) <= max(30, 0.03 * max(a, b))


def slug(s):
    return re.sub(r"[^a-z0-9]+", "-", (s or "").lower()).strip("-")[:70] or "trek"


def deps_for(feed, name):
    """The feed's departures to the trek called `name` (same place name)."""
    want = norm(place_name(name) or name)
    return [d for d in (feed or {}).get("departures", [])
            if want and norm(place_name((d.get("destination") or {}).get("name"))) == want]


def organiser_facts(deps):
    """(facts, notes) from the organisers' own trek facts in the feed. One organiser's several cities
    count once; several organisers: a value is used only when they agree (months: the months they share)."""
    by_org = {}
    for d in deps:
        trip = d.get("trip") or {}
        org = (d.get("organiser") or {}).get("name") or "?"
        f = {}
        if DIFFICULTY.get(trip.get("difficulty")):
            f["difficulty"] = DIFFICULTY[trip["difficulty"]]
        months = sorted({int(m) for m in (trip.get("best_months") or []) if str(m).isdigit() and 1 <= int(m) <= 12})
        if months:
            f["months"] = months
        if isinstance(trip.get("trail_km"), (int, float)) and 0 < trip["trail_km"] <= 150:
            f["trail_km"] = round(float(trip["trail_km"]), 1)
        if isinstance(trip.get("altitude_m"), (int, float)) and 100 <= trip["altitude_m"] <= 7000:
            f["altitude_m"] = int(round(trip["altitude_m"]))
        if f:
            by_org.setdefault(org, {}).update(f)
    facts, notes = {}, []
    given = [by_org[o] for o in sorted(by_org)]

    def agreed(key, same):
        vals = [g[key] for g in given if key in g]
        if not vals:
            return None
        if all(same(vals[0], v) for v in vals[1:]):
            return vals[0]
        notes.append(f"organisers differ on {FACT_NAMES[key]}")
        return None

    d = agreed("difficulty", lambda a, b: a == b)
    if d:
        facts["difficulty"] = d
    month_sets = [set(g["months"]) for g in given if "months" in g]
    if month_sets:
        shared = sorted(set.intersection(*month_sets))
        if len(shared) >= 2 or len(month_sets) == 1:
            facts["months"] = shared
        else:
            notes.append("organisers' best months don't overlap")
    t = agreed("trail_km", lambda a, b: abs(a - b) <= 0.15 * max(a, b))
    if t:
        facts["trail_km"] = int(t) if float(t).is_integer() else t
    a = agreed("altitude_m", lambda a, b: abs(a - b) <= max(50, 0.05 * max(a, b)))
    if a:
        facts["altitude_m"] = a
    return facts, notes


def parse_wrong(text):
    """'/wrong kudremukh-trek height' -> ('kudremukh-trek', 'altitude_m'); '/wrong x' -> ('x', '*');
    an unknown fact word -> ('x', None); not a /wrong command -> None."""
    m = WRONG.match((text or "").strip())
    if not m:
        return None
    word = (m.group(2) or "all").lower()
    return m.group(1).lower(), FACT_WORDS.get(word)


def without_blocked(facts, blocked):
    """The facts minus what the owner said is wrong (['*'] = everything the agent found)."""
    if "*" in (blocked or []):
        return {"name": facts.get("name")}
    return {k: v for k, v in facts.items() if k not in (blocked or []) and not (k == "top" and "altitude_m" in (blocked or []))}


def nearest(rows, lat, lon, limit_km):
    """rows [[name, lat, lon, ...]] -> [(name, km)] within limit_km, nearest first."""
    out = []
    for r in rows:
        d = km(lat, lon, r[1], r[2])
        if d <= limit_km:
            out.append((r[0], d))
    return sorted(out, key=lambda x: x[1])


# ---------- open data ----------
def get_json(url, data=None, timeout=60):
    req = urllib.request.Request(url, data=data, headers={"User-Agent": USER_AGENT})
    return json.load(urllib.request.urlopen(req, timeout=timeout))


def overpass_query(q, timeout=90):
    last = None
    for host in OVERPASS:
        try:
            return get_json(host, data=urllib.parse.urlencode({"data": q}).encode(), timeout=timeout)["elements"]
        except Exception as e:  # noqa: BLE001 - busy mirror: try the next
            last = e
    raise RuntimeError(f"overpass: {last}")


def overpass(lat, lon, peaks_only=False):
    """Named peaks with a height (and, without our own copies, railway stations and IATA airports) near a point."""
    q = f'[out:json][timeout:60];(node["natural"~"peak|hill|volcano"]["ele"]["name"](around:{PEAK_KM * 1000},{lat},{lon});'
    if not peaks_only:
        q += (f'node["railway"="station"]["name"](around:{STATION_KM * 1000},{lat},{lon});'
              f'nwr["aeroway"="aerodrome"]["iata"]["name"](around:{AIRPORT_KM * 1000},{lat},{lon});')
    return overpass_query(q + ");out center tags;")


def fetch_stations():
    """India's railway stations from OpenStreetMap (not metro / tram stops): [[name, lat, lon]]."""
    els = overpass_query('[out:json][timeout:300];area["ISO3166-1"="IN"][admin_level=2]->.in;'
                         'node["railway"="station"]["name"](area.in);out;', timeout=330)
    rows = []
    for e in els:
        t = e.get("tags", {})
        if t.get("station") in ("subway", "light_rail", "monorail", "funicular", "miniature") or t.get("usage") == "tourism":
            continue
        name = t.get("name:en") if t.get("name:en") and not t["name"].isascii() else t["name"]
        rows.append([name, round(e["lat"], 5), round(e["lon"], 5)])
    return rows


def fetch_airports():
    """India's airports with scheduled flights and an IATA code (OurAirports, public domain): [[name, lat, lon, iata]]."""
    req = urllib.request.Request(OURAIRPORTS, headers={"User-Agent": USER_AGENT})
    text = urllib.request.urlopen(req, timeout=120).read().decode("utf-8")
    rows = []
    for r in csv.DictReader(io.StringIO(text)):
        if (r.get("iso_country") == "IN" and r.get("scheduled_service") == "yes" and r.get("iata_code")
                and r.get("type") in ("large_airport", "medium_airport", "small_airport")):
            rows.append([r["name"], round(float(r["latitude_deg"]), 5), round(float(r["longitude_deg"]), 5), r["iata_code"]])
    return rows


REF_MIN = {"stations": 3000, "airports": 50}


def load_ref(name, fetch):
    """Our copy of a reference list: refreshed when older than REF_DAYS; a failed refresh keeps the old copy."""
    path = REF / f"{name}.json"
    fresh = path.exists() and time.time() - path.stat().st_mtime < REF_DAYS * 86400
    if not fresh:
        try:
            rows = fetch()
            if len(rows) < REF_MIN[name]:
                raise RuntimeError(f"only {len(rows)} rows")
            REF.mkdir(parents=True, exist_ok=True)
            tmp = path.with_suffix(".tmp")
            tmp.write_text(json.dumps(rows, ensure_ascii=False), encoding="utf-8")
            tmp.replace(path)
            print(f"{name}: our copy refreshed ({len(rows)})")
        except Exception as e:  # noqa: BLE001 - keep the old copy
            print(f"{name}: copy not refreshed ({e})")
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return []


def wikidata_heights(name, lat, lon):
    """[(label, metres)] of Wikidata entities called `name` with a height and a position near the trek."""
    s = get_json("https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&limit=7&search="
                 + urllib.parse.quote(name))
    ids = [x["id"] for x in s.get("search", [])]
    if not ids:
        return []
    ents = get_json("https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&props=claims|labels&languages=en&ids="
                    + "|".join(ids))["entities"]
    out = []
    for ent in ents.values():
        claims = ent.get("claims", {})
        try:
            el = claims["P2044"][0]["mainsnak"]["datavalue"]["value"]
            co = claims["P625"][0]["mainsnak"]["datavalue"]["value"]
        except (KeyError, IndexError):
            continue
        metres = float(el["amount"]) * (0.3048 if el.get("unit", "").endswith("Q3710") else 1)  # Q3710 = foot
        if km(lat, lon, co["latitude"], co["longitude"]) <= PEAK_KM + 5:
            out.append((ent.get("labels", {}).get("en", {}).get("value", name), metres))
    return out


def district_of(lat, lon):
    a = get_json(f"https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=10&lat={lat}&lon={lon}").get("address", {})
    d = a.get("state_district") or a.get("county") or ""
    return re.sub(r"\s+(District|district|Taluk|taluk)$", "", d).strip() or None


def peak_ele(tags):
    m = re.match(r"^\s*(\d{3,4}(?:\.\d+)?)\s*(m)?\s*$", str(tags.get("ele", "")))
    return float(m.group(1)) if m else None


def open_height(place, lat, lon, elements):
    """(metres, summit name, note): a nearby OSM peak with the trek's name confirmed by Wikidata, else (None, None, why)."""
    def dist(e):
        return km(lat, lon, e["lat"], e["lon"])
    peaks = [e for e in elements if e.get("tags", {}).get("natural") and "lat" in e and norm(place) and
             (norm(place) in norm(e["tags"]["name"]) or norm(e["tags"]["name"]) in norm(place))]
    osm = min(peaks, key=dist) if peaks else None
    osm_m = peak_ele(osm["tags"]) if osm else None
    wd = wikidata_heights(place, lat, lon)
    time.sleep(1)
    # Of the Wikidata entries near the trek, the one that agrees with OpenStreetMap (a town of the same name has a height too).
    wd_m = next((m for _, m in wd if heights_agree(osm_m, m)), wd[0][1] if wd else None)
    if heights_agree(osm_m, wd_m):
        return int(round(wd_m)), osm["tags"]["name"], None, (osm_m, wd_m)
    if osm_m or wd_m:
        return None, None, f"height not confirmed (OpenStreetMap {osm_m or '-'} m, Wikidata {round(wd_m) if wd_m else '-'} m)", (osm_m, wd_m)
    return None, None, "no height in open data", (None, None)


def settle_height(facts, notes, meta, org_alt, found):
    """Open data's confirmed height wins; the organiser's is used when open data has none or agrees (10 %)."""
    metres, top, note, (osm_m, wd_m) = found
    if metres:
        facts["altitude_m"], facts["top"], meta["altitude_m"] = metres, top, "open-data"
        if org_alt and abs(org_alt - metres) > max(50, 0.05 * metres):
            notes.append(f"organiser's height {org_alt} m differs from open data {metres} m: open data kept")
        return
    single = [x for x in (osm_m, wd_m) if x]
    if org_alt and (not single or any(abs(org_alt - x) <= 0.1 * x for x in single)):
        facts["altitude_m"], meta["altitude_m"] = org_alt, "organiser"
        return
    if org_alt:
        notes.append(f"organiser's height {org_alt} m not matched by open data ({note})")
    elif note:
        notes.append(note)


def research(name, lat, lon, org=None, refs=None):
    """(facts, notes, meta, height_checked): the organiser's facts + what open data confirms.
    meta says where each organiser/open-data fact came from (to keep them current later)."""
    org, refs = dict(org or {}), refs or {}
    place = place_name(name) or name
    facts, notes, meta = {"name": place}, [], {}
    for k in ("difficulty", "months", "trail_km"):
        if k in org:
            facts[k], meta[k] = org[k], "organiser"
    have_refs = bool(refs.get("stations")) and bool(refs.get("airports"))
    height_checked = True
    try:
        elements = overpass(lat, lon, peaks_only=have_refs)
    except Exception as e:  # noqa: BLE001 - without our copies nothing else can be found either
        if not have_refs:
            raise
        elements, height_checked = [], False
        notes.append(f"height not checked yet (map server busy: {e.__class__.__name__})")
    if height_checked:
        settle_height(facts, notes, meta, org.get("altitude_m"), open_height(place, lat, lon, elements))
    elif org.get("altitude_m"):
        facts["altitude_m"], meta["altitude_m"] = org["altitude_m"], "organiser"

    try:
        district = district_of(lat, lon)
        if district:
            facts["district"] = district
    except Exception as e:  # noqa: BLE001 - district is optional
        notes.append(f"district not found ({e.__class__.__name__})")
    if have_refs:
        stations = nearest(refs["stations"], lat, lon, STATION_KM)
        airports = nearest(refs["airports"], lat, lon, AIRPORT_KM)
    else:
        def dist(e):
            c = e.get("center") or e
            return km(lat, lon, c["lat"], c["lon"])
        stations = [(e["tags"]["name"], dist(e)) for e in elements if e.get("tags", {}).get("railway") == "station"]
        airports = sorted(((e["tags"].get("name:en") or e["tags"]["name"], dist(e)) for e in elements if e.get("tags", {}).get("aeroway")),
                          key=lambda x: x[1])
    station = best_station(stations, facts.get("district"))
    if station:
        facts["rail"] = station
    if airports:
        facts["airport"] = airports[0][0]
    if "difficulty" not in facts:
        notes.append("no difficulty from the organiser")
    if "months" not in facts:
        notes.append("no best months from the organiser")
    return facts, notes, meta, height_checked


# ---------- web server ----------
def ssh_json(action, payload=None, timeout=300):
    p = subprocess.run(SSH + [action], input=None if payload is None else json.dumps(payload, ensure_ascii=False),
                       capture_output=True, text=True, timeout=timeout)
    if p.returncode != 0:
        raise RuntimeError(f"{action} failed: {(p.stdout + p.stderr).strip()[:300]}")
    return p.stdout


def website_treks():
    first = get_json(f"{SITE_API}/api/treks/?page=1")
    items = list(first.get("results", []))
    for page in range(2, (first.get("total_pages") or 1) + 1):
        items += get_json(f"{SITE_API}/api/treks/?page={page}").get("results", [])
    return {t.get("id") or t.get("slug"): t for t in items if t.get("id") or t.get("slug")}


def detail(tid):
    return get_json(f"{SITE_API}/api/treks/{urllib.parse.quote(tid)}/")


# ---------- the owner's corrections (Telegram) ----------
def inbox():
    """Read the owner's /wrong replies (only the owner's chat counts). Returns what was noted."""
    try:
        token, chat = secret("telegram-bot-token"), int(secret("telegram-chat-id"))
        offset = int(state_get("telegram_offset", 0) or 0)
        res = get_json(f"https://api.telegram.org/bot{token}/getUpdates?timeout=0&offset={offset + 1}"
                       "&allowed_updates=%5B%22message%22%5D", timeout=20)
    except Exception as e:  # noqa: BLE001 - Telegram down: next run
        print("telegram inbox not read:", e.__class__.__name__)
        return []
    blocked = state_get("vendor_facts_blocked", {})
    noted = []
    for u in res.get("result", []):
        offset = max(offset, int(u.get("update_id", 0)))
        msg = u.get("message") or {}
        if (msg.get("chat") or {}).get("id") != chat:
            continue
        w = parse_wrong(msg.get("text"))
        if not w:
            continue
        tid, field = w
        if field is None:
            telegram("Use: <code>/wrong page</code> or <code>/wrong page height|months|trail|difficulty|station|airport|district</code>")
            continue
        have = blocked.setdefault(tid, [])
        if field not in have:
            have.append(field)
        noted.append(f"{tid}: {'all agent facts' if field == '*' else FACT_NAMES.get(field, field)}")
    state_set("telegram_offset", offset)
    if noted:
        state_set("vendor_facts_blocked", blocked)
        telegram("👍 Noted, taking off the site in a few minutes:\n" + "\n".join(esc(x) for x in noted), silent=True)
    return noted


# ---------- steps ----------
def read_feed():
    body = get_json(FEED)
    return body.get("data", body) if isinstance(body, dict) else {}


def step_check(force=False):
    feed = read_feed()
    digest = feed_digest(feed)
    # Proof of life (watchdog.py alerts when this goes stale): time and size of the last check.
    state_set("vendor_last_check", {"at": datetime.now().isoformat(timespec="seconds"), "departures": feed.get("count", 0)})
    if busy(state_get("vendor_run")):
        print("UNCHANGED (the last run is still working)")
        return False
    corrections = inbox()
    last = state_get("vendor_feed_digest")
    if last is None and not force:
        state_set("vendor_feed_digest", digest)
        state_set("vendor_feed_last", feed)
        print("UNCHANGED (first run: feed recorded)")
        return False
    pending = state_get("vendor_facts_pending", {})
    due = [k for k, v in pending.items() if v.get("next", "") <= datetime.now().isoformat()]
    if digest == last and not due and not corrections and not force:
        print(f"UNCHANGED ({feed.get('count', 0)} departures)")
        return False
    state_set("vendor_feed_new", feed)
    state_set("vendor_run", {"started": datetime.now().isoformat(timespec="seconds"), "sync": "", "facts": [], "deployed": None,
                             "corrections": corrections})
    why = [f"{feed.get('count', 0)} departures"] + ([f"facts to re-check: {len(due)}"] if due else []) + \
          ([f"owner corrections: {len(corrections)}"] if corrections else [])
    print(f"CHANGED ({', '.join(why)})")
    return True


def busy(run_state, now=None):
    """A run started under 30 minutes ago and not finished (report not reached): don't start another."""
    r = run_state or {}
    if not r.get("started") or r.get("finished"):
        return False
    try:
        return ((now or datetime.now()) - datetime.fromisoformat(r["started"])).total_seconds() < 1800
    except ValueError:
        return False


def _run_state():
    return state_get("vendor_run") or {"facts": []}


def step_sync():
    r = _run_state()
    if feed_digest(state_get("vendor_feed_new")) == state_get("vendor_feed_digest"):
        print("feed unchanged: nothing to copy")  # a re-check or a correction only
        return
    code, out = run("sync", timeout=600)
    r["sync"] = "\n".join(ln for ln in out.splitlines() if ln.strip())[-2500:]
    state_set("vendor_run", r)
    print(out)
    if code != 0:
        raise RuntimeError(f"website sync failed (exit {code})")


def step_geo():
    """Positions and destinations for new pages. Both lean on Gemini (free tier): when it is busy or
    out of quota the site builds with the last ones, and the next run tries again."""
    if feed_digest(state_get("vendor_feed_new")) == state_get("vendor_feed_digest"):
        print("feed unchanged: positions kept")
        return
    try:
        from trek_geo import push as push_geo, update as locate
        geo, _ = locate()
        changed = push_geo(geo)
        print(f"positions: {len(geo)} treks{' (updated)' if changed else ''}")
    except Exception as e:  # noqa: BLE001
        print("positions not updated:", e)
    try:
        from destinations import build as build_destinations, push as push_destinations
        dests = build_destinations()
        state_set("destinations", dests)
        push_destinations(dests)
        print(f"destinations: {len(dests)}")
    except Exception as e:  # noqa: BLE001
        print("destinations not updated:", e)


def fact_value(k, v):
    if k == "months":
        return ", ".join(datetime(2000, m, 1).strftime("%b") for m in v)
    return f"{v}{ {'altitude_m': ' m', 'trail_km': ' km'}.get(k, '')}"


def _shown(facts, keys):
    return ", ".join(f"{FACT_NAMES.get(k, k)} {fact_value(k, facts[k])}" for k in keys)


def step_facts():
    info = json.loads(ssh_json("facts-get", timeout=120))
    static, auto = info["static"], info["auto"]
    auto.setdefault("treks", {}), auto.setdefault("listings", {}), auto.setdefault("kinds", {})
    before = json.dumps(auto, sort_keys=True)
    feed = state_get("vendor_feed_new") or {}
    geo = json.loads(state_get("trek_geo_pushed") or "{}")
    pending = state_get("vendor_facts_pending", {})
    meta = state_get("vendor_facts_meta", {})
    blocked = state_get("vendor_facts_blocked", {})
    refs = {"stations": load_ref("stations", fetch_stations), "airports": load_ref("airports", fetch_airports)}
    now = datetime.now()
    report = []

    # 1. The owner's corrections (/wrong in Telegram) first.
    for tid, fields in blocked.items():
        if tid in static["listings"]:
            continue  # the team's own facts: reported once below
        key = auto["listings"].get(tid)
        if "*" in fields and key:
            auto["listings"].pop(tid)
            if key in auto["treks"] and key not in auto["listings"].values():
                auto["treks"].pop(key)
        elif key in auto["treks"]:
            auto["treks"][key] = without_blocked(auto["treks"][key], fields)
    for c in _run_state().get("corrections") or []:
        tid = c.split(":")[0]
        report.append(f"🗑 {c}" + (" — this page uses the team's facts file; fix it there" if tid in static["listings"] else " — taken off"))

    # 2. Agent-made treks: keep the organisers' facts current; re-check heights the map server held up.
    for tid, key in sorted(auto["listings"].items()):
        if key not in auto["treks"] or "*" in blocked.get(tid, []):
            continue
        cur = auto["treks"][key]
        m = meta.setdefault(key, {})
        org, org_notes = organiser_facts(deps_for(feed, cur.get("name")))
        new = dict(cur)
        for k in ("difficulty", "months", "trail_km"):
            if k in org:
                new[k], m[k] = org[k], "organiser"
            elif m.get(k) == "organiser":
                new.pop(k, None)
                m.pop(k, None)
        if m.get("altitude_m") != "open-data":
            if org.get("altitude_m"):
                new["altitude_m"], m["altitude_m"] = org["altitude_m"], "organiser"
            elif m.get("altitude_m") == "organiser":
                new.pop("altitude_m", None)
                m.pop("altitude_m", None)
        p = pending.get(tid, {})
        if p.get("height") and p.get("next", "") <= now.isoformat() and p.get("pos"):
            try:
                elements = overpass(p["pos"]["lat"], p["pos"]["lon"], peaks_only=True)
                h_notes = []
                settle_height(new, h_notes, m, org.get("altitude_m"), open_height(cur.get("name"), p["pos"]["lat"], p["pos"]["lon"], elements))
                pending.pop(tid, None)
                report.append(f"📐 {cur.get('name')} ({tid}): height re-checked: "
                              + (f"{new['altitude_m']} m" if "altitude_m" in new else "; ".join(h_notes) or "none confirmed"))
            except Exception as e:  # noqa: BLE001 - still busy
                pending[tid] = {**p, "next": (now + timedelta(hours=BUSY_HOURS)).isoformat(), "why": str(e)[:120]}
        new = without_blocked(new, blocked.get(tid))
        if new != cur:
            auto["treks"][key] = new
            changed_keys = sorted(k for k in set(new) | set(cur) if new.get(k) != cur.get(k) and k != "top")
            if changed_keys:
                report.append(f"✏️ {cur.get('name')} ({tid}): " + ", ".join(
                    f"{FACT_NAMES.get(k, k)} {'removed' if k not in new else 'now ' + fact_value(k, new[k])}"
                    for k in changed_keys) + (f" — {'; '.join(org_notes)}" if org_notes else ""))

    # 3. New listings: trek or tour, then facts.
    names = {norm(place_name(n)): k for k, n in static["names"].items() if n}
    names.update({norm(place_name(f.get("name"))): k for k, f in auto["treks"].items()})
    researched = 0
    for tid, t in sorted(website_treks().items()):
        known_kind = static["kinds"].get(tid) or auto["kinds"].get(tid)
        has_facts = tid in static["listings"] or tid in auto["listings"]
        if (known_kind and (known_kind == "trip" or has_facts)) or "*" in blocked.get(tid, []):
            continue
        d = detail(tid)
        if not known_kind:
            auto["kinds"][tid] = kind_of(d)
            report.append(f"{'🥾 trek' if auto['kinds'][tid] == 'trek' else '🚌 tour'}: {d.get('name')} ({tid})")
            if auto["kinds"][tid] == "trip":
                continue
        # Same trek as one we already know ("Kumara Parvatha Trek" -> kumara-parvatha): reuse its facts.
        key = names.get(norm(place_name(d.get("name"))))
        if key:
            auto["listings"][tid] = key
            report.append(f"🔗 {d.get('name')} ({tid}): same trek as {key}, its facts reused")
            continue
        if researched >= MAX_RESEARCH:
            continue
        p = pending.get(tid, {})
        if p.get("next", "") > now.isoformat():
            continue
        deps = deps_for(feed, d.get("name"))
        pos = geo.get(tid) or next(((x.get("destination") or {}).get("position") for x in deps
                                    if (x.get("destination") or {}).get("position")), None)
        if not pos:
            pending[tid] = {"next": (now + timedelta(days=RETRY_DAYS)).isoformat(), "why": "no map position yet"}
            report.append(f"⏳ {d.get('name')} ({tid}): no map position yet, facts later")
            continue
        researched += 1
        org, org_notes = organiser_facts(deps)
        try:
            facts, notes, fmeta, height_checked = research(d.get("name"), pos["lat"], pos["lon"], org, refs)
        except Exception as e:  # noqa: BLE001 - open-data API down and no copies yet: next run
            pending[tid] = {"next": (now + timedelta(hours=BUSY_HOURS)).isoformat(), "why": str(e)[:120]}
            report.append(f"⏳ {d.get('name')} ({tid}): open data unavailable ({e.__class__.__name__}), retry later")
            continue
        facts = without_blocked(facts, blocked.get(tid))
        notes = org_notes + notes
        found = [k for k in ("altitude_m", "difficulty", "months", "trail_km", "district", "rail", "airport") if k in facts]
        if not found:
            pending[tid] = {"next": (now + timedelta(days=RETRY_DAYS)).isoformat(), "why": "; ".join(notes)}
            report.append(f"❔ {d.get('name')} ({tid}): nothing confirmed ({'; '.join(notes)})")
            continue
        key = slug(facts["name"])
        while key in static["names"] or (key in auto["treks"] and auto["treks"][key].get("name") != facts["name"]):
            key = f"{key}-2"
        auto["treks"][key] = facts
        auto["listings"][tid] = key
        meta[key] = fmeta
        names[norm(facts["name"])] = key
        if height_checked:
            pending.pop(tid, None)
        else:
            pending[tid] = {"next": (now + timedelta(hours=BUSY_HOURS)).isoformat(), "why": "height not checked", "height": True, "pos": pos}
        report.append(f"📐 {d.get('name')} ({tid}): {_shown(facts, found)}"
                      + (f" — left out: {'; '.join(notes)}" if notes else "") + f" · wrong? /wrong {tid}")

    state_set("vendor_facts_pending", pending)
    state_set("vendor_facts_meta", meta)
    changed = json.dumps(auto, sort_keys=True) != before
    if changed:
        print(ssh_json("facts", auto, timeout=120).strip())
    r = _run_state()
    r["facts"], r["facts_changed"] = report, changed
    state_set("vendor_run", r)
    print("\n".join(report) or "no new treks to classify or research")


def step_deploy():
    r = _run_state()
    sync_changed = bool(re.search(r"New pages|updated|created|switched off|added", r.get("sync", ""), re.I))
    feed_moved = feed_digest(state_get("vendor_feed_new")) != state_get("vendor_feed_digest")
    if not (sync_changed or r.get("facts_changed") or feed_moved):
        print("nothing to rebuild")
        return
    code, out = deploy("organisers' new data (vendor agent)", notify=False)
    r["deployed"] = code
    state_set("vendor_run", r)
    print(out[-1500:])
    if code == 0:
        try:  # the 3-hourly content sync need not rebuild the same data again
            from content_sync import fingerprint
            state_set("content_fingerprint", fingerprint()[0])
        except Exception as e:  # noqa: BLE001
            print("content fingerprint not updated:", e)
    elif code not in (3, 11):
        raise RuntimeError(f"deploy failed (exit {code})")


def step_report():
    r = _run_state()
    new = state_get("vendor_feed_new") or {}
    old = state_get("vendor_feed_last") or {}
    changes = feed_changes(old, new)
    sync_lines = [ln for ln in r.get("sync", "").splitlines() if re.search(r"New pages|no page|skipped|App places", ln)]
    deployed = {0: "✅ site rebuilt", 3: "⏳ another rebuild was running; next run", 11: "🛑 build refused by the safety gate",
                None: "no rebuild needed"}.get(r.get("deployed"), f"❌ rebuild exit {r.get('deployed')}")
    if changes or r.get("facts") or sync_lines:
        parts = ["🧭 <b>Vendor agent</b>"]
        if changes:
            parts.append("<b>Organisers</b>\n" + "\n".join(esc(x) for x in changes[:25]))
        if sync_lines:
            parts.append("<b>Website</b>\n" + "\n".join(esc(x) for x in sync_lines[:10]))
        if r.get("facts"):
            parts.append("<b>Treks</b>\n" + "\n".join(esc(x) for x in r["facts"][:25]))
        parts.append(deployed)
        telegram("\n\n".join(parts), silent=not changes)
    state_set("vendor_feed_digest", feed_digest(new))
    state_set("vendor_feed_last", new)
    r["finished"] = datetime.now().isoformat(timespec="seconds")
    state_set("vendor_run", r)
    print("\n".join(changes) or "no organiser changes", "|", deployed)


STEPS = {"sync": step_sync, "geo": step_geo, "facts": step_facts, "deploy": step_deploy, "report": step_report}


def main(argv):
    step = argv[1] if len(argv) > 1 else "check"
    force = "--force" in argv
    if step == "check":
        step_check(force)
        return 0
    if step == "all":
        if not step_check(force):
            return 0
        for name in ("sync", "geo", "facts", "deploy", "report"):
            print(f"== {name}")
            STEPS[name]()
        return 0
    if step not in STEPS:
        print(f"usage: vendor_agent.py check|{'|'.join(STEPS)}|all [--force]")
        return 2
    STEPS[step]()
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
