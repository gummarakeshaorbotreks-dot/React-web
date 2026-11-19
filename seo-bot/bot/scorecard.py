"""Weekly scorecard (Mondays 08:30 IST): is the SEO plan working, in numbers, against its day-90 targets.

SEO plan (19 Nov 2026; Desktop "SEO plan" doc, phases 1-3): by day 90 (17 Feb 2027)
  - 300 clicks a month from Google on searches that don't name us (non-brand),
  - 10 tracked searches in Google's top 10 (radar.py),
  - 80 % of the site's pages shown in Google at least once in 28 days.

The message has: those three against the straight-line target for today; Google clicks and impressions
this week vs last (non-brand), per page family (trek pages, compare, collections, near-town, ...); the
searches that grew most; and what visitors did on the site - clicks on "Book" and "Get the app" by where
they came from and which kind of page they landed on (web server `outclicks`, SearchLog out:* tags).
App installs by source are in the admin portal (Search Demand -> Sources), from the app's install referrer.

Google's numbers lag 2-3 days, so "this week" = the 7 days ending 3 days ago.

    python scorecard.py            send
    python scorecard.py --no-send  print only
"""
import json
import re
import sys
import urllib.parse
from collections import defaultdict
from datetime import date, timedelta

from common import GSC_SITE, SITE, db, esc, google_session, telegram
from sitedeploy import run

PLAN_START, PLAN_DAYS = date(2026, 11, 19), 90
TARGETS = {"nonbrand_clicks_28d": 300, "top10": 10, "shown_share": 0.80}
BRAND = "aorbo"
FAMILIES = [  # path prefix -> name (first match wins)
    ("/compare/", "Compare"), ("/collections", "Collections"), ("/treks-near/", "Treks near town"),
    ("/destinations/", "Destinations"), ("/organisers", "Organisers"), ("/treks/", "Trek pages"),
    ("/trips-from/", "Trips from city"), ("/blogs", "Blog"), ("/", "Home + other"),
]
API = "https://www.googleapis.com/webmasters/v3/sites/{}/searchAnalytics/query"


def family(url):
    path = urllib.parse.urlparse(url).path or "/"
    for prefix, name in FAMILIES:
        if path.startswith(prefix):
            return name
    return "Home + other"


def on_track(value, target, day):
    """Straight line from 0 at day 0 to `target` at day 90 -> (today's target, ahead?)."""
    t = target * min(max(day, 0), PLAN_DAYS) / PLAN_DAYS
    return t, value >= t


def pct_change(now, before):
    if not before:
        return "new" if now else "–"
    d = round(100 * (now - before) / before)
    return f"{'+' if d >= 0 else ''}{d}%"


class Gsc:
    def __init__(self):
        self.s = google_session(["https://www.googleapis.com/auth/webmasters.readonly"])
        self.url = API.format(urllib.parse.quote(GSC_SITE, safe=""))

    def rows(self, start, end, dims, brand=None, limit=5000):
        body = {"startDate": start.isoformat(), "endDate": end.isoformat(), "dimensions": dims, "rowLimit": limit, "dataState": "all"}
        if brand is not None:
            body["dimensionFilterGroups"] = [{"filters": [{"dimension": "query", "operator": "contains" if brand else "notContains",
                                                           "expression": BRAND}]}]
        r = self.s.post(self.url, json=body)
        r.raise_for_status()
        return r.json().get("rows", [])

    def totals(self, start, end, brand=None):
        rows = self.rows(start, end, [], brand)
        return (int(rows[0]["clicks"]), int(rows[0]["impressions"])) if rows else (0, 0)

    def nonbrand(self, start, end):
        """All clicks minus clicks on searches naming us (Google hides rare searches from query filters)."""
        c, i = self.totals(start, end)
        bc, bi = self.totals(start, end, brand=True)
        return c - bc, i - bi


def sitemap_count():
    import urllib.request
    xml = urllib.request.urlopen(urllib.request.Request(f"{SITE}/sitemap.xml", headers={"User-Agent": "AorboSeoBot/1.0"}), timeout=60).read().decode()
    return len(re.findall(r"<loc>", xml))


def ranking_top10():
    try:
        from goals import ranking_counts
        return ranking_counts(db())[0]
    except Exception:  # noqa: BLE001 - radar not run yet
        return 0


def out_clicks():
    code, out = run("outclicks", timeout=120)
    if code != 0:
        return None
    for line in reversed(out.splitlines()):  # Django may print warnings around it
        if line.startswith("{") and '"this"' in line:
            try:
                return json.loads(line)
            except ValueError:
                return None
    return None


