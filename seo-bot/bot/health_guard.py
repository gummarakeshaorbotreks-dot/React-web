"""Daily health guard (playbook case C): is the live site still crawlable and correct?

Checks every URL in the sitemap (status, title, canonical, no accidental noindex,
duplicate titles, speed) plus robots.txt, the 404 page, the www redirect, the
verification/IndexNow files and the API. Sends a Telegram alert when something broke;
on a clean run, a short silent "all good" line.

    python health_guard.py            normal run
    python health_guard.py --quiet    no Telegram message when everything is fine
"""
import re
import sys
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime

from common import SITE, db, esc, fetch, telegram

SLOW_SECONDS = 3.0
MUST_BE_LIVE = ["/googleafa76c4f2a0c2db4.html", "/511c352aab48724bc430f6a5eb06073f.txt"]


def check_page(url):
    status, _, html, secs = fetch(url)
    title = re.search(r"<title>([^<]*)</title>", html)
    canon = re.search(r'<link rel="canonical" href="([^"]+)"', html)
    robots = re.search(r'<meta name="robots" content="([^"]+)"', html)
    problems = []
    if status != 200:
        problems.append(f"HTTP {status}")
    if not title or not title.group(1).strip():
        problems.append("no title")
    if not canon:
        problems.append("no canonical")
    elif canon.group(1).rstrip("/") != url.rstrip("/"):
        problems.append(f"canonical points elsewhere ({canon.group(1)})")
    if robots and "noindex" in robots.group(1):
        problems.append("noindex")
    if secs > SLOW_SECONDS:
        problems.append(f"slow {secs:.1f}s")
    return url, (title.group(1).strip() if title else ""), secs, problems


def main():
    quiet = "--quiet" in sys.argv
    problems = []

    status, headers, xml, _ = fetch(f"{SITE}/sitemap.xml")
    urls = re.findall(r"<loc>([^<]+)</loc>", xml) if status == 200 else []
    if status != 200 or "xml" not in headers.get("Content-Type", "") or len(urls) < 50:
        problems.append(f"sitemap.xml broken (HTTP {status}, {len(urls)} URLs, {headers.get('Content-Type', '?')})")

    status, _, robots, _ = fetch(f"{SITE}/robots.txt")
    if status != 200 or "Sitemap:" not in robots or re.search(r"^Disallow:\s*/\s*$", robots, re.M):
        problems.append(f"robots.txt wrong (HTTP {status})")

    status, _, _, _ = fetch(f"{SITE}/this-page-should-not-exist-{int(time.time())}")
    if status != 404:
        problems.append(f"unknown pages return {status}, not 404 (soft 404)")

    status, headers, _, _ = fetch("https://www.aorbotreks.com/about", follow=False)
    if status != 301 or headers.get("Location", "") != f"{SITE}/about":
        problems.append(f"www redirect broken ({status} {headers.get('Location', '')})")

    for path in MUST_BE_LIVE:
        if fetch(SITE + path)[0] != 200:
            problems.append(f"{path} missing (verification / IndexNow key)")

    status, headers, _, _ = fetch(f"{SITE}/api/treks/?page=1")
    if status != 200 or "json" not in headers.get("Content-Type", ""):
        problems.append(f"API /api/treks/ broken (HTTP {status})")

    results = []
    with ThreadPoolExecutor(max_workers=6) as pool:
        results = list(pool.map(check_page, urls))
    bad_pages = [(u, p) for u, _, _, p in results if p]
    titles = {}
    for u, t, _, _ in results:
        if t:
            titles.setdefault(t, []).append(u)
    dupes = {t: us for t, us in titles.items() if len(us) > 1}
    slowest = max((s for _, _, s, _ in results), default=0)
    avg = sum(s for _, _, s, _ in results) / len(results) if results else 0

    if bad_pages:
        problems.append(f"{len(bad_pages)} page(s) with problems")
    if dupes:
        problems.append(f"{len(dupes)} duplicate title(s)")

    con = db()
    con.execute("INSERT OR REPLACE INTO health_runs VALUES (?,?,?,?,?)",
                (datetime.now().isoformat(timespec="seconds"), int(not problems), len(urls), "; ".join(problems), slowest))
    con.commit()

    if problems:
        lines = ["🚨 <b>aorbotreks.com health check: problems found</b>", ""]
        lines += [f"• {esc(p)}" for p in problems]
        if bad_pages:
            lines += ["", "<b>Pages:</b>"] + [f"• {esc(u.replace(SITE, '') or '/')}: {esc(', '.join(p))}" for u, p in bad_pages[:15]]
            if len(bad_pages) > 15:
                lines.append(f"…and {len(bad_pages) - 15} more")
        if dupes:
            lines += ["", "<b>Duplicate titles:</b>"] + [f"• {esc(t)} ({len(us)} pages)" for t, us in list(dupes.items())[:5]]
        lines += ["", "If this follows a deploy, roll back first, then investigate."]
        telegram("\n".join(lines))
        print("\n".join(lines))
        return 0  # the alert is sent; a non-zero exit would make n8n send a second "bot failed" alert

    msg = (f"✅ Site health OK: {len(urls)} pages, robots, sitemap, 404, www redirect, API all fine. "
           f"Avg {avg:.2f}s, slowest {slowest:.2f}s.")
    print(msg)
    if not quiet:
        telegram(msg, silent=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
