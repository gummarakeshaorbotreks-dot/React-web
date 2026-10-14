"""Shared helpers for the AORBO SEO bot: settings, Telegram, Google APIs, the bot database.

Runs on the n8n server. Secrets live in /var/lib/n8n/secrets (readable only by the
n8n user); nothing secret is stored in this repo.
"""
import json
import os
import sqlite3
import time
import urllib.error
import urllib.request
from pathlib import Path

SITE = "https://aorbotreks.com"
GSC_SITE = "https://aorbotreks.com/"
SECRETS = Path(os.environ.get("AORBO_BOT_SECRETS", "/var/lib/n8n/secrets"))
DATA = Path(os.environ.get("AORBO_BOT_DATA", "/var/lib/n8n/seo-bot"))
DATA.mkdir(parents=True, exist_ok=True)
USER_AGENT = "AorboSeoBot/1.0 (+https://aorbotreks.com)"


def secret(name):
    return (SECRETS / name).read_text(encoding="utf-8").strip()


# ---------- Telegram ----------
def telegram(text, silent=False):
    """Send an HTML message to the owner's chat. Never raises: alerts must not crash the bot."""
    body = json.dumps({"chat_id": int(secret("telegram-chat-id")), "text": text[:4000], "parse_mode": "HTML",
                       "disable_web_page_preview": True, "disable_notification": silent}).encode("utf-8")
    req = urllib.request.Request(f"https://api.telegram.org/bot{secret('telegram-bot-token')}/sendMessage",
                                 data=body, headers={"Content-Type": "application/json"})
    try:
        return json.load(urllib.request.urlopen(req, timeout=30)).get("ok", False)
    except Exception as exc:  # noqa: BLE001 - logged, not fatal
        print("telegram failed:", exc)
        return False


def esc(s):
    return str(s).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


# ---------- HTTP ----------
def fetch(url, method="GET", timeout=30, follow=True):
    """(status, headers, body_text, seconds). Redirects are not followed when follow=False."""
    class NoRedirect(urllib.request.HTTPRedirectHandler):
        def redirect_request(self, *a, **k):
            return None
    opener = urllib.request.build_opener() if follow else urllib.request.build_opener(NoRedirect)
    req = urllib.request.Request(url, method=method, headers={"User-Agent": USER_AGENT})
    t0 = time.time()
    try:
        r = opener.open(req, timeout=timeout)
        return r.status, dict(r.headers), r.read().decode("utf-8", "replace"), time.time() - t0
    except urllib.error.HTTPError as e:
        return e.code, dict(e.headers), e.read().decode("utf-8", "replace"), time.time() - t0
    except Exception as e:  # noqa: BLE001
        return 0, {}, str(e), time.time() - t0


# ---------- Google (service account) ----------
def google_session(scopes):
    from google.auth.transport.requests import AuthorizedSession
    from google.oauth2 import service_account
    creds = service_account.Credentials.from_service_account_file(str(SECRETS / "google-seo-bot.json"), scopes=scopes)
    return AuthorizedSession(creds)


# ---------- Bot database ----------
def db():
    con = sqlite3.connect(DATA / "seo.db")
    con.executescript("""
    CREATE TABLE IF NOT EXISTS gsc_daily (
        date TEXT, query TEXT, page TEXT, clicks INTEGER, impressions INTEGER, ctr REAL, position REAL,
        PRIMARY KEY (date, query, page));
    CREATE TABLE IF NOT EXISTS index_status (
        checked TEXT, url TEXT, verdict TEXT, coverage TEXT, last_crawl TEXT, PRIMARY KEY (checked, url));
    CREATE TABLE IF NOT EXISTS health_runs (
        run TEXT PRIMARY KEY, ok INTEGER, pages INTEGER, problems TEXT, slowest REAL);
    CREATE TABLE IF NOT EXISTS changes (
        at TEXT, page TEXT, kind TEXT, reason TEXT, before TEXT, after TEXT, result TEXT);
    """)
    return con


def state_get(key, default=None):
    p = DATA / "state.json"
    return json.loads(p.read_text()).get(key, default) if p.exists() else default


def state_set(key, value):
    p = DATA / "state.json"
    s = json.loads(p.read_text()) if p.exists() else {}
    s[key] = value
    p.write_text(json.dumps(s, indent=1))
