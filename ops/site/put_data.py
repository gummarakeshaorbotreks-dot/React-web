#!/usr/bin/env python3
"""Receive SEO data from the bot (bot-entry.sh "geo" / "destinations", JSON on stdin).

    put_data.py geo            trek map positions        -> data/trek-geo.json      (TREK_GEO_FILE)
    put_data.py destinations   destinations and packages -> data/destinations.json  (DESTINATIONS_FILE)
    put_data.py facts          the vendor agent's trek facts + trek/trip kinds -> data/trek-facts-auto.json
                               (TREK_FACTS_AUTO_FILE; the team's scripts/data/*.json always win over it)
    put_data.py facts-get      prints what the team's files already cover + the agent's current file
    put_data.py heartbeat      the bot server's watchdog says it is alive -> data/bot-heartbeat.json
                               (read by bot_watch.py, which alerts when it stops coming)

Read by the build for the "Treks near <city>" and "<destination> trips" pages. Only
the expected shape is accepted (positions inside India, short plain strings); anything
else is refused and the current file is kept.
"""
import json
import os
import re
import sys

DIR = "/opt/aorbo-site/data"
MAX_BYTES = 2_000_000
ID = re.compile(r"[A-Za-z0-9._~-]{1,200}")
SLUG = re.compile(r"[a-z0-9-]{1,80}")


def in_india(lat, lon):
    return isinstance(lat, (int, float)) and isinstance(lon, (int, float)) and 6 < lat < 37.5 and 68 < lon < 98


def text(v, limit):
    if not isinstance(v, str) or len(v) > limit or "<" in v:
        raise ValueError(f"bad text {str(v)[:40]!r}")
    return v.strip()


def geo(data):
    if not isinstance(data, dict) or not data:
        raise ValueError("expected a non-empty object")
    out = {}
    for tid, v in data.items():
        if not (isinstance(tid, str) and ID.fullmatch(tid) and isinstance(v, dict) and in_india(v.get("lat"), v.get("lon"))):
            raise ValueError(f"bad entry {tid!r}")
        out[tid] = {"lat": float(v["lat"]), "lon": float(v["lon"]),
                    "source": v.get("source") if v.get("source") in ("admin", "osm") else "osm"}
    return out


def destinations(data):
    if not isinstance(data, list) or not data:
        raise ValueError("expected a non-empty list")
    out = []
    for d in data:
        if not isinstance(d, dict) or not SLUG.fullmatch(str(d.get("slug", ""))):
            raise ValueError(f"bad destination {str(d)[:60]}")
        if d.get("kind") not in ("place", "region", "state"):
            raise ValueError(f"bad kind for {d['slug']}")
        has_pos = d.get("lat") is not None
        if has_pos and not in_india(d.get("lat"), d.get("lon")):
            raise ValueError(f"{d['slug']} is not a position in India")
        treks = d.get("treks")
        if not (isinstance(treks, list) and all(isinstance(t, str) and ID.fullmatch(t) for t in treks)):
            raise ValueError(f"bad packages for {d['slug']}")
        out.append({"slug": d["slug"], "name": text(d.get("name"), 80), "state": text(d.get("state", ""), 80),
                    "kind": d["kind"], "lat": float(d["lat"]) if has_pos else None,
                    "lon": float(d["lon"]) if has_pos else None, "treks": treks[:200],
                    "keep": d.get("keep") is True,  # published page: stays with one package
                    "places": [text(p, 150) for p in (d.get("places") or [])[:20]]})
    return out


DIFFICULTY = {"easy", "easy-moderate", "moderate", "moderate-difficult", "difficult"}
THEMES = {"snow", "waterfall", "fort", "night", "sunrise", "cave", "temple", "lake", "meadow", "forest", "summit"}
KEY = re.compile(r"[a-z0-9-]{1,80}")


