"""Ready-to-show text for a trek, sent with the API (`display` on /api/treks/ and
/api/treks/<id>/).

The mobile app shows these strings as they are (owner, 18 Oct 2026: "website lo
changes chesina, kotha APK release cheyalsina avasaram rakunda"). A wording change
is made here, once, and reaches the app without a new app release.

Same rules as the website's aorbo-frontend/src/utils/format.js; both are checked
against the same examples (display_cases.json), so the two can never drift apart.
Durations are always every option in full, never a range like "3-5 days".
"""
import re

WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
_OPTION = re.compile(r"(\d+)\s*D(?:ays?)?\b\s*(?:[/-]\s*(\d+)\s*N(?:ights?)?\b)?", re.I)


def _count(n, word):
    return f"{n} {word}{'' if n == 1 else 's'}"


def _indian(n):
    """1234567 -> '12,34,567' (Indian digit grouping, like toLocaleString('en-IN'))."""
    s = str(int(n))
    if len(s) <= 3:
        return s
    head, tail = s[:-3], s[-3:]
    groups = []
    while len(head) > 2:
        groups.insert(0, head[-2:])
        head = head[:-2]
    if head:
        groups.insert(0, head)
    return ",".join(groups + [tail])


def format_price(value):
    """15000 -> '₹15,000'; None when it isn't a price."""
    try:
        n = float(str(value).replace(",", "").strip())
    except (TypeError, ValueError):
        return None
    if n <= 0:
        return None
    return f"₹{_indian(round(n))}"


def duration_options(value):
    """'3D/2N, 4D/3N' -> ['3 Days / 2 Nights', '4 Days / 3 Nights'] (every option, shortest first)."""
    text = str(value or "").strip()
    if not text:
        return []
    if text.isdigit():
        return [_count(int(text), "Day")]
    options = []
    for m in _OPTION.finditer(text):
        d, n = int(m.group(1)), m.group(2)
        o = f"{_count(d, 'Day')} / {_count(int(n), 'Night')}" if n is not None else _count(d, "Day")
        if o not in options:
            options.append(o)
    if not options:
        return [text]
    return sorted(options, key=lambda o: int(o.split(" ")[0]))


def departure_days(value):
    """'THU, FRI, SAT' / 'fri,sat' -> 'Thu, Fri, Sat' (week order); other text unchanged."""
    text = str(value or "").strip()
    found = set()
    for w in re.split(r"[^a-z]+", text.lower()):
        if len(w) >= 3:
            day = next((d for d in WEEKDAYS if d.lower() == w[:3]), None)
            if day:
                found.add(day)
    return ", ".join(d for d in WEEKDAYS if d in found) if found else text


def trek_display(name, state, price_start, duration_days, operating_days):
    """Everything the app shows for a trek, as text. Only real values: nothing is made up."""
    price = format_price(price_start)
    durations = duration_options(duration_days)
    days = departure_days(operating_days) if (operating_days or "").strip() else ""
    days_list = [d.strip() for d in days.split(",") if d.strip()] if days else []
    location = " · ".join(x for x in [state or "", days] if x)
    facts = []
    if durations:
        facts.append({"key": "duration", "label": "Duration", "options": durations})
    if days_list:
        facts.append({"key": "departure", "label": "Departure", "options": days_list})
    return {
        "price": price,
        "price_label": f"{price} onwards" if price else None,
        "durations": durations,
        "duration_text": ", ".join(durations),
        "days": days,
        # The app's trek card, line by line (top to bottom).
        "card": {
            "kicker": f"{price} onwards" if price else (state or ""),
            "title": name or "",
            "meta": location,
            "description": ", ".join(durations),
        },
        # The app's trek detail screen: the price chip and the rows of pills.
        "detail": {
            "price_label": f"{price} onwards" if price else None,
            "facts": facts,
        },
    }
