"""Post-deploy check, through the local nginx (no internet, no CDN in the way).

Exit 1 makes deploy.sh roll back to the previous site.
"""
import re
import sys
import time
import urllib.error
import urllib.request

HOST = "aorbotreks.com"


def get(path):
    req = urllib.request.Request(f"http://127.0.0.1{path}", headers={"Host": HOST, "X-Forwarded-Proto": "https"})
    try:
        r = urllib.request.urlopen(req, timeout=20)
        return r.status, r.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        return e.code, ""
    except Exception as e:  # noqa: BLE001
        return 0, str(e)


def main():
    problems = []
    for path in ["/", "/about", "/contact", "/robots.txt", "/sitemap.xml"]:
        status, body = get(path)
        if status != 200:
            problems.append(f"{path} -> {status}")
        elif path in ("/", "/about", "/contact") and "<title>" not in body:
            problems.append(f"{path} has no title")
    status, xml = get("/sitemap.xml")
    treks = [u for u in re.findall(r"<loc>https://aorbotreks\.com(/treks/[^<]+)</loc>", xml)][:3]
    for path in treks:
        status, _ = get(path)
        if status != 200:
            problems.append(f"{path} -> {status}")
    status, _ = get(f"/post-deploy-check-{int(time.time())}")
    if status != 404:
        problems.append(f"unknown address -> {status}, expected 404")
    status, _ = get("/api/treks/?page=1")
    if status != 200:
        problems.append(f"API -> {status}")
    if problems:
        print("post-check FAILED:", "; ".join(problems))
        return 1
    print("post-check: ok")
    return 0


if __name__ == "__main__":
    sys.exit(main())
