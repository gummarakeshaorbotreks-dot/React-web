"""Daily Google Search Console pull: store search data, track indexing, report movement.

1. Search Analytics (query x page) for each day not yet stored (Google's data lags 2-3 days).
2. Sitemap status and URL Inspection for the key pages (indexed or not, last crawl).
3. Telegram: clicks/impressions/position vs the previous 7 days, big position moves,
   new searches in the top 10, key pages not indexed.
"""
import sys
import urllib.parse
from datetime import date, timedelta

from common import GSC_SITE, SITE, db, esc, telegram

SCOPES = ["https://www.googleapis.com/auth/webmasters"]
API = "https://www.googleapis.com/webmasters/v3"
INSPECT = "https://searchconsole.googleapis.com/v1/urlInspection/index:inspect"
KEY_PAGES = ["/", "/about", "/safety", "/blogs", "/contact"]
MOVE = 3.0          # positions; smaller moves are noise
MIN_IMPRESSIONS = 5


def search_rows(s, day):
    rows, start = [], 0
    while True:
        r = s.post(f"{API}/sites/{urllib.parse.quote(GSC_SITE, safe='')}/searchAnalytics/query", json={
            "startDate": day, "endDate": day, "dimensions": ["query", "page"], "rowLimit": 25000, "startRow": start})
        r.raise_for_status()
        batch = r.json().get("rows", [])
        rows += batch
        if len(batch) < 25000:
            return rows
        start += 25000


def main():
    from common import google_session, state_get, state_set
    s = google_session(SCOPES)
    con = db()
    stored = {d for (d,) in con.execute("SELECT DISTINCT date FROM gsc_daily")}
    # Days that came back empty and are old enough to be final (Google lags 2-3 days): don't ask again.
    empty_final = set(state_get("gsc_empty_final_days", []))
    stored |= empty_final
    latest = date.today() - timedelta(days=2)
    new_days = []
    for back in range(16, -1, -1):  # backfill up to ~16 days, Search Console keeps 16 months
        day = (latest - timedelta(days=back)).isoformat()
        if day in stored:
            continue
        rows = search_rows(s, day)
        if not rows:
            if back >= 2:
                empty_final.add(day)
            continue  # nothing yet; recent days are asked again tomorrow
        con.executemany("INSERT OR REPLACE INTO gsc_daily VALUES (?,?,?,?,?,?,?)",
                        [(day, r["keys"][0], r["keys"][1], r["clicks"], r["impressions"], r["ctr"], r["position"]) for r in rows])
        new_days.append((day, len(rows)))
    con.commit()
    state_set("gsc_empty_final_days", sorted(d for d in empty_final if d >= (date.today() - timedelta(days=30)).isoformat()))

    # Sitemap + indexing of key pages
    sm = s.get(f"{API}/sites/{urllib.parse.quote(GSC_SITE, safe='')}/sitemaps").json().get("sitemap", [])
    sm_line = "; ".join(f"{x.get('path', '').replace(SITE, '')}: {'pending' if x.get('isPending') else 'read'}, "
                        f"{x.get('errors', '0')} errors, {x.get('warnings', '0')} warnings" for x in sm) or "no sitemap!"
    today = date.today().isoformat()
    not_indexed = []
    for path in KEY_PAGES:
        r = s.post(INSPECT, json={"inspectionUrl": SITE + path, "siteUrl": GSC_SITE})
        if not r.ok:
            continue
        res = r.json().get("inspectionResult", {}).get("indexStatusResult", {})
        con.execute("INSERT OR REPLACE INTO index_status VALUES (?,?,?,?,?)",
                    (today, path, res.get("verdict"), res.get("coverageState"), res.get("lastCrawlTime")))
        if res.get("verdict") != "PASS":
            not_indexed.append((path, res.get("coverageState", "unknown")))
    con.commit()

    # Movement: last 7 stored days vs the 7 before
    days = [d for (d,) in con.execute("SELECT DISTINCT date FROM gsc_daily ORDER BY date DESC LIMIT 14")]
    cur, prev = days[:7], days[7:14]

    def totals(ds):
        if not ds:
            return 0, 0, None
        q = ",".join("?" * len(ds))
        c, i, p = con.execute(f"SELECT SUM(clicks), SUM(impressions), SUM(position*impressions)/NULLIF(SUM(impressions),0) "
                              f"FROM gsc_daily WHERE date IN ({q})", ds).fetchone()
        return c or 0, i or 0, p

    def by_query(ds):
        if not ds:
            return {}
        q = ",".join("?" * len(ds))
        return {k: (imp, pos) for k, imp, pos in con.execute(
            f"SELECT query, SUM(impressions), SUM(position*impressions)/SUM(impressions) FROM gsc_daily "
            f"WHERE date IN ({q}) GROUP BY query HAVING SUM(impressions) >= ?", (*ds, MIN_IMPRESSIONS))}

    c1, i1, p1 = totals(cur)
    c0, i0, p0 = totals(prev)
    q1, q0 = by_query(cur), by_query(prev)
    up = sorted(((q, q0[q][1] - q1[q][1], q1[q][1]) for q in q1 if q in q0 and q0[q][1] - q1[q][1] >= MOVE), key=lambda x: -x[1])
    down = sorted(((q, q1[q][1] - q0[q][1], q1[q][1]) for q in q1 if q in q0 and q1[q][1] - q0[q][1] >= MOVE), key=lambda x: -x[1])
    new_top10 = sorted((q, v[1]) for q, v in q1.items() if v[1] <= 10 and (q not in q0 or q0[q][1] > 10))

    lines = ["📈 <b>Google Search: daily update</b>"]
    if not days:
        lines += ["", "No search data yet. Normal for a newly verified site; it appears in 2–3 days."]
    else:
        def delta(a, b):
            return f" ({'+' if a - b >= 0 else ''}{a - b})" if prev else ""
        lines += ["", f"Last {len(cur)} days: <b>{c1}</b> clicks{delta(c1, c0)}, <b>{i1}</b> impressions{delta(i1, i0)}"
                      + (f", avg position <b>{p1:.1f}</b>" + (f" (was {p0:.1f})" if p0 else "") if p1 else "")]
        if up:
            lines += ["", "⬆️ <b>Moved up</b>"] + [f"• {esc(q)}: +{d:.1f} → #{p:.0f}" for q, d, p in up[:5]]
        if down:
            lines += ["", "⬇️ <b>Dropped</b>"] + [f"• {esc(q)}: −{d:.1f} → #{p:.0f}" for q, d, p in down[:5]]
        if new_top10:
            lines += ["", "🆕 <b>New in the top 10</b>"] + [f"• {esc(q)} (#{p:.0f})" for q, p in new_top10[:5]]
    lines += ["", f"Sitemap: {esc(sm_line)}"]
    if not_indexed:
        lines += ["Not indexed yet: " + ", ".join(f"{esc(p)} ({esc(c)})" for p, c in not_indexed)]
    else:
        lines += ["Key pages: all indexed ✅"]
    if new_days:
        lines += [f"<i>Stored {sum(n for _, n in new_days)} rows for {len(new_days)} day(s).</i>"]
    msg = "\n".join(lines)
    print(msg)
    telegram(msg, silent=not (down or not_indexed))
    return 0


if __name__ == "__main__":
    sys.exit(main())
