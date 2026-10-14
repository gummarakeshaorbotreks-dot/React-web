"""Ask the web server to rebuild and deploy the site (ops/site/deploy.sh there).

The bot's SSH key is locked on the web server to bot-entry.sh, so it can only run:
deploy, last-deploy, status, geo (trek positions for the city pages, see trek_geo.py).

    python sitedeploy.py deploy "reason"    build + gate + swap + post-check (+ rollback)
    python sitedeploy.py status
"""
import subprocess
import sys

from common import SECRETS, esc, telegram

SSH = ["ssh", "-i", str(SECRETS / "web-deploy-key"), "-p", "20039", "-o", "BatchMode=yes",
       "-o", "ConnectTimeout=40", "root@37.187.139.100"]
RESULTS = {0: "✅ deployed", 3: "⏳ another deploy was running; skipped", 10: "❌ build failed; site unchanged",
           11: "🛑 build refused by the safety gate; site unchanged", 12: "↩️ post-check failed; ROLLED BACK"}


def run(action, timeout=900):
    p = subprocess.run(SSH + [action], capture_output=True, text=True, timeout=timeout)
    return p.returncode, (p.stdout + p.stderr).strip()


def deploy(reason, notify=True):
    code, out = run("deploy")
    if notify:
        tail = "\n".join(out.splitlines()[-8:])
        telegram(f"🚀 <b>Site rebuild</b>: {esc(reason)}\n{RESULTS.get(code, f'exit {code}')}\n\n<pre>{esc(tail)}</pre>",
                 silent=code == 0)
    return code, out


if __name__ == "__main__":
    action = sys.argv[1] if len(sys.argv) > 1 else "status"
    if action == "deploy":
        code, out = deploy(" ".join(sys.argv[2:]) or "manual")
    else:
        code, out = run(action, timeout=120)
    print(out)
    sys.exit(0 if code in (0, 3) else code)