def trek_facts(f):
    """One trek's facts, same rules as aorbo-frontend/scripts/trek-facts.mjs checkFacts."""
    if not isinstance(f, dict):
        raise ValueError("facts must be an object")
    out = {"name": text(f.get("name"), 80)}
    if not out["name"]:
        raise ValueError("facts need a name")
    for k, limit in (("top", 120), ("start", 120), ("district", 80), ("rail", 120), ("airport", 120), ("trail_note", 120)):
        if f.get(k) is not None:
            out[k] = text(f[k], limit)
    a = f.get("altitude_m")
    if a is not None:
        if not (isinstance(a, int) and 100 <= a <= 8000):
            raise ValueError(f"altitude_m {a!r}")
        out["altitude_m"] = a
    t = f.get("trail_km")
    if t is not None:
        if not (isinstance(t, (int, float)) and 0 < t <= 200):
            raise ValueError(f"trail_km {t!r}")
        out["trail_km"] = t
    if f.get("difficulty") is not None:
        if f["difficulty"] not in DIFFICULTY:
            raise ValueError(f"difficulty {f['difficulty']!r}")
        out["difficulty"] = f["difficulty"]
    m = f.get("months")
    if m is not None:
        if not (isinstance(m, list) and all(isinstance(x, int) and 1 <= x <= 12 for x in m) and len(set(m)) == len(m)):
            raise ValueError("months")
        out["months"] = m
    th = f.get("themes")
    if th is not None:
        if not (isinstance(th, list) and all(x in THEMES for x in th)):
            raise ValueError("themes")
        out["themes"] = th
    if f.get("pos") is not None:
        p = f["pos"]
        if not (isinstance(p, list) and len(p) == 2 and in_india(p[0], p[1])):
            raise ValueError("pos")
        out["pos"] = [float(p[0]), float(p[1])]
    return out


def facts(data):
    if not isinstance(data, dict):
        raise ValueError("expected an object")
    treks = {}
    for key, f in (data.get("treks") or {}).items():
        if not (isinstance(key, str) and KEY.fullmatch(key)):
            raise ValueError(f"bad trek key {key!r}")
        treks[key] = trek_facts(f)
    listings = {}
    for tid, key in (data.get("listings") or {}).items():
        if not (isinstance(tid, str) and ID.fullmatch(tid) and key in treks):
            raise ValueError(f"bad listing {tid!r}")
        listings[tid] = key
    kinds = {}
    for tid, kind in (data.get("kinds") or {}).items():
        if not (isinstance(tid, str) and ID.fullmatch(tid) and kind in ("trek", "trip")):
            raise ValueError(f"bad kind for {tid!r}")
        kinds[tid] = kind
    return {"treks": treks, "listings": listings, "kinds": kinds}


def facts_get():
    """What the team's own files already decide, and the agent's file (for the vendor agent)."""
    src = "/opt/aorbo-site/src/scripts/data"
    def load(path, default):
        try:
            with open(path, encoding="utf-8") as f:
                return json.load(f)
        except (OSError, ValueError):
            return default
    static = load(os.path.join(src, "trek-facts.json"), {})
    kinds = load(os.path.join(src, "listing-kind.json"), {}).get("listings", {})
    print(json.dumps({
        "static": {
            "listings": static.get("listings", {}),
            "names": {k: v.get("name") for k, v in static.get("treks", {}).items()},
            "kinds": {k: v.get("kind") for k, v in kinds.items()},
        },
        "auto": load(os.path.join(DIR, "trek-facts-auto.json"), {"treks": {}, "listings": {}, "kinds": {}}),
    }, ensure_ascii=False))


def heartbeat(data):
    """{at, ok, problems[]} from the bot's watchdog; stamped with OUR clock on arrival."""
    if not isinstance(data, dict) or not isinstance(data.get("ok"), bool):
        raise ValueError("expected {at, ok, problems}")
    probs = data.get("problems") or []
    if not (isinstance(probs, list) and len(probs) <= 3):
        raise ValueError("problems")
    import datetime
    return {"at": text(data.get("at"), 25), "ok": data["ok"], "problems": [text(p, 200) for p in probs],
            "received": datetime.datetime.now().isoformat(timespec="seconds")}


KINDS = {"geo": ("trek-geo.json", geo), "destinations": ("destinations.json", destinations),
         "facts": ("trek-facts-auto.json", facts), "heartbeat": ("bot-heartbeat.json", heartbeat)}

if len(sys.argv) == 2 and sys.argv[1] == "facts-get":
    facts_get()
    sys.exit(0)
if len(sys.argv) != 2 or sys.argv[1] not in KINDS:
    sys.exit(f"usage: put_data.py {'|'.join(KINDS)}")
name, check = KINDS[sys.argv[1]]
raw = sys.stdin.read(MAX_BYTES + 1)
if len(raw) > MAX_BYTES:
    sys.exit("refused: too large")
try:
    clean = check(json.loads(raw))
except ValueError as e:
    sys.exit(f"refused: {e}")

out = os.path.join(DIR, name)
os.makedirs(DIR, exist_ok=True)
try:
    with open(out, encoding="utf-8") as f:
        if json.load(f) == clean:
            print(f"same ({len(clean)} entries)")
            sys.exit(0)
except (OSError, ValueError):
    pass
with open(out + ".tmp", "w", encoding="utf-8") as f:
    json.dump(clean, f, sort_keys=True, ensure_ascii=False)
os.replace(out + ".tmp", out)
print(f"updated ({len(clean)} entries)")
