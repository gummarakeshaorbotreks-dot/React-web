"""The bot's brain, stage 1: improve pages from Search Console data, safely.

Daily, after gsc_pull.py:
  1. Evaluate earlier changes that are COOLDOWN_DAYS old: keep them, or roll back
     the ones that made the page worse (playbook case M).
  2. Freeze while Google is rolling out a ranking update (playbook case B).
  3. Pick pages to improve:
       - CTR fix: seen in Google but clicked less than expected for their position
         -> better title + description;
       - Near the top: position 4-20 for several searches and no FAQs yet
         -> FAQs answering those searches.
  4. Write with Gemini from OUR data only, check every result (lengths, numbers
     that must exist in our data, forbidden claims), retry with feedback, publish
     as a page override, rebuild the site, report on Telegram.

    python optimizer.py                       normal daily run
    python optimizer.py --dry-run --page /treks/kedarkantha-trek --kind ctr   test, publishes nothing
"""
import argparse
import json
import re
import sys
import urllib.request
from datetime import date, datetime, timedelta

from ai import generate_json
from common import SITE, db, esc, fetch, state_get, state_set, telegram
from overrides import list_overrides, upsert

COOLDOWN_DAYS = 21          # Google needs weeks to re-judge a page; no second edit before this
MAX_EDITS_PER_DAY = 5
WINDOW_DAYS = 28
MIN_IMPRESSIONS = 30        # per page over the window; below this the numbers are noise
# Claims we can't back up. "best time / season / route" is fine; "best trek" is not.
FORBIDDEN = re.compile(r"\b(best(?!\s+(?:time|season|months?|way|route|period))|no\.?\s*1|number one|certified"
                       r"|24/7|24x7|guaranteed?|cheapest|seats?)\b|#1", re.I)
# Typical organic CTR by position (rounded industry averages); below 60% of this = weak snippet.
EXPECTED_CTR = {1: .28, 2: .15, 3: .11, 4: .08, 5: .07, 6: .05, 7: .04, 8: .035, 9: .03, 10: .025}


def expected_ctr(position):
    return EXPECTED_CTR.get(round(position), .01 if position > 10 else .28)


def get_json(path):
    req = urllib.request.Request(f"{SITE}{path}", headers={"User-Agent": "AorboSeoBot/1.0"})
    return json.load(urllib.request.urlopen(req, timeout=60))


# ---------- facts: the only things the AI may say ----------
def page_facts(path):
    status, _, html, _ = fetch(SITE + path)
    title = re.search(r"<title>([^<]*)</title>", html)
    desc = re.search(r'<meta name="description" content="([^"]*)"', html)
    facts = {"page": SITE + path, "current_title": title.group(1) if title else "",
             "current_description": desc.group(1) if desc else ""}
    if path.startswith("/treks/"):
        t = get_json(f"/api/treks/{path.split('/', 2)[2]}/")
        facts.update({k: t.get(k) for k in ("name", "description", "state", "price_start", "duration_days",
                                             "operating_days", "activities", "famous_places", "operators")})
        facts["price_note"] = "price_start is the lowest price in INR per person"
    elif path.startswith("/blogs/"):
        b = get_json(f"/api/blogs/{path.split('/', 2)[2]}/")
        facts.update({"title": b.get("title"), "excerpt": b.get("excerpt"),
                      "content": re.sub(r"<[^>]+>", " ", b.get("content") or "")[:3000]})
    return facts


# ---------- quality gate ----------
def numbers_in(text):
    return set(re.findall(r"\d[\d,]*", text.replace(",", "")))


def check(text, facts, limit=None, minimum=None):
    """Problems with one generated text; [] means it may be published."""
    problems = []
    if limit and len(text) > limit:
        problems.append(f"{len(text)} chars, max {limit}")
    if minimum and len(text) < minimum:
        problems.append(f"{len(text)} chars, min {minimum}")
    if FORBIDDEN.search(text):
        problems.append(f"forbidden word '{FORBIDDEN.search(text).group(0)}'")
    allowed = numbers_in(json.dumps(facts, ensure_ascii=False))
    invented = [n for n in numbers_in(text) if n not in allowed]
    if invented:
        problems.append(f"numbers not in our data: {', '.join(invented)}")
    return problems


