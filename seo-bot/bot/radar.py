"""Competitor radar: where we rank in Google, who beat us, why, and what to do about it.

Weekly, on the SerpApi free plan (250 searches/month, so ~48 per run):
  - every week: our brand, "treks near me" from big cities and (in rotation) tier-2
    towns (Google answers it from the searcher's location), a few generic searches,
    and 3 of our city pages' searches ("treks near warangal" from Warangal) in rotation;
  - trek names: the treks with most Search Console impressions every week, the rest
    in rotation so each one is checked every few weeks.
For each search we keep the top 10, our position, the map pack, AI overview and the
"People also ask" questions.

Compared with the previous scan of the same search:
  - lost / overtaken -> diagnose (rules first, then Gemini with both results side by
    side) -> a fix queued for optimizer.py (title + description or FAQs), or a to-do
    for the team when the cause is off-page (reviews, backlinks, map listing, content);
  - holding #1-3 -> defend: the page should answer the "People also ask" questions;
  - weeks at #1 in a row are counted (streaks).

    python radar.py                 weekly run
    python radar.py --max 3         small test run (uses 3 searches)
"""
import argparse
import json
import sys
import urllib.parse
import urllib.request
from collections import Counter
from datetime import date, datetime, timedelta

from ai import generate_json
from common import SITE, db, esc, fetch, secret, state_get, state_set, telegram
from content_sync import all_pages
from optimizer import google_update_running, page_stats, page_path
from overrides import list_overrides

API = "https://serpapi.com"
DOMAIN = "aorbotreks.com"
PER_RUN = 48            # ~4.3 runs a month x 48 = ~207 of the 250 free searches
RESERVE = 10            # never spend the last few: kept for manual checks
MAX_DIAGNOSES = 5       # Gemini calls per run
MAX_DEFENDS = 2         # "add FAQs to protect a top-3 result" per run
QUEUE_DAYS = 30         # a queued fix the optimizer couldn't apply in this time is dropped
HOME = "Hyderabad"
COUNTRY = "India"
BRAND = ["aorbo treks"]
NEAR_ME_CITIES = ["Hyderabad", "Bengaluru", "Chennai", "Pune", "Mumbai", "Delhi"]
TIER2_TOWNS = ["Vijayawada", "Visakhapatnam", "Warangal", "Tirupati", "Guntur", "Karimnagar", "Nellore",
               "Kurnool", "Mysuru", "Coimbatore", "Nashik", "Dehradun", "Rajahmundry", "Nizamabad"]
TIER2_PER_RUN = 2
GENERIC = ["weekend treks", "trek booking online", "himalayan treks", "trekking companies in india"]
TOP_TREKS = 10          # treks with most impressions, checked every week
CITY_PAGES_PER_RUN = 3  # "treks near <city>" from that city, for our city pages

CAUSES = {
    "their_snippet_is_more_attractive": "their title/description in Google is more attractive",
    "they_answer_more_questions": "their page answers more of what people ask",
    "they_show_ratings_or_prices": "Google shows their star ratings or prices",
    "they_have_more_content": "their page has more detail on this topic",
    "stronger_site_or_backlinks": "their site is older / more linked-to",
    "map_pack_or_local": "Google shows map (local) results for this search",
    "different_kind_of_page": "Google prefers a different kind of page here (list, blog, guide)",
    "normal_fluctuation": "normal week-to-week movement",
    "unknown": "not clear yet",
}


# ---------- SerpApi ----------
def serpapi(path, **params):
    q = urllib.parse.urlencode(params)
    return json.load(urllib.request.urlopen(f"{API}/{path}?{q}", timeout=90))


def searches_left():
    acct = serpapi("account.json", api_key=secret("serpapi-api-key"))
    return acct.get("total_searches_left", acct.get("plan_searches_left", 0))


