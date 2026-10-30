"""Destinations for the "<destination> trips & treks" pages (/destinations/<slug>).

People search the place, not the package: "coorg trip", "manali trek package",
"gokarna", "kedarnath". A package often covers several places ("Gokarna-Dandeli-
Murudeshwar"), and one place is in many packages. This works out which packages
visit which destination:
  1. Gemini reads every package (name, state, famous places) in batches and lists the
     destinations it visits, using the name people search ("Coorg", not "Kodagu").
     A destination the package's own name and places never mention is checked once
     more and dropped unless confirmed (Gemini once put the Kedarnath yatra under
     Kedarkantha: similar name, different place).
  2. One more Gemini call merges spellings of the same place into one destination
     ("Ooty" / "Udhagamandalam", "Chikmagalur" / "Chikkamagaluru").
  3. Each destination gets a map position the same way as treks (trek_geo.locate:
     OpenStreetMap, checked against Gemini's estimate); whole regions have none.
  4. States with 3+ packages get a state page ("Treks & trips in Kerala"), which also
     replaces Gemini's whole-region destinations ("Kerala", "Kashmir").
Only package ids that really exist are kept. The result goes to the web server (SSH
command "destinations") and the build makes a page for every destination with at
least 2 packages; one package alone is already its own trek page. A page once
published keeps its address while it has a package left ("keep"), so a package
leaving never turns an indexed page into a 404.

    python destinations.py            rebuild (when packages changed) + send
    python destinations.py --show     print the destinations
"""
import argparse
import ast
import json
import re
import subprocess
import sys

from ai import generate_json
from common import SITE, state_get, state_set
from content_sync import all_pages
from sitedeploy import SSH
from trek_geo import locate

BATCH = 30
PLACEHOLDERS = re.compile(r"update soon|aorbo certified|to be (added|updated)|^n/?a$|^tbd$", re.I)


def slugify(s):
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")


def as_list(v):
    """famous_places / activities come as a list or as the text of a Python list."""
    if isinstance(v, list):
        return [str(x).strip() for x in v if str(x).strip()]
    if isinstance(v, str) and v.strip().startswith("["):
        try:
            return [str(x).strip() for x in ast.literal_eval(v) if str(x).strip()]
        except (ValueError, SyntaxError):
            return []
    return [v.strip()] if isinstance(v, str) and v.strip() else []


def detail(tid):
    import urllib.parse
    import urllib.request
    req = urllib.request.Request(f"{SITE}/api/treks/{urllib.parse.quote(tid)}/", headers={"User-Agent": "AorboSeoBot/1.0"})
    return json.load(urllib.request.urlopen(req, timeout=60))


def packages():
    out = []
    for t in {t["id"]: t for t in all_pages("/api/treks/") if t.get("id")}.values():
        try:
            d = detail(t["id"])
        except Exception:  # noqa: BLE001 - list data is enough to name destinations
            d = t
        out.append({"id": t["id"], "name": t["name"], "state": t.get("state") or "",
                    "places": as_list(d.get("famous_places"))[:12],
                    "operators": [o for o in as_list(d.get("operators")) if not PLACEHOLDERS.search(o)]})
    return out


def destinations_per_package(pkgs):
    schema = {"type": "object", "properties": {"packages": {"type": "array", "items": {"type": "object", "properties": {
        "id": {"type": "string"}, "destinations": {"type": "array", "items": {"type": "string"}}},
        "required": ["id", "destinations"]}}}, "required": ["packages"]}
    found = {}
    for i in range(0, len(pkgs), BATCH):
        batch = pkgs[i:i + BATCH]
        prompt = (
            "Trek / trip packages on an Indian travel site (id, name, state, famous places it visits). For each, "
            "list the travel DESTINATIONS it covers - the place names people type into Google when planning a "
            "trip: towns, hill stations, treks, peaks, valleys, beaches, waterfalls, pilgrim places (e.g. "
            "'Coorg', 'Chikmagalur', 'Gokarna', 'Dandeli', 'Murudeshwar', 'Manali', 'Kasol', 'Kheerganga', "
            "'Kedarnath', 'Spiti Valley', 'Araku Valley', 'Ooty', 'Lonavala', 'Goa', 'Kerala'). Use the most "
            "common English spelling people search. A package named after a whole state or region may list it "
            "('Kerala', 'Kashmir', 'Rajasthan'). Do NOT list small sights inside a destination (a temple, "
            "a viewpoint, a lake in a town) - list the destination instead. 1-5 destinations per package. "
            "Only places the package really visits (from its name and places).\n\n"
            + json.dumps([{k: p[k] for k in ("id", "name", "state", "places")} for p in batch], ensure_ascii=False))
        for row in generate_json(prompt, schema, temperature=0.1).get("packages", []):
            found[row["id"]] = [d.strip() for d in row.get("destinations", []) if d.strip()]
    return found


