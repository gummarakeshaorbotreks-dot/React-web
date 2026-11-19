"""Road data for the route guides (/routes/<city>-to-<trek>, SEO plan phase 3, 19 Nov 2026).

Each site build lists the city -> trek pairs a route guide could have (https://aorbotreks.com/data/road-candidates.json,
aorbo-frontend/scripts/road-pages.mjs). For every pair without road data (or with data older than 120 days)
this asks OSRM - free OpenStreetMap routing, public server router.project-osrm.org, max 1 request a second
under its usage policy - for the car route: distance, driving time, main roads, and how far the trek point
is from the nearest road (the build drops a pair whose trek point is over 5 km off a road). Saved on the web
server (SSH "roads" -> data/road-routes.json, put_data.py checks it); then one rebuild if anything changed.

    python roads.py              fetch missing pairs, save, rebuild
    python roads.py --no-deploy  fetch and save only
"""
import json
import sys
import time
import urllib.request
from datetime import date, timedelta

from common import SITE, USER_AGENT, esc, telegram
from sitedeploy import SSH, deploy, run

OSRM = "https://router.project-osrm.org/route/v1/driving/{a[1]},{a[0]};{b[1]},{b[0]}?overview=false&steps=true"
MAX_PER_RUN = 120
PAUSE = 1.2
REFRESH_DAYS = 120


def get_json(url, timeout=60):
    return json.load(urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": USER_AGENT}), timeout=timeout))


def road_of(answer, today):
    """OSRM's answer -> {km, min, via, snap_km, at}, or None when it found no route (pure; tested)."""
    if (answer or {}).get("code") != "Ok" or not answer.get("routes"):
        return None
    r = answer["routes"][0]
    legs = r.get("legs") or [{}]
    snap = max((w.get("distance") or 0) for w in answer.get("waypoints") or [{}]) / 1000
    return {"km": round(r["distance"] / 1000, 1), "min": round(r["duration"] / 60), "via": (legs[0].get("summary") or "")[:120],
            "snap_km": round(snap, 2), "at": today}


def todo_pairs(candidates, current, today, limit=MAX_PER_RUN):
    """Pairs with no road data, or data older than REFRESH_DAYS (pure; tested)."""
    old = (date.fromisoformat(today) - timedelta(days=REFRESH_DAYS)).isoformat()
    return [c for c in candidates if c["key"] not in current or (current[c["key"]].get("at") or "") < old][:limit]


def main(argv):
    today = date.today().isoformat()
    candidates = get_json(f"{SITE}/data/road-candidates.json").get("pairs", [])
    code, out = run("roads-get", timeout=60)
    current = json.loads(out or "{}").get("pairs", {}) if code == 0 else {}
    todo = todo_pairs(candidates, current, today)
    got, failed = 0, 0
    for c in todo:
        try:
            road = road_of(get_json(OSRM.format(a=c["from"], b=c["to"]), timeout=30), today)
        except Exception as e:  # noqa: BLE001 - busy server: next run
            print("osrm:", c["key"], e.__class__.__name__)
            failed += 1
            time.sleep(5)
            continue
        if road:
            current[c["key"]] = road
            got += 1
        time.sleep(PAUSE)
    print(f"candidates {len(candidates)}, fetched {got}, failed {failed}, saved {len(current)}")
    if not got:
        return 0
    import subprocess
    p = subprocess.run(SSH + ["roads"], input=json.dumps({"pairs": current}), capture_output=True, text=True, timeout=120)
    print(p.stdout.strip(), p.stderr.strip()[:300])
    if p.returncode != 0:
        telegram(f"🛣 Route data not saved: {esc(p.stdout + p.stderr)[:300]}")
        return 1
    if "--no-deploy" not in argv:
        code, out = deploy(f"route guides: road data for {got} new pair(s)", notify=False)
        print(out[-600:])
    telegram(f"🛣 <b>Route guides</b>: road data for {got} new city→trek pair(s) ({len(current)} in all)."
             + (f" {failed} not answered, next run." if failed else ""), silent=True)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