def write_snippet(facts, queries):
    prompt = (f"Facts about the page (JSON): {json.dumps(facts, ensure_ascii=False)}\n"
              f"Searches that show this page in Google (most impressions first): {json.dumps(queries[:10], ensure_ascii=False)}\n"
              "The page appears in Google but few people click it. Write a clearer, more clickable title "
              "(max 60 characters, ends with '| Aorbo Treks' only if it fits) and meta description "
              "(120 to 155 characters) that match these searches. Use only the facts.")
    schema = {"type": "object", "properties": {"title": {"type": "string"}, "description": {"type": "string"}},
              "required": ["title", "description"]}
    feedback = ""
    for _ in range(3):
        out = generate_json(prompt + feedback, schema)
        problems = [f"title: {p}" for p in check(out["title"], facts, 60, 20)] + \
                   [f"description: {p}" for p in check(out["description"], facts, 155, 110)]
        if out["title"].strip() == facts["current_title"].strip():
            problems.append("title unchanged")
        if not problems:
            return out, []
        feedback = "\n\nYour previous answer was rejected: " + "; ".join(problems) + ". Fix exactly these problems."
    return out, problems


def write_faqs(facts, queries, asked=()):
    prompt = (f"Facts about the page (JSON): {json.dumps(facts, ensure_ascii=False)}\n"
              f"Real Google searches that show this page: {json.dumps(queries[:15], ensure_ascii=False)}\n"
              f"Questions Google shows under 'People also ask' for these searches: {json.dumps(list(asked)[:15], ensure_ascii=False)}\n"
              "Write 3 to 5 FAQs a trekker would ask, answering those searches and questions. Answer ONLY from the facts; "
              "if the facts cannot answer a question, leave that question out. Each answer 1-3 sentences.")
    schema = {"type": "object", "properties": {"faqs": {"type": "array", "items": {
        "type": "object", "properties": {"q": {"type": "string"}, "a": {"type": "string"}}, "required": ["q", "a"]}}},
        "required": ["faqs"]}
    feedback = ""
    for _ in range(3):
        faqs = generate_json(prompt + feedback, schema).get("faqs", [])[:5]
        problems = []
        for i, f in enumerate(faqs, 1):
            problems += [f"FAQ {i} question: {p}" for p in check(f["q"], facts, 200)]
            problems += [f"FAQ {i} answer: {p}" for p in check(f["a"], facts, 600)]
        if len(faqs) < 3:
            problems.append(f"only {len(faqs)} FAQs the facts can answer")
        if not problems:
            return faqs, []
        feedback = "\n\nYour previous answer was rejected: " + "; ".join(problems) + ". Fix exactly these problems."
    return faqs, problems


# ---------- data ----------
def page_stats(con, start, end):
    rows = con.execute("""SELECT page, SUM(clicks), SUM(impressions), SUM(position*impressions)/SUM(impressions)
                          FROM gsc_daily WHERE date BETWEEN ? AND ? GROUP BY page""", (start, end)).fetchall()
    return {page_path(p): {"clicks": c, "impressions": i, "position": pos, "ctr": (c / i if i else 0)}
            for p, c, i, pos in rows}


def page_path(url):
    """Search Console reports full URLs; overrides and our pages use paths."""
    if not url.startswith(SITE):
        return url
    return url[len(SITE):] or "/"


def top_queries(con, path, start, end):
    return [q for (q,) in con.execute("""SELECT query FROM gsc_daily WHERE page IN (?, ?) AND date BETWEEN ? AND ?
                                         GROUP BY query ORDER BY SUM(impressions) DESC LIMIT 15""",
                                      (SITE + path, SITE + path + "/", start, end))]