def norm(s):
    return re.sub(r"[^a-z0-9]", "", s.lower())


def named_in(pkg, spellings):
    """True when the package's own name, state or places name the destination (any spelling)."""
    text = norm(" ".join([pkg["name"], pkg["state"]] + pkg["places"]))
    return any(norm(s) and norm(s) in text for s in spellings)


def verdicts(pairs):
    """{(package id, destination): visits?} for the pairs Gemini answered. Small batches:
    in batches of 20+ it said "no" to Hadimba Temple -> Manali."""
    schema = {"type": "object", "properties": {"answers": {"type": "array", "items": {"type": "object", "properties": {
        "n": {"type": "integer"}, "visits": {"type": "boolean"}}, "required": ["n", "visits"]}}}, "required": ["answers"]}
    out = {}
    for i in range(0, len(pairs), 8):
        batch = pairs[i:i + 8]
        prompt = (
            "Each item is a trip package on an Indian travel site (name, state, places it visits) and a destination "
            "it was said to visit. Judging ONLY from its name and places, does the package really go to that "
            "destination? Yes when it is named differently but the same place, or a listed place is in or right next "
            "to it (Tadiandamol -> Coorg, Dal Lake -> Srinagar, Borra Caves -> Araku Valley). No for a different place "
            "with a similar name (Kedarnath is not Kedarkantha), or a place merely in the same region that none of "
            "its places are at.\n\n" + json.dumps(
                [{"n": n, "package": p["name"], "state": p["state"], "places": p["places"], "destination": d}
                 for n, (p, d) in enumerate(batch)], ensure_ascii=False))
        for a in generate_json(prompt, schema, temperature=0.1).get("answers", []):
            if isinstance(a.get("visits"), bool) and 0 <= a.get("n", -1) < len(batch):
                p, d = batch[a["n"]]
                out[(p["id"], d)] = a["visits"]
    return out


def confirm(pairs):
    """pairs: [(package, destination)] the package's text never names. Returns (to drop,
    unanswered): a pair is dropped only when asked twice, separately, and "no" both times."""
    first = verdicts(pairs)
    no = [(p, d) for p, d in pairs if first.get((p["id"], d)) is False]
    second = verdicts(no) if no else {}
    drop = {k for k, v in second.items() if v is False}
    unanswered = {(p["id"], d) for p, d in pairs if (p["id"], d) not in first or (first[(p["id"], d)] is False
                                                                              and (p["id"], d) not in second)}
    return drop, unanswered


def drop_unconfirmed(cache, by_id, canonical):
    """Checks, once per package, the destinations its own text never names (see confirm).
    A package with an unanswered pair keeps it and is checked again next run."""
    spellings = {}
    for k, v in canonical.items():
        spellings.setdefault(v.lower(), {v}).add(k)
    todo = [pid for pid, v in cache.items() if pid in by_id and not v.get("checked")]
    pairs = [(by_id[pid], d) for pid in todo for d in cache[pid]["dests"]
             if not named_in(by_id[pid], spellings.get(canonical.get(d.lower(), d).lower(), set()) | {d})]
    drops, unanswered = confirm(pairs) if pairs else (set(), set())  # a Gemini failure raises: next run
    for pid in todo:
        drop = {d for i, d in drops if i == pid}
        if drop:
            print("dropped (not in the package):", by_id[pid]["name"], "->", ", ".join(sorted(drop)))
        cache[pid] = {**cache[pid], "dests": [d for d in cache[pid]["dests"] if d not in drop],
                      "checked": not any(i == pid for i, _ in unanswered)}
    return cache


def merge_names(names):
    """{spelling: canonical name} for every name Gemini used."""
    schema = {"type": "object", "properties": {"groups": {"type": "array", "items": {"type": "object", "properties": {
        "name": {"type": "string"}, "spellings": {"type": "array", "items": {"type": "string"}},
        "state": {"type": "string"}, "kind": {"type": "string", "enum": ["place", "region"]}},
        "required": ["name", "spellings", "state", "kind"]}}}, "required": ["groups"]}
    prompt = (
        "These destination names were collected from trip packages in India. Group names that mean the SAME "
        "place ('Ooty' and 'Udhagamandalam'; 'Coorg', 'Kodagu' and 'Madikeri' as Coorg; 'Chikmagalur' and "
        "'Chikkamagaluru'; 'Alleppey' and 'Alappuzha'). Do not merge different places that are merely close "
        "(Manali and Kasol stay separate). For each group: name = the spelling most people search in Google, "
        "spellings = every input name in the group, state = Indian state / UT (or the main one), kind = "
        "'region' for a whole state or large region (Kerala, Himalayas, Kashmir, Rajasthan, Spiti is a place), "
        "else 'place'. Every input name must appear in exactly one group.\n\n" + json.dumps(sorted(names), ensure_ascii=False))
    canonical, info = {}, {}
    for g in generate_json(prompt, schema, temperature=0.1).get("groups", []):
        for s in g["spellings"] + [g["name"]]:
            canonical[s.strip().lower()] = g["name"].strip()
        info[g["name"].strip()] = {"state": g["state"].strip(), "kind": g["kind"]}
    for n in names:  # anything Gemini dropped stays its own destination
        canonical.setdefault(n.lower(), n)
        info.setdefault(canonical[n.lower()], {"state": "", "kind": "place"})
    return canonical, info