def build(today=None):
    today = today or date.today()
    day = (today - PLAN_START).days
    end = today - timedelta(days=3)
    w0, w1 = end - timedelta(days=6), end                       # this week
    p0, p1 = w0 - timedelta(days=7), w0 - timedelta(days=1)    # the week before
    m0 = end - timedelta(days=27)                              # 28 days
    g = Gsc()

    nb_c28, _ = g.nonbrand(m0, end)
    shown = {r["keys"][0] for r in g.rows(m0, end, ["page"])}
    total_pages = sitemap_count()
    share = len(shown) / total_pages if total_pages else 0
    top10 = ranking_top10()

    lines = [f"📊 <b>Weekly scorecard</b> · day {day} of {PLAN_DAYS} · Google data to {end:%d %b}"]
    lines.append("<b>Targets (day 90)</b>")
    for label, value, key, fmt in (("Non-brand clicks, 28 days", nb_c28, "nonbrand_clicks_28d", "{:.0f}"),
                                   ("Tracked searches in top 10", top10, "top10", "{:.0f}"),
                                   ("Pages shown in Google, 28 days", share, "shown_share", "{:.0%}")):
        t, ok = on_track(value, TARGETS[key], day)
        lines.append(f"{'🟢' if ok else '🔴'} {label}: <b>{fmt.format(value)}</b> (today's line {fmt.format(t)}, goal {fmt.format(TARGETS[key])})")
    lines.append(f"   {len(shown)} of {total_pages} pages shown")

    nb_now, nb_before = g.nonbrand(w0, w1), g.nonbrand(p0, p1)
    lines.append("\n<b>Google this week (non-brand)</b>")
    lines.append(f"Clicks {nb_now[0]} ({pct_change(nb_now[0], nb_before[0])}) · shown {nb_now[1]:,} times ({pct_change(nb_now[1], nb_before[1])})")

    fam_now, fam_before = defaultdict(lambda: [0, 0]), defaultdict(lambda: [0, 0])
    for rows, acc in ((g.rows(w0, w1, ["page"]), fam_now), (g.rows(p0, p1, ["page"]), fam_before)):
        for r in rows:
            f = acc[family(r["keys"][0])]
            f[0] += int(r["clicks"])
            f[1] += int(r["impressions"])
    fam_lines = [f"• {name}: {c} click{'' if c == 1 else 's'}, {i:,} shown ({pct_change(i, fam_before[name][1])})"
                 for name, (c, i) in sorted(fam_now.items(), key=lambda x: -x[1][1]) if i]
    if fam_lines:
        lines.append("<b>By page family</b> (all searches)\n" + "\n".join(fam_lines[:9]))

    q_now = {r["keys"][0]: r for r in g.rows(w0, w1, ["query"], brand=False, limit=500)}
    q_before = {r["keys"][0]: r for r in g.rows(p0, p1, ["query"], brand=False, limit=500)}
    grew = sorted(q_now, key=lambda q: -(q_now[q]["impressions"] - q_before.get(q, {}).get("impressions", 0)))[:6]
    if grew:
        lines.append("<b>Searches that grew</b>\n" + "\n".join(
            f"• {esc(q)}: {int(q_now[q]['impressions'])} shown, position {q_now[q]['position']:.0f}"
            + ("" if q in q_before else " (new)") for q in grew))

    oc = out_clicks()
    lines.append("\n<b>On the site this week</b>")
    if oc:
        t, b = oc["this"], oc["before"]
        lines.append(f"Book clicks {t['book']} ({pct_change(t['book'], b['book'])}) · app clicks {t['app']} ({pct_change(t['app'], b['app'])})")
        if t["by_src"]:
            lines.append("From: " + ", ".join(f"{esc(k)} {v}" for k, v in t["by_src"].items()))
        if t["by_land"]:
            lines.append("Landed on: " + ", ".join(f"{esc(k)} {v}" for k, v in t["by_land"].items()))
        if t["trek"]:
            lines.append("Treks: " + ", ".join(f"{esc(k)} {v}" for k, v in list(t["trek"].items())[:5]))
    else:
        lines.append("Clicks not read (web server busy); next week.")
    lines.append("Installs by source: admin portal → Search Demand → Sources.")
    return "\n".join(lines)


def main(argv):
    text = build()
    print(re.sub(r"<[^>]+>", "", text))
    if "--no-send" not in argv:
        telegram(text, silent=True)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