def google_update_running():
    """Playbook case B: don't edit while Google rolls out a ranking update."""
    try:
        incidents = json.load(urllib.request.urlopen("https://status.search.google.com/incidents.json", timeout=30))
    except Exception:  # noqa: BLE001 - unknown means: carry on
        return None
    for inc in incidents:
        name = (inc.get("external_desc") or inc.get("service_name") or "").lower()
        if not inc.get("end") and ("ranking" in name or "core update" in name or "spam update" in name):
            return inc.get("external_desc") or "ranking update"
    return None


# ---------- evaluate earlier changes (case M) ----------
def evaluate(con, report):
    today = date.today()
    for rowid, at, page, kind, before in con.execute(
            "SELECT rowid, at, page, kind, before FROM changes WHERE result = 'pending'").fetchall():
        changed = datetime.fromisoformat(at).date()
        if (today - changed).days < COOLDOWN_DAYS + 3:  # +3: Search Console's delay
            continue
        b = json.loads(before)
        prev = page_stats(con, (changed - timedelta(days=COOLDOWN_DAYS)).isoformat(), changed.isoformat()).get(page)
        post = page_stats(con, (changed + timedelta(days=1)).isoformat(),
                          (changed + timedelta(days=COOLDOWN_DAYS)).isoformat()).get(page)
        if not prev or not post or post["impressions"] < 20:
            con.execute("UPDATE changes SET result='kept (too little data to judge)' WHERE rowid=?", (rowid,))
            continue
        worse = (post["ctr"] < prev["ctr"] * 0.75 and post["position"] >= prev["position"] - 1) or \
                (post["position"] > prev["position"] + 2 and post["clicks"] < prev["clicks"])
        if worse:
            old = b.get("override") or {}
            upsert(page, f"rollback of {kind} from {at[:10]}: page got worse",
                   title=old.get("title", ""), description=old.get("description", ""),
                   faqs=old.get("faqs", []), active=bool(old))
            con.execute("UPDATE changes SET result=? WHERE rowid=?",
                        (f"rolled back: CTR {prev['ctr']:.1%}→{post['ctr']:.1%}, pos {prev['position']:.1f}→{post['position']:.1f}", rowid))
            report.append(f"↩️ Rolled back {kind} on {esc(page)} (it got worse)")
        else:
            con.execute("UPDATE changes SET result=? WHERE rowid=?",
                        (f"kept: CTR {prev['ctr']:.1%}→{post['ctr']:.1%}, pos {prev['position']:.1f}→{post['position']:.1f}", rowid))
            report.append(f"✅ Kept {kind} on {esc(page)}: CTR {prev['ctr']:.1%}→{post['ctr']:.1%}")
    con.commit()


# ---------- pick and fix ----------
def candidates(con):
    end = (date.today() - timedelta(days=2)).isoformat()
    start = (date.today() - timedelta(days=2 + WINDOW_DAYS)).isoformat()
    stats = page_stats(con, start, end)
    cooling = {p for (p,) in con.execute("SELECT page FROM changes WHERE at >= ?",
                                         ((datetime.now() - timedelta(days=COOLDOWN_DAYS)).isoformat(),))}
    overrides = list_overrides()
    bot_pages = {p for (p,) in con.execute("SELECT DISTINCT page FROM changes")}
    team_owned = {o["path"] for o in overrides if o["path"] not in bot_pages}  # never touch the team's own edits
    faq_pages = {o["path"] for o in overrides if o.get("faqs")}
    picks = []
    bad_data = {f"/treks/{t}" for t in state_get("data_issues", [])}  # wrong facts must not spread (data_quality.py)
    queue, kept = state_get("radar_queue", []), []
    for item in queue:  # fixes queued by radar.py after we lost a search or to protect a top-3 one
        page = item["page"]
        if page in cooling or page in team_owned or page in bad_data or len(picks) >= MAX_EDITS_PER_DAY \
                or any(p[0] == page for p in picks):
            kept.append(item)
            continue
        picks.append((page, item["kind"], stats.get(page, {}), item["reason"], item.get("queries", [])))
    state_set("radar_queue", kept)
    for page, s in sorted(stats.items(), key=lambda kv: -kv[1]["impressions"]):
        if any(p[0] == page for p in picks):
            continue
        if page in cooling or page in team_owned or page in bad_data or s["impressions"] < MIN_IMPRESSIONS:
            continue
        if s["position"] <= 15 and s["ctr"] < 0.6 * expected_ctr(s["position"]):
            picks.append((page, "ctr", s, f"CTR {s['ctr']:.1%} at position {s['position']:.1f} (expected ~{expected_ctr(s['position']):.0%})", []))
        elif 4 <= s["position"] <= 20 and page not in faq_pages and len(top_queries(con, page, start, end)) >= 3:
            picks.append((page, "faq", s, f"position {s['position']:.1f}: add FAQs for the searches it almost wins", []))
    return picks[:MAX_EDITS_PER_DAY], start, end