def location(city):
    """SerpApi's exact name for an Indian city (free lookup, cached)."""
    if city == COUNTRY:
        return COUNTRY
    cache = state_get("serp_locations", {})
    if city not in cache:
        found = [x for x in serpapi("locations.json", q=city, limit=5) if x.get("country_code") == "IN"]
        cache[city] = found[0]["canonical_name"] if found else f"{city},India"
        state_set("serp_locations", cache)
    return cache[city]


def domain_of(url):
    host = urllib.parse.urlparse(url or "").netloc.lower()
    return host[4:] if host.startswith("www.") else host


def search(keyword, city):
    res = serpapi("search.json", engine="google", q=keyword, location=location(city), google_domain="google.co.in",
                  gl="in", hl="en", device="mobile", api_key=secret("serpapi-api-key"))
    top = []
    for i, r in enumerate(res.get("organic_results", [])[:10], 1):
        extras = []
        for part in (r.get("rich_snippet") or {}).values():
            if isinstance(part, dict):
                extras += [str(e) for e in part.get("extensions", [])]
                extras += [k for k in (part.get("detected_extensions") or {})]
        if r.get("sitelinks"):
            extras.append("sitelinks")
        top.append({"pos": r.get("position") or i, "domain": domain_of(r.get("link")), "link": r.get("link"),
                    "title": r.get("title", ""), "snippet": r.get("snippet", ""), "extras": extras[:6]})
    local = res.get("local_results")
    places = (local.get("places", []) if isinstance(local, dict) else local) or []
    ours = next((r for r in top if r["domain"] == DOMAIN), None)
    return {"position": ours["pos"] if ours else None, "our_url": ours["link"] if ours else None, "top": top,
            "local": [p.get("title") for p in places][:5], "ai_overview": bool(res.get("ai_overview")),
            "paa": [q.get("question") for q in res.get("related_questions", []) if q.get("question")][:8],
            "error": res.get("error")}


# ---------- what to search this week ----------
def rotate(items, key, n):
    if not items:
        return []
    off = state_get(key, 0) % len(items)
    picked = (items[off:] + items[:off])[:n]
    state_set(key, (off + n) % len(items))
    return picked


def trek_keyword(name):
    k = " ".join((name or "").lower().split())
    return k if ("trek" in k or "yatra" in k) else f"{k} trek"


def plan(con, budget):
    jobs = [(k, COUNTRY, "/") for k in BRAND]
    jobs += [("treks near me", c, "/") for c in NEAR_ME_CITIES]
    jobs += [("treks near me", c, "/") for c in rotate(TIER2_TOWNS, "radar_town_offset", TIER2_PER_RUN)]
    jobs += [(k, HOME, "/") for k in GENERIC]
    try:  # "treks near <city>" searched from that city, for the city pages (in rotation)
        hub = json.load(urllib.request.urlopen(f"{SITE}/data/near/index.json", timeout=60))
        cities = [(c["name"], c["slug"]) for s in hub["states"] for c in s["cities"]]
        jobs += [(f"treks near {n.lower()}", n, f"/treks-near/{slug}")
                 for n, slug in rotate(cities, "radar_city_offset", CITY_PAGES_PER_RUN)]
    except Exception as e:  # noqa: BLE001 - no city pages: skip them
        print("city pages list unavailable:", e)
    jobs = jobs[:budget]

    seen, treks = set(), []
    for t in all_pages("/api/treks/"):
        if t.get("id") not in seen and t.get("name"):
            seen.add(t["id"])
            treks.append((trek_keyword(t["name"]), HOME, f"/treks/{t['id']}"))
    since = (date.today() - timedelta(days=30)).isoformat()
    by_impr = [page_path(p) for (p,) in con.execute(
        "SELECT page FROM gsc_daily WHERE date >= ? AND page LIKE ? GROUP BY page ORDER BY SUM(impressions) DESC",
        (since, f"{SITE}/treks/%"))]
    first = [t for p in by_impr for t in treks if t[2] == p][:TOP_TREKS]
    rest = [t for t in treks if t not in first]
    room = budget - len(jobs)
    jobs += first[:room]
    jobs += rotate(rest, "radar_trek_offset", max(0, room - len(first)))
    return jobs


