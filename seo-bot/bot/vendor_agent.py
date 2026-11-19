"""Vendor agent: when organisers list treks and dates in the app, put them on aorbotreks.com within minutes.

Owner, 19 Nov 2026: "we started onboarding vendors; as soon as their data comes, an agent should work,
connected through an n8n chain". n8n (workflow "SEO bot: vendor agent") runs the steps in order every
10 minutes; nothing happens unless the organisers' feed changed:

    vendor_agent.py check    the app's public feed of bookable departures changed? prints CHANGED / UNCHANGED
    vendor_agent.py sync     website copies the departures now (web server: manage.py sync_app_departures;
                             new places get their own page) instead of at the next hourly run
    vendor_agent.py geo      map positions + destinations for new pages (trek_geo.py, destinations.py)
    vendor_agent.py facts    trek or tour, and trek facts for new trek pages (below)
    vendor_agent.py deploy   rebuild the site once (sitedeploy.py; IndexNow is pinged by deploy.sh)
    vendor_agent.py report   Telegram: what organisers added or removed, pages made, facts found or missing
    vendor_agent.py all      every step (manual run); --force runs even with an unchanged feed

Facts come from open data only, never invented (the free Gemini key has no web search):
  - height: a named OpenStreetMap peak near the trek AND its Wikidata entry, kept only when the two
    agree (within 3 % or 30 m) - the same "two sources agree" rule the team follows;
  - nearest railway station and airport (with an IATA code) from OpenStreetMap, district from
    OpenStreetMap's address of the position;
  - difficulty: the organiser's own choice in the app (feed trip.difficulty).
A fact that cannot be confirmed is left out and listed in the report. The team's own files
(aorbo-frontend/scripts/data/trek-facts.json, listing-kind.json) always win over the agent's file.
"""
import hashlib
import json
import math
import re
import subprocess
import sys
import time
import urllib.parse
import urllib.request
from datetime import datetime, timedelta

from common import USER_AGENT, esc, state_get, state_set, telegram
from sitedeploy import SSH, deploy, run

FEED = "https://api.aorbotreks.co.in/api/v1/website/departures"
SITE_API = "https://aorbotreks.com"
OVERPASS = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter",
            "https://overpass.private.coffee/api/interpreter"]
MAX_RESEARCH = 6            # new treks researched per run (open-data APIs: be gentle)
RETRY_DAYS = 3              # a trek with nothing confirmed is tried again after this
PEAK_KM, STATION_KM, AIRPORT_KM = 20, 60, 250
DIFFICULTY = {"easy": "easy", "moderate": "moderate", "difficult": "difficult", "extreme": "difficult"}
GENERIC = {"trek", "treks", "trip", "trips", "tour", "tours", "hike", "hiking", "package", "day", "days",
           "night", "nights", "the", "and", "to", "from", "camping", "sunrise", "weekend", "winter", "snow"}
TREK_WORDS = re.compile(r"\b(trek|treks|trekking|hike|hiking|summit|peak|betta|durga|trail|ridge|base camp|fort)\b", re.I)


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


def heights_agree(a, b):
    return a is not None and b is not None and abs(a - b) <= max(30, 0.03 * max(a, b))


def slug(s):
    return re.sub(r"[^a-z0-9]+", "-", (s or "").lower()).strip("-")[:70] or "trek"


# ---------- open data ----------
def get_json(url, data=None, timeout=60):
    req = urllib.request.Request(url, data=data, headers={"User-Agent": USER_AGENT})
    return json.load(urllib.request.urlopen(req, timeout=timeout))


def overpass(lat, lon):
    """Named peaks with a height, railway stations and IATA airports around a point (OpenStreetMap)."""
    q = (f'[out:json][timeout:60];(node["natural"~"peak|hill|volcano"]["ele"]["name"](around:{PEAK_KM * 1000},{lat},{lon});'
         f'node["railway"="station"]["name"](around:{STATION_KM * 1000},{lat},{lon});'
         f'nwr["aeroway"="aerodrome"]["iata"]["name"](around:{AIRPORT_KM * 1000},{lat},{lon}););out center tags;')
    last = None
    for host in OVERPASS:
        try:
            return get_json(host, data=urllib.parse.urlencode({"data": q}).encode(), timeout=90)["elements"]
        except Exception as e:  # noqa: BLE001 - busy mirror: try the next
            last = e
    raise RuntimeError(f"overpass: {last}")


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


def research(name, lat, lon, difficulty=None):
    """(facts, notes): only facts confirmed by open data; notes say what was left out and why."""
    place = place_name(name) or name
    facts, notes = {"name": place}, []
    elements = overpass(lat, lon)

    def dist(e):
        c = e.get("center") or e
        return km(lat, lon, c["lat"], c["lon"])

    # Height: a nearby OSM peak with the trek's name, confirmed by Wikidata.
    peaks = [e for e in elements if e.get("tags", {}).get("natural") and norm(place) and
             (norm(place) in norm(e["tags"]["name"]) or norm(e["tags"]["name"]) in norm(place))]
    osm = min(peaks, key=dist) if peaks else None
    osm_m = peak_ele(osm["tags"]) if osm else None
    wd = wikidata_heights(place, lat, lon)
    time.sleep(1)
    # Of the Wikidata entries near the trek, the one that agrees with OpenStreetMap (a town of the same name has a height too).
    wd_m = next((m for _, m in wd if heights_agree(osm_m, m)), wd[0][1] if wd else None)
    if heights_agree(osm_m, wd_m):
        facts["altitude_m"] = int(round(wd_m))
        facts["top"] = osm["tags"]["name"]
    elif osm_m or wd_m:
        notes.append(f"height not confirmed (OpenStreetMap {osm_m or '-'} m, Wikidata {round(wd_m) if wd_m else '-'} m)")
    else:
        notes.append("no height in open data")

    stations = sorted((e for e in elements if e.get("tags", {}).get("railway") == "station"), key=dist)
    if stations:
        facts["rail"] = stations[0]["tags"]["name"]
    airports = sorted((e for e in elements if e.get("tags", {}).get("aeroway")), key=dist)
    if airports:
        facts["airport"] = airports[0]["tags"].get("name:en") or airports[0]["tags"]["name"]
    try:
        district = district_of(lat, lon)
        if district:
            facts["district"] = district
    except Exception as e:  # noqa: BLE001 - district is optional
        notes.append(f"district not found ({e.__class__.__name__})")
    if DIFFICULTY.get(difficulty):
        facts["difficulty"] = DIFFICULTY[difficulty]
    else:
        notes.append("no difficulty from the organiser")
    return facts, notes


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