def apply(con, page, kind, stats, reason, start, end, dry_run=False, extra=()):
    """extra: from radar.py, [the search we lost or defend, its 'People also ask' questions...]."""
    facts = page_facts(page)
    queries = list(dict.fromkeys(list(extra[:1]) + top_queries(con, page, start, end)))
    asked = list(dict.fromkeys(list(extra[1:]) + state_get("radar_paa", {}).get(page, [])))
    current = next((o for o in list_overrides() if o["path"] == page), None)
    if kind == "ctr":
        out, problems = write_snippet(facts, queries)
        fields = {"title": out["title"], "description": out["description"]}
    else:
        faqs, problems = write_faqs(facts, queries, asked)
        fields = {"faqs": faqs}
    if problems:
        return f"🛑 {esc(page)}: AI text failed the checks, not published ({esc('; '.join(problems[:3]))})"
    if dry_run:
        return f"[dry run] {page} {kind}: {json.dumps(fields, ensure_ascii=False, indent=1)}"
    upsert(page, f"bot {kind}: {reason}", **fields, active=True)
    con.execute("INSERT INTO changes (at, page, kind, reason, before, after, result) VALUES (?,?,?,?,?,?, 'pending')",
                (datetime.now().isoformat(timespec="seconds"), page, kind, reason,
                 json.dumps({"override": current, "metrics": stats}), json.dumps(fields, ensure_ascii=False)))
    con.commit()
    if kind == "ctr":
        return f"✏️ <b>{esc(page)}</b>: new title \"{esc(fields['title'])}\"\n<i>{esc(reason)}</i>"
    return f"❓ <b>{esc(page)}</b>: added {len(fields['faqs'])} FAQs\n<i>{esc(reason)}</i>"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--page")
    ap.add_argument("--kind", choices=["ctr", "faq"], default="ctr")
    a = ap.parse_args()
    con = db()

    if a.page:  # manual / test run for one page
        end = (date.today() - timedelta(days=2)).isoformat()
        start = (date.today() - timedelta(days=2 + WINDOW_DAYS)).isoformat()
        print(apply(con, a.page, a.kind, {}, "manual run", start, end, dry_run=a.dry_run))
        return 0

    report = []
    evaluate(con, report)
    update = google_update_running()
    if update:
        report.append(f"⏸ Google is rolling out: {esc(update)}. No edits until it ends (playbook B).")
        picks = []
    else:
        picks, start, end = candidates(con)
        for page, kind, stats, reason, extra in picks:
            try:
                report.append(apply(con, page, kind, stats, reason, start, end, extra=extra))
            except Exception as e:  # noqa: BLE001 - one page failing must not stop the others
                report.append(f"⚠️ {esc(page)}: {esc(e)}")
    if any(line.startswith(("✏️", "❓", "↩️")) for line in report):
        from sitedeploy import deploy
        code, _ = deploy("SEO bot page improvements", notify=False)
        report.append("🚀 Site rebuilt with the changes" if code == 0 else f"⚠️ Rebuild failed (exit {code}); changes go live on the next rebuild")
    if report:
        telegram("🧠 <b>SEO bot: page improvements</b>\n\n" + "\n\n".join(report))
    print("\n".join(report) or "nothing to improve today")
    return 0


if __name__ == "__main__":
    sys.exit(main())