# ---------- storage ----------
def init(con):
    con.executescript("""
    CREATE TABLE IF NOT EXISTS serp (
        run TEXT, keyword TEXT, city TEXT, page TEXT, position INTEGER, our_url TEXT,
        local TEXT, ai_overview INTEGER, top TEXT, paa TEXT, PRIMARY KEY (run, keyword, city));
    CREATE TABLE IF NOT EXISTS radar_diagnoses (
        run TEXT, keyword TEXT, city TEXT, page TEXT, before INTEGER, after INTEGER,
        passed_by TEXT, cause TEXT, why TEXT, action TEXT, todo TEXT);
    """)


def previous(con, run, keyword, city):
    row = con.execute("SELECT position, top FROM serp WHERE keyword=? AND city=? AND run<? ORDER BY run DESC LIMIT 1",
                      (keyword, city, run)).fetchone()
    return {"position": row[0], "top": json.loads(row[1] or "[]")} if row else None


def streak(con, keyword, city):
    n = 0
    for (pos,) in con.execute("SELECT position FROM serp WHERE keyword=? AND city=? ORDER BY run DESC", (keyword, city)):
        if pos != 1:
            break
        n += 1
    return n


def above(result):
    pos = result["position"] or 99
    return [r["domain"] for r in result["top"] if r["pos"] < pos and r["domain"] != DOMAIN]


# ---------- diagnosis ----------
def diagnose(con, keyword, city, page, prev, now, update):
    """(cause, explanation, action 'ctr'|'faq'|'', team to-do). Rules first, Gemini for the rest."""
    if update:
        return "google_update", f"Google is rolling out a ranking update ({update}); rankings move for everyone", "", ""
    status, _, html, _ = fetch(SITE + page)
    if status != 200 or 'name="robots" content="noindex' in html:
        return "our_page_broken", f"our page {page} answered {status} or is hidden from Google", "", \
               "health check alerts on this too; fix the page first"
    recent = con.execute("SELECT at, kind FROM changes WHERE page=? AND at >= ?",
                         (page, (datetime.now() - timedelta(days=21)).isoformat())).fetchone()
    if recent:
        return "our_recent_change", f"the bot changed this page on {recent[0][:10]} ({recent[1]}); " \
               "the optimizer judges it after 21 days and rolls it back if it hurt", "", ""

    ours_now = next((r for r in now["top"] if r["domain"] == DOMAIN), None)
    ours_prev = next((r for r in prev["top"] if r["domain"] == DOMAIN), None)
    has_faqs = any(o["path"] == page and o.get("faqs") for o in list_overrides())
    gsc = page_stats(con, (date.today() - timedelta(days=30)).isoformat(), date.today().isoformat()).get(page)
    prompt = (
        f"Google search '{keyword}' from {city}, India (mobile). Our site aorbotreks.com went from position "
        f"{prev['position']} to {now['position'] or 'not in the top 10'}.\n"
        f"Our result last time: {json.dumps(ours_prev, ensure_ascii=False)}\n"
        f"Our result now: {json.dumps(ours_now, ensure_ascii=False)}\n"
        f"Results above us now (with extras such as ratings, prices, sitelinks): "
        f"{json.dumps([r for r in now['top'] if r['pos'] < (now['position'] or 99)], ensure_ascii=False)[:6000]}\n"
        f"Results last time: {json.dumps([(r['pos'], r['domain']) for r in prev['top']])}\n"
        f"People also ask: {json.dumps(now['paa'], ensure_ascii=False)}\n"
        f"Map results shown: {json.dumps(now['local'], ensure_ascii=False)}; AI overview shown: {now['ai_overview']}\n"
        f"Our page {page}: has FAQs: {has_faqs}; Search Console last 30 days: {json.dumps(gsc)}\n\n"
        "Why did we lose ground? Pick the single most likely cause from the list and explain it in one plain "
        "sentence for a non-technical founder. action: 'ctr' if a better title/description would help, 'faq' if "
        "answering the 'People also ask' questions on our page would help, 'none' if nothing automatic helps. "
        "team_todo: one specific thing a person should do (or '' if nothing). Never suggest fake reviews or claims.")
    schema = {"type": "object", "properties": {
        "cause": {"type": "string", "enum": list(CAUSES)}, "explanation": {"type": "string"},
        "action": {"type": "string", "enum": ["ctr", "faq", "none"]}, "team_todo": {"type": "string"}},
        "required": ["cause", "explanation", "action", "team_todo"]}
    out = generate_json(prompt, schema, temperature=0.2)
    action = "" if out["action"] == "none" else out["action"]
    if action == "faq" and has_faqs:
        action = ""  # FAQs already there; the optimizer refreshes them only via its own data
    return out["cause"], out["explanation"], action, out["team_todo"]


