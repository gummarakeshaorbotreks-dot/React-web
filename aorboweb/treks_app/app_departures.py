"""Real departures from the Aorbo app on the website (30 Oct 2026).

The app publishes its real vendors' bookable departures at
GET https://api.aorbotreks.co.in/api/v1/website/departures (Backend
services/websiteDepartures.js): destination, city, pickup point, time, weekdays,
price, organiser and a booking link. `manage.py sync_app_departures` (hourly)
copies them into TrekDeparture rows with source="app", which feed the
"<destination> trip from <city>" pages. Staff rows (source="manual") are never
touched.

Which website trek page shows which app departure — automatic, by PLACES
(owner, 30 Oct 2026: no manual steps). The app sends each trip's places
(a combined destination keeps them: "Wayanad Munnar Gokarna" -> Wayanad,
Munnar, Gokarna); a website package's places come from its name
("Ooty-Coonoor-Isha Foundation", "Coorg 4-Day Trip" -> Coorg).
  1. A package with exactly the trip's places gets the departure.
  2. No such package: each of the trip's places that has its own one-place
     package gets it, labelled with the real trip ("Wayanad · Munnar · Gokarna"),
     so it is never shown as a different package; with no one-place package,
     the packages that visit one of its places ("Coonoor" -> "Ooty-Coonoor").
  3. A package's "Aorbo app destination IDs" still override, for rare cases.
Places match across spellings ("Munnar Tea Gardens" ~ "Munnar", "Dwaraka" ~
"Dwarka", "Kodagu" ~ "Coorg").

Pure functions only (no Django), so they are tested with plain unittest
(treks_app/test_app_departures.py). The database part is the command.
"""

import re
from datetime import time

from . import trek_rules

FEED_URL = "https://api.aorbotreks.co.in/api/v1/website/departures"


def norm(name):
    """'Gokarna ' / 'gokarna' / 'Go-karna' -> 'gokarna' (letters and digits only)."""
    return re.sub(r"[^a-z0-9]", "", (name or "").lower())


def explicit_ids(text):
    """'12, 40' -> {12, 40}. Anything that is not a number is ignored."""
    return {int(x) for x in re.findall(r"\d+", text or "")}


# Words in package names that are not places.
GENERIC = {"trek", "treks", "trip", "trips", "tour", "tours", "yatra", "package", "packages",
           "day", "days", "night", "nights", "the", "and", "to"}
# Same place, other spelling (normalised).
ALIASES = {
    "kodagu": "coorg", "udhagamandalam": "ooty", "ootacamund": "ooty", "chikmagalur": "chikkamagaluru",
    "chikkamagalur": "chikkamagaluru", "dwaraka": "dwarka", "mysore": "mysuru", "pondicherry": "puducherry",
    "vizag": "visakhapatnam", "bangalore": "bengaluru", "trivandrum": "thiruvananthapuram", "shirdi": "shiridi",
    "leh": "lehladakh", "ladakh": "lehladakh",
}


def place_key(name):
    k = norm(name)
    return ALIASES.get(k, k)


def page_places(name):
    """A website package's places: 'Ooty-Coonoor-Isha Foundation' -> ['ooty', 'coonoor', 'ishafoundation'];
    'Coorg 4-Day Trip' -> ['coorg']; 'Kedarkantha Trek' -> ['kedarkantha']."""
    out = []
    for part in re.split(r"\s*(?:-|,|&|/|and|to)\s*", name or "", flags=re.I):
        words = [w for w in part.split() if w.lower() not in GENERIC and not re.fullmatch(r"\d+", w)]
        if words:
            k = place_key(" ".join(words))
            if k and k not in out:
                out.append(k)
    return out


def same_place(a, b):
    """'munnarteagardens' ~ 'munnar' (one starts with the other, 4+ letters); aliases already applied."""
    if a == b:
        return True
    short, long_ = sorted((a, b), key=len)
    return len(short) >= 4 and long_.startswith(short)


def same_places(trip, page):
    return bool(trip) and bool(page) and all(any(same_place(t, p) for p in page) for t in trip)         and all(any(same_place(p, t) for t in trip) for p in page)


def pages_for(treks, destinations):
    """Which website pages show each app destination's departures.

    treks: [(trek_id, name, app_destination_ids)];
    destinations: {dest_id: [place names]} (from the feed; one place for a single destination).
    Returns {dest_id: [(trek_id, trip_label), ...]} — trip_label is "" for a package with the
    same places, else the real trip ("Wayanad · Munnar · Gokarna") shown on a one-place page.
    """
    pages = [(tid, page_places(name), explicit_ids(ids)) for tid, name, ids in treks]
    out = {}
    for dest_id, names in destinations.items():
        trip = [place_key(n) for n in names if place_key(n)]
        explicit = [tid for tid, _, ids in pages if dest_id in ids]
        if explicit:
            out[dest_id] = [(tid, "") for tid in explicit]
            continue
        exact = [tid for tid, places, ids in pages if not ids and same_places(trip, places)]
        if exact:
            out[dest_id] = [(tid, "") for tid in exact]
            continue
        # No package with the same places: the one-place packages of the trip's places, or
        # failing that the packages that visit one of them — labelled with the real trip.
        label = " · ".join(trek_rules.title_case(n) for n in names)[:200]
        singles = [tid for tid, places, ids in pages
                   if not ids and len(places) == 1 and any(same_place(t, places[0]) for t in trip)]
        visiting = [tid for tid, places, ids in pages
                    if not ids and any(same_place(t, p) for t in trip for p in places)]
        if singles or visiting:
            out[dest_id] = [(tid, label) for tid in (singles or visiting)]
    return out


def parse_time(hhmm):
    m = re.fullmatch(r"(\d{2}):(\d{2})", hhmm or "")
    if not m or int(m.group(1)) > 23 or int(m.group(2)) > 59:
        raise ValueError(f"bad time {hhmm!r}")
    return time(int(m.group(1)), int(m.group(2)))


def to_row(dep):
    """One feed departure -> TrekDeparture fields (the same tidy-up as the admin form).

    Raises ValueError when something can't be shown (the row is skipped).
    """
    price = int(dep.get("priceFrom") or 0)
    if not (100 <= price <= 500000):
        raise ValueError(f"price {price}")
    organiser = re.sub(r"\s+", " ", ((dep.get("organiser") or {}).get("name") or "")).strip()
    if not organiser:
        raise ValueError("no organiser")
    url = dep.get("bookUrl") or ""
    if url and not re.fullmatch(r"https://aorbotreks\.co\.in/t/[A-Za-z0-9]{8}", url):
        url = ""
    return {
        "city": trek_rules.normalize_city((dep.get("city") or {}).get("name")),
        "pickup_point": trek_rules.tidy_pickup(dep.get("pickupPoint")),
        "departure_time": parse_time(dep.get("departureTime")),
        "price_from": price,
        "days": trek_rules.normalize_operating_days(dep.get("days")) if dep.get("days") else "",
        "operator_name": trek_rules.title_case(organiser)[:200],
        "book_url": url,
    }


def app_key(dep_key, trek_id):
    """Stable id of one app departure on one website page."""
    return f"{dep_key}:{trek_id}"[:64]
