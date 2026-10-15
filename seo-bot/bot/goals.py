"""The 45-day plan (15 Oct -> 29 Nov 2026): measure every target daily, say what to do today.

Every morning:
  1. Ask Google (URL Inspection API) which sitemap pages are indexed: all pages that
     aren't yet, plus indexed ones not checked for a week (the API allows 2,000 a day).
  2. Measure the targets: pages indexed, impressions and clicks (last 28 days),
     tracked searches in Google's top 10 / top 3 (radar.py), links to us (Bing).
  3. Telegram: each number against today's target (straight line between the
     milestones), and the 10 most important pages Google hasn't indexed, to paste
     into Search Console -> "Request indexing" (Google allows ~10 a day; this is the
     one step only a person can do). Business pages first: destinations, treks,
     then towns. A page isn't suggested again for 4 days.
  Mondays also list the team's tasks for the week.

    python goals.py            daily run
    python goals.py --no-send  measure and print only
"""
import argparse
import json
import re
import sys
import urllib.parse
import urllib.request
from datetime import date, datetime, timedelta

from common import GSC_SITE, SITE, db, esc, google_session, secret, state_get, state_set, telegram

START, END = date(2026, 10, 15), date(2026, 11, 29)
# Day of the plan -> target. Between milestones the target grows in a straight line.
TARGETS = {
    "indexed": {"label": "Pages indexed by Google", 0: 0, 7: 20, 14: 80, 30: 200, 45: 300},
    "impressions": {"label": "Times shown in Google (28 days)", 0: 4, 7: 50, 14: 300, 30: 1500, 45: 3000},
    "clicks": {"label": "Clicks from Google (28 days)", 0: 0, 7: 2, 14: 10, 30: 50, 45: 100},
    "top10": {"label": "Tracked searches in Google's top 10", 0: 1, 7: 2, 14: 4, 30: 12, 45: 25},
    "top3": {"label": "Tracked searches in Google's top 3", 0: 1, 7: 1, 14: 2, 30: 5, 45: 10},
    "links": {"label": "Links to us from other sites (Bing)", 0: 0, 7: 5, 14: 15, 30: 35, 45: 60},
}
TEAM_TASKS = {  # week of the plan -> what people do (the bot can't)
    1: ["Request indexing for the 10 pages in each morning's message (2 minutes)",
        "Put https://aorbotreks.com in the Instagram, Facebook, LinkedIn, X, Quora and Play Store profiles",
        "Get Google Business Profile access from Thejas; hide the address, set Open",
        "Send each organiser their 'Book on Aorbo Treks' link message"],
    2: ["Daily indexing requests", "Organisers add the link on their website / Instagram (follow up)",
        "List Aorbo Treks on JustDial, Startup India, Crunchbase, LinkedIn company page",
        "Publish the first 5 YouTube Shorts (one per destination, page link in the description)"],
    3: ["Daily indexing requests", "Pitch the Aorbo story to YourStory / Inc42",
        "5 more YouTube Shorts", "Answer 5 real Quora / Reddit questions about treks, with the matching page"],
    4: ["Daily indexing requests", "5 more YouTube Shorts", "5 more Quora / Reddit answers",
        "Ask happy trekkers to share their trip page"],
    5: ["Daily indexing requests", "Last 5 YouTube Shorts (20 in total)", "Follow up organisers without a link yet"],
    6: ["Daily indexing requests", "Review the 45-day report with the team; plan the next 45 days"],
    7: ["Final week: daily indexing requests, review the numbers on 29 Nov"],
}
INSPECT = "https://searchconsole.googleapis.com/v1/urlInspection/index:inspect"
SUGGEST_PER_DAY = 10
SUGGEST_AGAIN_DAYS = 4
RECHECK_INDEXED_DAYS = 7
CHECKS_PER_DAY = 200


def target(key, day):
    points = sorted((d, v) for d, v in TARGETS[key].items() if isinstance(d, int))
    for (d0, v0), (d1, v1) in zip(points, points[1:]):
        if d0 <= day <= d1:
            return round(v0 + (v1 - v0) * (day - d0) / (d1 - d0))
    return points[-1][1]


def sitemap_urls():
    xml = urllib.request.urlopen(urllib.request.Request(f"{SITE}/sitemap.xml", headers={"User-Agent": "AorboSeoBot/1.0"}),
                                 timeout=60).read().decode()
    return re.findall(r"<loc>([^<]+)</loc>", xml)


def priority(url):
    """Business pages first: home and lists, destinations, treks, then town pages."""
    path = url[len(SITE):] or "/"
    exact = {"/": 0, "/destinations": 1, "/organisers": 1, "/treks-near": 1, "/about": 1}
    if path in exact:
        return exact[path]
    for prefix, rank in (("/destinations/", 2), ("/organisers/", 2), ("/treks/", 3), ("/treks-near/", 4), ("/blogs/", 5)):
        if path.startswith(prefix):
            return rank
    return 6