def build():
    pkgs = packages()
    by_id = {p["id"]: p for p in pkgs}
    # Remembered answers keep page addresses stable: a package is re-read only when renamed,
    # and a destination's chosen spelling never changes once decided.
    cache = state_get("dest_pkg_cache", {})
    todo = [p for p in pkgs if cache.get(p["id"], {}).get("name") != p["name"]]
    if todo:
        for pid, ds in destinations_per_package(todo).items():
            if pid in by_id:
                cache[pid] = {"name": by_id[pid]["name"], "dests": ds}
        state_set("dest_pkg_cache", cache)
    if any(pid in by_id and not v.get("checked") for pid, v in cache.items()):
        cache = drop_unconfirmed(cache, by_id, state_get("dest_canonical", {}))
        state_set("dest_pkg_cache", cache)
    # Pages already published (also those sent before this list was kept).
    published = set(state_get("dest_published", [])) | {
        d["slug"] for d in state_get("destinations", []) if len(d["treks"]) >= (MIN_STATE_PACKAGES if d["kind"] == "state" else 2)}
    per_pkg ={pid: v["dests"] for pid, v in cache.items() if pid in by_id}
    canonical, info = state_get("dest_canonical", {}), state_get("dest_info", {})
    new_names = {d for ds in per_pkg.values() for d in ds if d.lower() not in canonical}
    if new_names:
        c2, i2 = merge_names(new_names | set(info))  # known destinations anchor the new spellings
        for k, v in c2.items():
            canonical.setdefault(k, v)
        for k, v in i2.items():
            info.setdefault(k, v)
        state_set("dest_canonical", canonical)
        state_set("dest_info", info)
    dests = {}
    for pid, ds in per_pkg.items():
        if pid not in by_id:
            continue  # Gemini may echo an id wrongly: only real packages count
        for d in dict.fromkeys(canonical[x.lower()] for x in ds):
            dests.setdefault(d, []).append(pid)
    cached = state_get("destination_positions", {})
    out = []
    for name, ids in sorted(dests.items(), key=lambda kv: (-len(kv[1]), kv[0])):
        meta = info.get(name, {"state": "", "kind": "place"})
        states = {by_id[i]["state"] for i in ids if by_id[i]["state"]}
        state = meta["state"] or (states.pop() if len(states) == 1 else "")
        places = list(dict.fromkeys(pl for i in ids for pl in by_id[i]["places"]))[:20]
        pos = None
        if meta["kind"] == "place" and (len(ids) >= 2 or slugify(name) in published):  # only destinations with a page
            key = f"{name}|{state}"
            if key not in cached:
                try:
                    plan = generate_json(
                        f"Indian travel destination '{name}' ({state}). Give its map position estimate and district.",
                        {"type": "object", "properties": {"approx_lat": {"type": "number"}, "approx_lon": {"type": "number"},
                                                          "district": {"type": "string"}},
                         "required": ["approx_lat", "approx_lon", "district"]}, temperature=0.1)
                    lat, lon, _ = locate({"state": state}, {"kind": "place", "lookup": name, "other_names": [],
                                                            "state": state, **plan})
                    cached[key] = [lat, lon] if lat is not None else None
                except Exception as e:  # noqa: BLE001 - no position: the page just has no distances
                    print("position failed:", name, e)
                    cached[key] = None
                state_set("destination_positions", cached)
            pos = cached.get(key)
        if any(d["slug"] == slugify(name) for d in out):
            continue  # two spellings Gemini didn't merge: the bigger one (sorted first) keeps the address
        out.append({"slug": slugify(name), "name": name, "state": state, "kind": meta["kind"],
                    "lat": pos[0] if pos else None, "lon": pos[1] if pos else None,
                    "treks": ids, "places": places})
    out = with_states(out, pkgs, published)
    for d in out:
        d["keep"] = d["slug"] in published and len(d["treks"]) >= 1
    published |= {d["slug"] for d in out if len(d["treks"]) >= (MIN_STATE_PACKAGES if d["kind"] == "state" else 2)}
    state_set("dest_published", sorted(published))
    return keep_local_places(out)


STATES = ["Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana",
          "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
          "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana",
          "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal", "Andaman and Nicobar Islands", "Chandigarh",
          "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry"]
