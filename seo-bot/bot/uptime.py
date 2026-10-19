"""Is aorbotreks.com reachable? Checked every 5 minutes; Telegram only on a change.

On 17 Oct 2026 the site was unreachable for ~8 hours (02:19-10:26 IST) while our
server was fine: AIC Cloud's entry point stopped passing web traffic to it. The
6-hourly health check only noticed at 06:00. This one:
  - fetches the home page and the trek API (15 s timeout each);
  - after 2 failed checks in a row (10 minutes) alerts, saying whose side it is:
    it asks our server directly over SSH (bot-entry.sh "status") - if nginx,
    the backend and the database are up there, the problem is in front of it
    (AIC's proxy / network), so contact AIC;
  - when the site answers again, says so and how long it was down.
"""
import sys
import time
from datetime import datetime

from common import SITE, fetch, state_get, state_set, telegram

CHECKS = ["/", "/api/treks/?page=1"]
TIMEOUT = 15
FAILS_BEFORE_ALERT = 2

# The app's own server (AIC France, a different machine from the website): the API the
# mobile app and portals use, and the two portals. Added 19 Oct 2026 - until then nobody
# was told when the app's API was down. Same rules: 2 failed checks in a row -> alert.
APP_CHECKS = [
    ("App API", "https://api.aorbotreks.co.in/api/vendor/treks/health"),
    ("Partner portal", "https://partners.aorbotreks.co.in/"),
    ("Admin portal", "https://admin.aorbotreks.co.in/"),
]


def site_ok():
    problems = []
    for path in CHECKS:
        status, _, _, seconds = fetch(SITE + path, timeout=TIMEOUT)
        if status != 200:
            problems.append(f"{path} -> {'no answer' if status == 0 else f'HTTP {status}'}")
        elif seconds > 10:
            problems.append(f"{path} took {seconds:.0f} s")
    return problems


def app_ok():
    problems = []
    for name, url in APP_CHECKS:
        status, _, _, seconds = fetch(url, timeout=TIMEOUT)
        if status != 200:
            problems.append(f"{name} -> {'no answer' if status == 0 else f'HTTP {status}'}")
        elif seconds > 10:
            problems.append(f"{name} took {seconds:.0f} s")
    return problems


def check(key, probe, down_text, up_text, extra=lambda: ""):
    """One watched service: alert after FAILS_BEFORE_ALERT failed checks in a row, once; say when it's back."""
    problems = probe()
    if problems:  # one retry after a short pause: a single slow answer isn't an outage
        time.sleep(20)
        problems = probe()
    s = state_get(key, {"fails": 0, "down_since": None, "alerted": False})
    if problems:
        s["fails"] += 1
        s["down_since"] = s["down_since"] or datetime.now().isoformat(timespec="seconds")
        if s["fails"] >= FAILS_BEFORE_ALERT and not s["alerted"]:
            more = extra()
            nl = chr(10)
            telegram(f"🔴 <b>{down_text}</b> (since {s['down_since'][11:16]}){nl}"
                     + nl.join(f"• {p}" for p in problems) + (f"{nl}{nl}{more}" if more else ""))
            s["alerted"] = True
        print(key, "DOWN:", problems)
    else:
        if s["alerted"]:
            telegram(f"🟢 <b>{up_text}</b>, after about {minutes_since(s['down_since'])} minutes.")
        s = {"fails": 0, "down_since": None, "alerted": False}
        print(key, "up")
    state_set(key, s)


def server_side():
    """What our own server says about itself (works even when the public site doesn't)."""
    try:
        from sitedeploy import run
        code, out = run("status", timeout=60)
        if code == 0 and out.count("active") >= 3:
            return "Our server is fine (nginx, backend and database running): the problem is in front of it, on AIC Cloud's side. Contact AIC support."
        return f"Our server reports a problem:\n{out[:300]}"
    except Exception as e:  # noqa: BLE001 - can't reach the server either
        return f"Our server can't be reached over SSH either ({str(e)[:80]}): the whole machine or AIC's network is down."


def minutes_since(iso):
    return int((datetime.now() - datetime.fromisoformat(iso)).total_seconds() // 60)


def main():
    check("uptime", site_ok, "aorbotreks.com is not reachable", "aorbotreks.com is back", server_side)
    check("uptime_app", app_ok, "Aorbo app API / portals not reachable", "Aorbo app API and portals are back",
          lambda: "The app server (AIC France, ssh aorbo-prod) or Cloudflare in front of it. "
                  "Customers can't sign in or book while the API is down.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