def inspect_pages(con, urls):
    con.execute("""CREATE TABLE IF NOT EXISTS page_index (
        url TEXT PRIMARY KEY, verdict TEXT, coverage TEXT, last_crawl TEXT, checked TEXT)""")
    known = {u: (v, c) for u, v, c in con.execute("SELECT url, verdict, checked FROM page_index")}
    recheck_before = (date.today() - timedelta(days=RECHECK_INDEXED_DAYS)).isoformat()
    today = date.today().isoformat()
    todo = [u for u in urls if u not in known or known[u][0] != "PASS" or known[u][1] < recheck_before]
    todo = [u for u in todo if known.get(u, (None, ""))[1] != today]  # once a day is enough
    # Never-checked pages first, then the longest-unchecked: each check takes a few seconds,
    # so ~200 a day keeps the run short and still covers every page every two days.
    todo.sort(key=lambda u: known.get(u, (None, ""))[1])
    s = google_session(["https://www.googleapis.com/auth/webmasters.readonly"])
    for n, u in enumerate(todo[:CHECKS_PER_DAY], 1):
        if n % 25 == 0:
            con.commit()  # keep what's done if the run is cut short
        r = s.post(INSPECT, json={"inspectionUrl": u, "siteUrl": GSC_SITE})
        if r.status_code == 429:
            break  # daily quota: carry on tomorrow
        if not r.ok:
            continue
        res = r.json().get("inspectionResult", {}).get("indexStatusResult", {})
        con.execute("INSERT OR REPLACE INTO page_index VALUES (?,?,?,?,?)",
                    (u, res.get("verdict"), res.get("coverageState"), res.get("lastCrawlTime"), today))
    con.commit()
    live = set(urls)
    return {u: (v, c) for u, v, c in con.execute("SELECT url, verdict, coverage FROM page_index") if u in live}


def search_totals():
    s = google_session(["https://www.googleapis.com/auth/webmasters.readonly"])
    body = {"startDate": (date.today() - timedelta(days=28)).isoformat(), "endDate": date.today().isoformat(),
            "dimensions": [], "dataState": "all"}
    rows = s.post(f"https://www.googleapis.com/webmasters/v3/sites/{urllib.parse.quote(GSC_SITE, safe='')}"
                  f"/searchAnalytics/query", json=body).json().get("rows", [])
    return (int(rows[0]["impressions"]), int(rows[0]["clicks"])) if rows else (0, 0)


def ranking_counts(con):
    """Latest position of every search the radar tracks."""
    try:
        rows = con.execute("""SELECT s.position FROM serp s JOIN (SELECT keyword, city, MAX(run) AS run FROM serp
                              GROUP BY keyword, city) l ON s.keyword=l.keyword AND s.city=l.city AND s.run=l.run""").fetchall()
    except Exception:  # noqa: BLE001 - radar hasn't run yet
        return 0, 0
    pos = [p for (p,) in rows if p]
    return sum(p <= 10 for p in pos), sum(p <= 3 for p in pos)


def link_count():
    url = (f"https://ssl.bing.com/webmaster/api.svc/json/GetLinkCounts?apikey={secret('bing-webmaster-api-key')}"
           f"&siteUrl={urllib.parse.quote(SITE + '/')}&page=0")
    try:
        d = json.load(urllib.request.urlopen(url, timeout=60)).get("d") or {}
        return sum(int(x.get("Count", 0)) for x in d.get("Links", []))
    except Exception:  # noqa: BLE001 - Bing busy: report as unknown
        return None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--no-send", action="store_true")
    a = ap.parse_args()
    day = max(0, (date.today() - START).days)
    con = db()
    urls = sitemap_urls()
    status = inspect_pages(con, urls)
    indexed = sum(1 for v, _ in status.values() if v == "PASS")
    impressions, clicks = search_totals()
    top10, top3 = ranking_counts(con)
    links = link_count()
    values = {"indexed": indexed, "impressions": impressions, "clicks": clicks, "top10": top10, "top3": top3, "links": links}
    con.execute("CREATE TABLE IF NOT EXISTS goals_daily (day TEXT PRIMARY KEY, values_json TEXT)")
    con.execute("INSERT OR REPLACE INTO goals_daily VALUES (?,?)", (date.today().isoformat(), json.dumps(values)))
    con.commit()

    lines = [f"🎯 <b>45-day SEO plan: day {day} of 45</b> (finish {END:%d %b})", ""]
    for key, val in values.items():
        want, final = target(key, day), TARGETS[key][45]
        mark = "➖" if val is None else ("✅" if val >= want else "⚠️")
        shown = "?" if val is None else f"{val:,}"
        lines.append(f"{mark} {TARGETS[key]['label']}: <b>{shown}</b> (today's target {want:,}; by {END:%d %b}: {final:,})")

    asked = state_get("index_requests", {})
    again = (date.today() - timedelta(days=SUGGEST_AGAIN_DAYS)).isoformat()
    waiting = sorted((u for u in urls if status.get(u, (None,))[0] != "PASS" and asked.get(u, "") < again),
                     key=lambda u: (priority(u), urls.index(u)))[:SUGGEST_PER_DAY]
    if waiting:
        lines += ["", f"📋 <b>Today's {len(waiting)} pages for Google</b> ({len(urls) - indexed} not indexed yet). In "
                  "Search Console, paste each one into the top box, press Enter, then click REQUEST INDEXING:"]
        lines += [f"{i}. {esc(u)}" for i, u in enumerate(waiting, 1)]
        if not a.no_send:  # a test run must not mark pages as already sent
            for u in waiting:
                asked[u] = date.today().isoformat()
            state_set("index_requests", asked)
    if date.today().weekday() == 0 or day == 0:
        week = min(7, day // 7 + 1)
        lines += ["", f"👥 <b>Team tasks, week {week}</b>:"] + [f"• {t}" for t in TEAM_TASKS[week]]
    msg = "\n".join(lines)
    if not a.no_send:
        telegram(msg)
    print(msg)
    return 0


if __name__ == "__main__":
    sys.exit(main())
