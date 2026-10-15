#!/usr/bin/env python3
"""Receive SEO data from the bot (bot-entry.sh "geo" / "destinations", JSON on stdin).

    put_data.py geo            trek map positions        -> data/trek-geo.json      (TREK_GEO_FILE)
    put_data.py destinations   destinations and packages -> data/destinations.json  (DESTINATIONS_FILE)

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
                    "places": [text(p, 150) for p in (d.get("places") or [])[:20]]})
    return out


KINDS = {"geo": ("trek-geo.json", geo), "destinations": ("destinations.json", destinations)}

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
