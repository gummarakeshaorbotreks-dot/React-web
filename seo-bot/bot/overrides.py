"""Read and write page overrides (title, description, FAQs) on aorbotreks.com.

Writes go to /api/seo-overrides/upsert/ with the bot token; the site picks them up on
the next build (content_sync.py includes overrides in its fingerprint, so a change
triggers a rebuild automatically).

    python overrides.py list
    python overrides.py set /treks/Coorg --title "..." --description "..." --note "why"
"""
import argparse
import json
import sys
import urllib.request

from common import SITE, secret


def list_overrides():
    req = urllib.request.Request(f"{SITE}/api/seo-overrides/", headers={"User-Agent": "AorboSeoBot/1.0"})
    return json.load(urllib.request.urlopen(req, timeout=60)).get("results", [])


def upsert(path, note, **fields):
    """fields: title, description, faqs ([{q, a}]), active. Returns the API's JSON (raises on 4xx/5xx)."""
    body = json.dumps({"path": path, "note": note, **fields}).encode("utf-8")
    req = urllib.request.Request(f"{SITE}/api/seo-overrides/upsert/", data=body, method="POST", headers={
        "Content-Type": "application/json", "Authorization": f"Bearer {secret('seo-api-token')}",
        "User-Agent": "AorboSeoBot/1.0"})
    return json.load(urllib.request.urlopen(req, timeout=60))


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)
    sub.add_parser("list")
    s = sub.add_parser("set")
    s.add_argument("path")
    s.add_argument("--title")
    s.add_argument("--description")
    s.add_argument("--faqs", help='JSON list of {"q","a"}')
    s.add_argument("--inactive", action="store_true")
    s.add_argument("--note", default="set by hand")
    a = ap.parse_args()
    if a.cmd == "list":
        print(json.dumps(list_overrides(), indent=1, ensure_ascii=False))
    else:
        fields = {k: v for k, v in (("title", a.title), ("description", a.description)) if v is not None}
        if a.faqs:
            fields["faqs"] = json.loads(a.faqs)
        fields["active"] = not a.inactive
        print(upsert(a.path, a.note, **fields))
    sys.exit(0)
