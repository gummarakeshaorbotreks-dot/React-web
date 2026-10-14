"""Pre-deploy gate: refuse a build that would hurt the live site.

    python3 gate.py <new dist> <live dir>

Fails (exit 1) when the new build is missing pages, robots, the sitemap or the
verification files, when a sitemap URL has no file (it would answer 404), when
pages lose their title or canonical, or when the sitemap shrank by more than 10%
compared with the live one (usually the API was down during the build).
"""
import re
import sys
from pathlib import Path

REQUIRED = ["index.html", "404.html", "robots.txt", "sitemap.xml", "sw.js",
            "googleafa76c4f2a0c2db4.html", "511c352aab48724bc430f6a5eb06073f.txt"]
SITE = "https://aorbotreks.com"


def page_file(dist, url):
    p = url[len(SITE):].strip("/")
    return dist / "index.html" if not p else dist / p / "index.html"


def main():
    dist, live = Path(sys.argv[1]), Path(sys.argv[2])
    problems = [f"missing {f}" for f in REQUIRED if not (dist / f).exists()]
    if problems:
        print("gate:", "; ".join(problems))
        return 1

    robots = (dist / "robots.txt").read_text()
    if "Sitemap:" not in robots or re.search(r"^Disallow:\s*/\s*$", robots, re.M):
        problems.append("robots.txt blocks the site or has no sitemap")

    urls = re.findall(r"<loc>([^<]+)</loc>", (dist / "sitemap.xml").read_text())
    live_urls = re.findall(r"<loc>([^<]+)</loc>", (live / "sitemap.xml").read_text()) if (live / "sitemap.xml").exists() else []
    if len(urls) < 50:
        problems.append(f"sitemap has only {len(urls)} URLs")
    if live_urls and len(urls) < 0.9 * len(live_urls):
        problems.append(f"sitemap shrank from {len(live_urls)} to {len(urls)} URLs (API down during the build?)")

    for u in urls:
        f = page_file(dist, u)
        if not f.exists():
            problems.append(f"no file for {u} (would be a 404)")
            continue
        html = f.read_text(encoding="utf-8", errors="replace")
        if not re.search(r"<title>[^<]+</title>", html):
            problems.append(f"no title: {u}")
        if '<link rel="canonical"' not in html:
            problems.append(f"no canonical: {u}")
        if re.search(r'<meta name="robots" content="[^"]*noindex', html):
            problems.append(f"noindex: {u}")

    if problems:
        print("gate:", len(problems), "problem(s)")
        for p in problems[:30]:
            print("  -", p)
        return 1
    print(f"gate: ok ({len(urls)} URLs, live had {len(live_urls)})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
