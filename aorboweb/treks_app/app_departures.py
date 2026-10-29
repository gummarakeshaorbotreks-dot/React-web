"""Real departures from the Aorbo app on the website (30 Oct 2026).

The app publishes its real vendors' bookable departures at
GET https://api.aorbotreks.co.in/api/v1/website/departures (Backend
services/websiteDepartures.js): destination, city, pickup point, time, weekdays,
price, organiser and a booking link. `manage.py sync_app_departures` (hourly)
copies them into TrekDeparture rows with source="app", which feed the
"<destination> trip from <city>" pages. Staff rows (source="manual") are never
touched.

Which website trek page shows which app destination:
  - the page's "Aorbo app destination IDs" (TrekList.app_destination_ids), or
  - when that is empty, the app destination with exactly the page's name
    ("Gokarna" -> "Gokarna"; never a partial match: "Gokarna-Dandeli" is a
    different trip).

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


def pages_for(treks, destinations):
    """Which website pages show each app destination.

    treks: [(trek_id, name, app_destination_ids)]; destinations: {dest_id: name}.
    Returns {dest_id: [trek_id, ...]}.
    """
    by_name = {}
    for dest_id, name in destinations.items():
        by_name.setdefault(norm(name), []).append(dest_id)
    out = {}
    for trek_id, name, ids in treks:
        linked = explicit_ids(ids) or set(by_name.get(norm(name), []))
        for dest_id in linked:
            if dest_id in destinations:
                out.setdefault(dest_id, []).append(trek_id)
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
