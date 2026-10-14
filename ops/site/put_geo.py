#!/usr/bin/env python3
"""Receive trek map positions from the SEO bot (bot-entry.sh "geo", JSON on stdin).

Used by the build for the "Treks near <city>" pages (TREK_GEO_FILE in deploy.sh).
Only a plain {trek id: {lat, lon, source}} object with positions inside India is
accepted; anything else is refused and the current file is kept.
"""
import json
import os
import re
import sys

OUT = "/opt/aorbo-site/data/trek-geo.json"
MAX_BYTES = 2_000_000

raw = sys.stdin.read(MAX_BYTES + 1)
if len(raw) > MAX_BYTES:
    sys.exit("refused: too large")
try:
    data = json.loads(raw)
except ValueError:
    sys.exit("refused: not JSON")
if not isinstance(data, dict) or not data:
    sys.exit("refused: expected a non-empty object")
clean = {}
for tid, v in data.items():
    if not (isinstance(tid, str) and re.fullmatch(r"[A-Za-z0-9._~-]{1,200}", tid) and isinstance(v, dict)):
        sys.exit(f"refused: bad entry {tid!r}")
    lat, lon, src = v.get("lat"), v.get("lon"), v.get("source")
    if not (isinstance(lat, (int, float)) and isinstance(lon, (int, float)) and 6 < lat < 37.5 and 68 < lon < 98):
        sys.exit(f"refused: {tid} is not a position in India")
    clean[tid] = {"lat": float(lat), "lon": float(lon), "source": src if src in ("admin", "osm") else "osm"}

os.makedirs(os.path.dirname(OUT), exist_ok=True)
try:
    with open(OUT, encoding="utf-8") as f:
        if json.load(f) == clean:
            print(f"same ({len(clean)} treks)")
            sys.exit(0)
except (OSError, ValueError):
    pass
with open(OUT + ".tmp", "w", encoding="utf-8") as f:
    json.dump(clean, f, sort_keys=True)
os.replace(OUT + ".tmp", OUT)
print(f"updated ({len(clean)} treks)")
