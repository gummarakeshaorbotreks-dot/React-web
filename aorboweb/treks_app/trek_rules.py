"""Rules every trek must follow before it is saved (admin form, draft publishing).

The website, the SEO bot and Google all read this data, and these mistakes were
found on the live site: "D/2N", "6D/5D", "6N/7D", "3D/4N" durations; states typed
as "karnataka" or copied wrong ("Himachal" for Kedarkantha); lowercase names; two
packages both called "Coorg"; one map point shared by three treks (the state's
centre); a Mathura trip carrying the Kerala trip's description. Each rule below
either tidies the value (normalize_*) or explains what is wrong (ValueError with a
message for the team).
"""
import difflib
import re

STATES = [
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana",
    "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
    "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana",
    "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal", "Andaman and Nicobar Islands", "Chandigarh",
    "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry",
]
OTHER_PLACES = ["Nepal", "Bhutan", "Multiple States"]  # trips that cross borders, or cover many states
STATE_ALIASES = {
    "pondicherry": "Puducherry", "kashmir": "Jammu and Kashmir", "jammu kashmir": "Jammu and Kashmir",
    "jammu-kashmir": "Jammu and Kashmir", "j&k": "Jammu and Kashmir", "tamilnadu": "Tamil Nadu",
    "orissa": "Odisha", "uttaranchal": "Uttarakhand", "new delhi": "Delhi", "andaman": "Andaman and Nicobar Islands",
}
WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
SIMILAR_DESCRIPTION = 0.85  # this similar to another trek's description = copied


def _key(s):
    return re.sub(r"[^a-z&]+", " ", (s or "").lower()).strip()


def normalize_state(text):
    """'karnataka' -> 'Karnataka'; 'Kerala,Tamilnadu' -> 'Kerala, Tamil Nadu'. Unknown names are refused."""
    # Split on commas, slashes and dashes only: "Jammu and Kashmir" is one name.
    parts = [p.strip() for p in re.split(r"[,/–—]", text or "") if p.strip()]
    if not parts:
        raise ValueError("Enter the state (for example: Karnataka).")
    known = {_key(s): s for s in STATES + OTHER_PLACES}
    known.update({_key(a): s for a, s in STATE_ALIASES.items()})
    out = []
    for p in parts:
        name = known.get(_key(p))
        if not name:
            raise ValueError(f"'{p}' is not an Indian state or union territory. Use the official name, "
                             f"for example 'Uttarakhand' or 'Tamil Nadu'; for trips into Nepal add ', Nepal'.")
        if name not in out:
            out.append(name)
    return ", ".join(out)


def normalize_duration(text):
    """'2D/1N,3D/2N' / '3D / 2N' / '2D-1N' / '1D' -> '2D/1N, 3D/2N' (shortest first).

    Refused: a missing number ('D/2N'), nights written as days ('6D/5D') or the other
    way round ('6N/7D'), and more nights than days ('3D/4N'). A trip of N days has
    N-1 nights, or N nights for an overnight start (1D/1N).
    """
    raw = (text or "").strip()
    if not raw:
        raise ValueError("Enter the duration, for example 3D/2N (several options: 2D/1N, 3D/2N).")
    m = re.fullmatch(r"(\d+)\s*days?", raw, re.I)
    if m:
        return f"{int(m.group(1))}D"
    options = []
    for part in [p.strip() for p in raw.split(",") if p.strip()]:
        m = re.fullmatch(r"(\d+)\s*D(?:\s*[/-]\s*(\d+)\s*N)?", part, re.I)
        swapped = re.fullmatch(r"(\d+)\s*N\s*[/-]\s*(\d+)\s*D", part, re.I)
        if swapped:
            raise ValueError(f"'{part}': write days first, then nights: {swapped.group(2)}D/{swapped.group(1)}N.")
        if not m:
            raise ValueError(f"'{part}' is not a duration. Write days first, then nights: 3D/2N (or 1D for a day trip).")
        days, nights = int(m.group(1)), (int(m.group(2)) if m.group(2) is not None else None)
        if days < 1 or days > 60:
            raise ValueError(f"'{part}': days must be between 1 and 60.")
        if nights is not None and not (days - 1 <= nights <= days):
            raise ValueError(f"'{part}': a {days}-day trip has {days - 1} nights ({days}D/{days - 1}N), "
                             f"or {days} for an overnight start. Check the numbers.")
        options.append((days, nights))
    options = sorted(set(options))
    return ", ".join(f"{d}D/{n}N" if n is not None else f"{d}D" for d, n in options)


def normalize_operating_days(text):
    """'THU, FRI, SAT' / 'fri,sat' -> 'Thu, Fri, Sat'. 'Daily' and 'On request' are allowed."""
    raw = (text or "").strip()
    if not raw:
        raise ValueError("Enter the departure days, for example: Fri, Sat.")
    if raw.lower() in ("daily", "on request"):
        return raw.capitalize()
    words = [w for w in re.split(r"[^A-Za-z]+", raw) if w]
    found = set()
    for w in words:
        day = next((d for d in WEEKDAYS if w.lower().startswith(d.lower()) and len(w) >= 3), None)
        if not day:
            raise ValueError(f"'{w}' is not a weekday. Write the departure days like: Thu, Fri, Sat (or Daily).")
        found.add(day)
    return ", ".join(d for d in WEEKDAYS if d in found)


def check_name(name, others):
    """others: {id: name} of the other treks."""
    name = (name or "").strip()
    if not name:
        raise ValueError("Enter the trek name.")
    if name == name.lower():
        raise ValueError(f"Start the name with capitals, for example '{name.title()}'.")
    clash = next((i for i, n in others.items() if (n or "").strip().lower() == name.lower()), None)
    if clash:
        raise ValueError(f"Another trek is already called '{name}' (/{clash}). Make the name say what is "
                         f"different, for example 'Coorg 4-Day Trip'.")
    return name


def check_position(lat, lon, others):
    """others: {id: (lat, lon)} of the other treks. Both empty is fine (the SEO bot finds positions)."""
    if lat is None and lon is None:
        return
    if lat is None or lon is None:
        raise ValueError("Enter both latitude and longitude, or leave both empty.")
    if not (6 <= lat <= 37.5 and 68 <= lon <= 98):
        raise ValueError("This position is outside India and Nepal. Check that latitude (6 to 37) and "
                         "longitude (68 to 97) are not swapped.")
    clash = next((i for i, p in others.items() if p == (lat, lon)), None)
    if clash:
        raise ValueError(f"Trek /{clash} has exactly the same position. Each trek needs its own real "
                         f"position (find it on Google Maps: right-click the place and copy the numbers).")


def check_description(text, others):
    """others: {id: description} of the other treks."""
    text = (text or "").strip()
    if len(text) < 40:
        raise ValueError("Write a description of at least a sentence (40+ characters): what the trip is and "
                         "what you see.")
    for i, other in others.items():
        other = (other or "").strip()
        if other and difflib.SequenceMatcher(None, text[:600].lower(), other[:600].lower()).ratio() >= SIMILAR_DESCRIPTION:
            raise ValueError(f"This description is (almost) the same as trek /{i}'s. Every trek needs its own "
                             f"description.")
    return text