# ---------- steps ----------
def read_feed():
    body = get_json(FEED)
    return body.get("data", body) if isinstance(body, dict) else {}


def step_check(force=False):
    feed = read_feed()
    digest = feed_digest(feed)
    last = state_get("vendor_feed_digest")
    if last is None and not force:
        state_set("vendor_feed_digest", digest)
        state_set("vendor_feed_last", feed)
        print("UNCHANGED (first run: feed recorded)")
        return False
    pending = state_get("vendor_facts_pending", {})
    due = [k for k, v in pending.items() if v.get("next", "") <= datetime.now().isoformat()]
    if digest == last and not due and not force:
        print(f"UNCHANGED ({feed.get('count', 0)} departures)")
        return False
    state_set("vendor_feed_new", feed)
    state_set("vendor_run", {"started": datetime.now().isoformat(timespec="seconds"), "sync": "", "facts": [], "deployed": None})
    print(f"CHANGED ({feed.get('count', 0)} departures{', facts to retry: ' + str(len(due)) if due else ''})")
    return True


def _run_state():
    return state_get("vendor_run") or {"facts": []}


def step_sync():
    code, out = run("sync", timeout=600)
    r = _run_state()
    r["sync"] = "\n".join(ln for ln in out.splitlines() if ln.strip())[-2500:]
    state_set("vendor_run", r)
    print(out)
    if code != 0:
        raise RuntimeError(f"website sync failed (exit {code})")


def step_geo():
    """Positions and destinations for new pages. Both lean on Gemini (free tier): when it is busy or
    out of quota the site builds with the last ones, and the next run tries again."""
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


def step_facts():
    info = json.loads(ssh_json("facts-get", timeout=120))
    static, auto = info["static"], info["auto"]
    auto.setdefault("treks", {}), auto.setdefault("listings", {}), auto.setdefault("kinds", {})
    before = json.dumps(auto, sort_keys=True)
    feed = state_get("vendor_feed_new") or {}
    geo = json.loads(state_get("trek_geo_pushed") or "{}")
    pending = state_get("vendor_facts_pending", {})
    names = {norm(place_name(n)): k for k, n in static["names"].items() if n}
    names.update({norm(place_name(f.get("name"))): k for k, f in auto["treks"].items()})
    report = []
    treks = website_treks()
    researched = 0
    for tid, t in sorted(treks.items()):
        known_kind = static["kinds"].get(tid) or auto["kinds"].get(tid)
        has_facts = tid in static["listings"] or tid in auto["listings"]
        if known_kind and (known_kind == "trip" or has_facts):
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
            report.append(f"🔗 {d.get('name')}: same trek as {key}, its facts reused")
            continue
        if researched >= MAX_RESEARCH:
            continue
        p = pending.get(tid, {})
        if p.get("next", "") > datetime.now().isoformat():
            continue
        dep = next((x for x in feed.get("departures", []) if norm(place_name((x.get("destination") or {}).get("name")))
                    == norm(place_name(d.get("name")))), None)
        pos = geo.get(tid) or ((dep or {}).get("destination") or {}).get("position")
        if not pos:
            pending[tid] = {"next": (datetime.now() + timedelta(days=RETRY_DAYS)).isoformat(), "why": "no map position yet"}
            report.append(f"⏳ {d.get('name')}: no map position yet, facts later")
            continue
        researched += 1
        try:
            facts, notes = research(d.get("name"), pos["lat"], pos["lon"], ((dep or {}).get("trip") or {}).get("difficulty"))
        except Exception as e:  # noqa: BLE001 - open-data API down: next run
            pending[tid] = {"next": (datetime.now() + timedelta(hours=6)).isoformat(), "why": str(e)[:120]}
            report.append(f"⏳ {d.get('name')}: open data unavailable ({e.__class__.__name__}), retry later")
            continue
        found = [k for k in ("altitude_m", "difficulty", "district", "rail", "airport") if k in facts]
        if not found:
            pending[tid] = {"next": (datetime.now() + timedelta(days=RETRY_DAYS)).isoformat(), "why": "; ".join(notes)}
            report.append(f"❔ {d.get('name')}: nothing confirmed ({'; '.join(notes)})")
            continue
        key = slug(facts["name"])
        while key in static["names"] or (key in auto["treks"] and auto["treks"][key].get("name") != facts["name"]):
            key = f"{key}-2"
        auto["treks"][key] = facts
        auto["listings"][tid] = key
        names[norm(facts["name"])] = key
        pending.pop(tid, None)
        shown = ", ".join(f"{k.replace('_m', '')} {facts[k]}{' m' if k == 'altitude_m' else ''}" for k in found)
        report.append(f"📐 {d.get('name')}: {shown}" + (f" — left out: {'; '.join(notes)}" if notes else ""))
    state_set("vendor_facts_pending", pending)
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