STATE_ALIASES = {"pondicherry": "puducherry", "jammukashmir": "jammuandkashmir", "kashmir": "jammuandkashmir",
                 "orissa": "odisha", "uttaranchal": "uttarakhand"}
MIN_STATE_PACKAGES = 3


def states_of(text):
    """Official states named in a package's free-text state ("Kerala,Tamilnadu", "karnataka", "Kashmir")."""
    t = re.sub(r"[^a-z]", "", (text or "").lower())
    for a, b in STATE_ALIASES.items():
        if a in t and b not in t:
            t = t.replace(a, b)
    return [s for s in STATES if re.sub(r"[^a-z]", "", s.lower()) in t]


def with_states(dests, pkgs, published=frozenset()):
    """Adds a page per state ("Treks & trips in Kerala"); whole-region destinations from Gemini
    ("Kerala", "Kashmir") are dropped, the state page covers them. A published state page stays
    while it has a package."""
    per_state = {}
    for p in pkgs:
        for s in states_of(p["state"]):
            per_state.setdefault(s, []).append(p["id"])
    by_id = {p["id"]: p for p in pkgs}
    out = [d for d in dests if d["kind"] != "region"]
    taken = {d["slug"] for d in out}
    for s, ids in sorted(per_state.items()):
        slug = slugify(s) if slugify(s) not in taken else f"{slugify(s)}-state"
        if len(ids) < MIN_STATE_PACKAGES and slug not in published:
            continue
        out.append({"slug": slug, "name": s, "state": s, "kind": "state", "lat": None, "lon": None, "treks": ids,
                    "places": list(dict.fromkeys(pl for i in ids for pl in by_id[i]["places"]))[:20]})
    return out


def keep_local_places(dests):
    """The admin's famous places are sometimes copy-pasted from another package (a Spiti
    package listed "Kedarnath Trek"). Keep only places really in or near each destination."""
    cache = state_get("dest_places_cache", {})
    schema = {"type": "object", "properties": {"destinations": {"type": "array", "items": {"type": "object", "properties": {
        "slug": {"type": "string"}, "keep": {"type": "array", "items": {"type": "string"}}},
        "required": ["slug", "keep"]}}}, "required": ["destinations"]}
    todo = [d for d in dests if (len(d["treks"]) >= 2 or d.get("keep")) and d["places"]
            and cache.get(d["slug"], {}).get("from") != d["places"]]
    for i in range(0, len(todo), 15):
        batch = todo[i:i + 15]
        prompt = ("For each travel destination in India, keep only the listed places that are really in or near "
                  "that destination (for a state: in that state). Drop places that belong elsewhere (e.g. "
                  "'Kedarnath Trek' listed for Spiti Valley) and vague ones ('Himachal Trails', 'Spiti Route'). "
                  "Copy kept names exactly as given.\n\n" + json.dumps(
                      [{"slug": d["slug"], "destination": d["name"], "state": d["state"], "places": d["places"]}
                       for d in batch], ensure_ascii=False))
        try:
            answer = {x["slug"]: x["keep"] for x in generate_json(prompt, schema, temperature=0.1).get("destinations", [])}
        except Exception as e:  # noqa: BLE001 - keep the unfiltered list until the next run
            print("place filter failed:", e)
            break
        for d in batch:
            if d["slug"] in answer:
                cache[d["slug"]] = {"from": d["places"], "keep": [p for p in d["places"] if p in answer[d["slug"]]]}
        state_set("dest_places_cache", cache)
    for d in dests:
        c = cache.get(d["slug"])
        if c and c["from"] == d["places"]:
            d["places"] = c["keep"]
    return dests


def push(dests):
    digest = json.dumps(dests, sort_keys=True)
    if digest == state_get("destinations_pushed"):
        return False
    p = subprocess.run(SSH + ["destinations"], input=digest, capture_output=True, text=True, timeout=120)
    if p.returncode != 0:
        raise RuntimeError(f"destinations upload failed: {(p.stdout + p.stderr).strip()[:300]}")
    state_set("destinations_pushed", digest)
    return True


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--show", action="store_true")
    ap.add_argument("--no-push", action="store_true")
    a = ap.parse_args()
    if a.show:
        for d in state_get("destinations", []):
            print(f"{len(d['treks']):3} {d['name']} ({d['state']}, {d['kind']}) {d['lat']},{d['lon']}")
        return 0
    dests = build()
    state_set("destinations", dests)
    with_page = [d for d in dests if len(d["treks"]) >= 2]
    print(f"{len(dests)} destinations, {len(with_page)} with 2+ packages")
    if not a.no_push:
        print("web server", "updated" if push(dests) else "already up to date")
    return 0


if __name__ == "__main__":
    sys.exit(main())