def queue_fix(page, kind, reason, queries):
    """Hand a fix to optimizer.py (it applies cooldown, team-owned and bad-data rules)."""
    if not page.startswith(("/treks/", "/blogs/")):
        return False  # home and listing pages are only reported, never rewritten automatically
    q = [x for x in state_get("radar_queue", []) if not (x["page"] == page and x["kind"] == kind)]
    q.append({"page": page, "kind": kind, "reason": reason, "queries": queries, "added": date.today().isoformat()})
    state_set("radar_queue", q)
    return True


def remember_paa(page, questions):
    if not page.startswith(("/treks/", "/blogs/")) or not questions:
        return
    paa = state_get("radar_paa", {})
    paa[page] = list(dict.fromkeys(questions + paa.get(page, [])))[:15]
    state_set("radar_paa", paa)


# ---------- run ----------
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--max", type=int, default=PER_RUN)
    a = ap.parse_args()
    con = db()
    init(con)
    left = searches_left()
    budget = min(a.max, left - RESERVE)
    if budget <= 0:
        telegram(f"📡 SEO radar skipped: only {left} SerpApi searches left this month (keeping {RESERVE} spare).")
        return 0

    run = datetime.now().isoformat(timespec="minutes")
    update = google_update_running()
    jobs = plan(con, budget)
    lost, gained, defend, firsts, errors = [], [], [], 0, []
    rulers = Counter()
    for keyword, city, target in jobs:
        try:
            now = search(keyword, city)
        except Exception as e:  # noqa: BLE001 - one failed search must not stop the scan
            errors.append(f"{keyword} ({city}): {e}")
            continue
        page = page_path(now["our_url"]) if now["our_url"] else target
        con.execute("INSERT OR REPLACE INTO serp VALUES (?,?,?,?,?,?,?,?,?,?)",
                    (run, keyword, city, page, now["position"], now["our_url"], json.dumps(now["local"]),
                     int(now["ai_overview"]), json.dumps(now["top"], ensure_ascii=False),
                     json.dumps(now["paa"], ensure_ascii=False)))
        con.commit()
        rulers.update(r["domain"] for r in now["top"][:3] if r["domain"] != DOMAIN)
        remember_paa(page, now["paa"])
        prev = previous(con, run, keyword, city)
        if not prev:
            firsts += 1
            continue
        p, n = prev["position"], now["position"]
        newcomers = [d for d in above(now) if d not in above(prev)] if p else []
        if p and (n is None or n - p >= 2 or (n > p and newcomers)):
            lost.append((keyword, city, page, prev, now, newcomers))
        elif n and (p is None or p - n >= 2):
            gained.append((keyword, city, p, n))
        if n and n <= 3 and now["paa"]:
            defend.append((keyword, city, page, now["paa"]))

    lines = []
    for keyword, city, page, prev, now, newcomers in lost[:MAX_DIAGNOSES]:
        try:
            cause, why, action, todo = diagnose(con, keyword, city, page, prev, now, update)
        except Exception as e:  # noqa: BLE001
            cause, why, action, todo = "unknown", f"diagnosis failed: {e}", "", ""
        con.execute("INSERT INTO radar_diagnoses VALUES (?,?,?,?,?,?,?,?,?,?,?)",
                    (run, keyword, city, page, prev["position"], now["position"], ",".join(newcomers),
                     cause, why, action, todo))
        queued = action and queue_fix(page, action, f"radar: lost '{keyword}' ({cause})", [keyword] + now["paa"])
        who = f" — passed by {esc(', '.join(newcomers[:3]))}" if newcomers else ""
        line = (f"📉 <b>{esc(keyword)}</b> ({esc(city)}): {prev['position']} → {now['position'] or 'out of top 10'}{who}\n"
                f"   Why: {esc(why)}")
        if queued:
            line += f"\n   🤖 Fix queued: {'new title + description' if action == 'ctr' else 'FAQs answering People also ask'}"
        if todo:
            line += f"\n   👷 Team: {esc(todo)}"
        lines.append(line)
    con.commit()
    if len(lost) > MAX_DIAGNOSES:
        lines.append(f"…and {len(lost) - MAX_DIAGNOSES} more drops (diagnosed next week if they stay)")

    faq_pages = {o["path"] for o in list_overrides() if o.get("faqs")}
    defended = 0
    for keyword, city, page, paa in defend:
        if defended < MAX_DEFENDS and page not in faq_pages and \
                queue_fix(page, "faq", f"radar: protect top-3 for '{keyword}'", [keyword] + paa):
            defended += 1
            lines.append(f"🛡 <b>{esc(keyword)}</b>: we're top 3; FAQs queued for {esc(page)} so it stays there")

    state_set("radar_queue", [x for x in state_get("radar_queue", [])
                              if x["added"] >= (date.today() - timedelta(days=QUEUE_DAYS)).isoformat()])
    con.execute("UPDATE serp SET top=NULL, paa=NULL WHERE run < ?", ((datetime.now() - timedelta(days=365)).isoformat(),))
    con.commit()

    rows = con.execute("SELECT keyword, city, position FROM serp WHERE run=?", (run,)).fetchall()
    pos = [r[2] for r in rows if r[2]]
    head = (f"📡 <b>SEO radar</b>: {len(rows)} Google searches checked "
            f"({left - len(rows)} SerpApi searches left this month)\n"
            f"🏆 #1: {sum(p == 1 for p in pos)} · top 3: {sum(p <= 3 for p in pos)} · "
            f"top 10: {len(pos)} · not in top 10 yet: {len(rows) - len(pos)}")
    streaks = sorted(((streak(con, k, c), k, c) for k, c, p in rows if p == 1), reverse=True)
    if streaks:
        head += "\n🔥 " + "; ".join(f"{esc(k)} ({esc(c)}): #1 for {s} week{'s' * (s > 1)}" for s, k, c in streaks[:5])
    for keyword, city, p, n in gained[:5]:
        lines.append(f"📈 <b>{esc(keyword)}</b> ({esc(city)}): {p or 'out of top 10'} → {n}")
    if firsts:
        lines.append(f"🆕 {firsts} searches checked for the first time (they're compared from next week)")
    if rulers:
        lines.append("👑 Who holds the top 3 most often: " + ", ".join(f"{esc(d)} ({c})" for d, c in rulers.most_common(5)))
    if update:
        lines.append(f"⏸ Google ranking update running ({esc(update)}): drops this week may be temporary")
    if errors:
        lines.append(f"⚠️ {len(errors)} searches failed: {esc('; '.join(errors[:3]))}")
    msg = head + "\n\n" + "\n\n".join(lines)
    telegram(msg, silent=not lost)
    print(msg)
    return 0


if __name__ == "__main__":
    sys.exit(main())
