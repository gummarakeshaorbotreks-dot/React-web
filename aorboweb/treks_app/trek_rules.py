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


FULL_DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
DAY_TYPOS = {"thr": "Thu", "thurs": "Thu", "thrus": "Thu", "tues": "Tue", "weds": "Wed", "sund": "Sun", "satur": "Sat"}


def _weekday(word):
    """'thu' / 'THURSDAY' / typos like 'thr', 'fir', 'saturdy' -> 'Thu'; None if it isn't a weekday."""
    w = word.lower()
    if w in DAY_TYPOS:
        return DAY_TYPOS[w]
    for d, full in zip(WEEKDAYS, FULL_DAYS):
        if len(w) >= 3 and full.startswith(w):
            return d
    close = difflib.get_close_matches(w, [d.lower() for d in WEEKDAYS] + FULL_DAYS, n=1, cutoff=0.6)
    if close:
        return WEEKDAYS[[d.lower() for d in WEEKDAYS].index(close[0])] if close[0] in [d.lower() for d in WEEKDAYS] \
            else WEEKDAYS[FULL_DAYS.index(close[0])]
    return None


def normalize_operating_days(text):
    """'THU, FRI, SAT' / 'fri,sat' / 'thr,fri' -> 'Thu, Fri, Sat'. 'Daily' and 'On request' are allowed."""
    raw = (text or "").strip()
    if not raw:
        raise ValueError("Enter the departure days, for example: Fri, Sat.")
    if raw.lower() in ("daily", "on request"):
        return raw.capitalize()
    found = set()
    for w in [w for w in re.split(r"[^A-Za-z]+", raw) if w]:
        day = _weekday(w)
        if not day:
            raise ValueError(f"'{w}' is not a weekday. Write the departure days like: Thu, Fri, Sat (or Daily).")
        found.add(day)
    return ", ".join(d for d in WEEKDAYS if d in found)


SMALL_WORDS = {"and", "of", "the", "to", "in", "at", "by", "with", "for", "on", "a", "an", "or", "via", "from"}
UNITS = {"km", "kms", "ft", "m", "hr", "hrs", "min", "mins", "approx"}


def _cap(word):
    return word[:1].upper() + word[1:]


def title_case(text):
    """Every word starts with a capital ('ananthagiri hills' -> 'Ananthagiri Hills', 'gokarna-dandeli' ->
    'Gokarna-Dandeli'); small words stay small inside ('Rajgad to Torna Fort'); words that already have
    capitals are kept (RK, DD, McLeod)."""
    out = []
    for i, word in enumerate(re.split(r"(\s+)", (text or "").strip())):
        if not word.strip():
            out.append(word)
            continue
        parts = re.split(r"([-/(])", word)
        fixed = []
        for p in parts:
            if not p or p in "-/(" or any(c.isupper() for c in p):
                fixed.append(p)
            elif i > 0 and p.lower() in SMALL_WORDS and not fixed:
                fixed.append(p.lower())
            elif p.lower().rstrip(".)") in UNITS:
                fixed.append(p)  # "6 km", "approx." stay small
            else:
                fixed.append(_cap(p))
        out.append("".join(fixed))
    return "".join(out)


def tidy_place(text):
    """Place names are names: 'malpe beach' -> 'Malpe Beach'. Long descriptive entries keep their
    wording ('Rocky slopes and boulder sections'); with an explanation after a dash, only the name part
    ('pratapgad fort – Historic Maratha fort' -> 'Pratapgad Fort – Historic Maratha fort')."""
    text = re.sub(r"\s+", " ", (text or "").strip())
    if not text:
        raise ValueError("Enter the place name.")
    dash = re.search(r"\s[–—-]\s", text)
    if dash:
        name, rest = text[:dash.start()], text[dash.end():]
        return f"{title_case(name)}{dash.group(0)}{_cap(rest.strip())}"
    return title_case(text) if len(text.split()) <= 6 else _cap(text)


def tidy_activities(text):
    """'boating, bonfire & music\\nphotography.' -> 'Boating, Bonfire & music, Photography' (each starts with a capital)."""
    # Split on commas and line breaks (the admin sends "\r\n"); drop empty bits, stray quotes and dots.
    items = [i.strip(" .\t\r\n\"'") for i in re.split(r"[,\r\n]+", text or "")]
    return ", ".join(_cap(i) for i in items if i)


def check_name(name, others):
    """others: {id: name} of the other treks."""
    name = title_case(re.sub(r"\s+", " ", (name or "").strip()))
    if not name:
        raise ValueError("Enter the trek name.")
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
