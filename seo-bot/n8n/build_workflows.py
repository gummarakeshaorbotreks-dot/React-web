"""Writes the n8n workflow files (n8n/*.json) for the SEO bot.

    python n8n/build_workflows.py

Then on the n8n server (see seo-bot/README.md): import with `n8n import:workflow`
and publish. The bot logic itself lives in bot/*.py; n8n only schedules it and
raises an alert when a run crashes.
"""
import json
import uuid
from pathlib import Path

HERE = Path(__file__).resolve().parent
PY = "cd /opt/aorbo-bot/bot && /opt/aorbo-bot/venv/bin/python"
ERRORS_ID = "aorboSeoErrors01"


def node(name, typ, params, pos, ver=1):
    return {"parameters": params, "id": str(uuid.uuid5(uuid.NAMESPACE_URL, f"aorbo-seo/{name}")),
            "name": name, "type": typ, "typeVersion": ver, "position": pos}


def cron(name, expr, pos):
    return node(name, "n8n-nodes-base.scheduleTrigger",
                {"rule": {"interval": [{"field": "cronExpression", "expression": expr}]}}, pos, 1.2)


def run(name, script, pos):
    return node(name, "n8n-nodes-base.executeCommand", {"command": f"{PY} {script}"}, pos)


def link(*pairs):
    return {a: {"main": [[{"node": b, "type": "main", "index": 0}]]} for a, b in pairs}


def workflow(wid, name, nodes, connections, error_workflow=True):
    settings = {"executionOrder": "v1", "saveDataSuccessExecution": "none", "saveDataErrorExecution": "all"}
    if error_workflow:
        settings["errorWorkflow"] = ERRORS_ID
    return {"id": wid, "name": name, "nodes": nodes, "connections": connections,
            "settings": settings, "active": False, "pinData": {}}


# The failing workflow's name and error go into a shell command, so keep only safe characters.
ALERT_CMD = ("={{ '" + PY + " notify.py \"' + ($json.workflow.name + ' failed: ' + "
             "(($json.execution && $json.execution.error && $json.execution.error.message) || 'unknown error'))"
             r".replace(/[^A-Za-z0-9 .,:()_-]/g, '') + '\"' }}")

WORKFLOWS = {
    "errors": workflow(ERRORS_ID, "SEO bot: alert when a bot workflow fails", [
        node("When a bot workflow fails", "n8n-nodes-base.errorTrigger", {}, [0, 0]),
        node("Send Telegram alert", "n8n-nodes-base.executeCommand", {"command": ALERT_CMD}, [260, 0]),
    ], link(("When a bot workflow fails", "Send Telegram alert")), error_workflow=False),

    "health": workflow("aorboSeoHealth01", "SEO bot: site health check", [
        cron("Every day 06:00 IST", "0 6 * * *", [0, 0]),
        run("Full check + daily report", "health_guard.py", [260, 0]),
        cron("Every 6 hours", "30 */6 * * *", [0, 200]),
        run("Quick check (alert only)", "health_guard.py --quiet", [260, 200]),
    ], link(("Every day 06:00 IST", "Full check + daily report"),
            ("Every 6 hours", "Quick check (alert only)"))),

    "content-sync": workflow("aorboSeoContent1", "SEO bot: rebuild site when treks or blogs change", [
        cron("Every 3 hours", "15 */3 * * *", [0, 0]),
        run("Compare content, deploy if changed", "content_sync.py", [260, 0]),
    ], link(("Every 3 hours", "Compare content, deploy if changed"))),

    "optimizer": workflow("aorboSeoOptimz01", "SEO bot: improve pages (titles, FAQs) and judge earlier changes", [
        cron("Every day 10:00 IST", "0 10 * * *", [0, 0]),
        run("Evaluate, pick pages, write, check, publish", "optimizer.py", [260, 0]),
    ], link(("Every day 10:00 IST", "Evaluate, pick pages, write, check, publish"))),

    "data-quality": workflow("aorboSeoDataQa01", "SEO bot: weekly trek data check", [
        cron("Monday 08:00 IST", "0 8 * * 1", [0, 0]),
        run("Check trek data (states, names, duplicates)", "data_quality.py", [260, 0]),
    ], link(("Monday 08:00 IST", "Check trek data (states, names, duplicates)"))),

    "radar": workflow("aorboSeoRadar001", "SEO bot: weekly competitor radar (Google rankings, who beat us, why)", [
        cron("Sunday 07:00 IST", "0 7 * * 0", [0, 0]),
        run("Check rankings, diagnose drops, queue fixes", "radar.py", [260, 0]),
    ], link(("Sunday 07:00 IST", "Check rankings, diagnose drops, queue fixes"))),

    "uptime": workflow("aorboSeoUptime01", "SEO bot: is the website reachable? (every 5 minutes)", [
        cron("Every 5 minutes", "*/5 * * * *", [0, 0]),
        run("Check site, alert on change", "uptime.py", [260, 0]),
    ], link(("Every 5 minutes", "Check site, alert on change"))),

    "goals": workflow("aorboSeoGoals001", "SEO bot: 45-day plan - targets and today's pages for Google", [
        cron("Every day 07:30 IST", "30 7 * * *", [0, 0]),
        run("Measure targets, list pages to request", "goals.py", [260, 0]),
    ], link(("Every day 07:30 IST", "Measure targets, list pages to request"))),

    # Vendor agent (owner, 19 Nov 2026): organisers' new treks and dates on the website within minutes.
    # A chain: check the app feed; only when it changed, run the next steps in order.
    "vendor-agent": workflow("aorboVendorAgnt1", "SEO bot: vendor agent (organisers' new treks and dates -> website)", [
        cron("Every 2 minutes", "*/2 * * * *", [0, 0]),
        run("1. Organisers' feed changed?", "vendor_agent.py check", [240, 0]),
        node("Only when it changed", "n8n-nodes-base.if", {"conditions": {"string": [
            {"value1": "={{ $json.stdout }}", "operation": "startsWith", "value2": "CHANGED"}]}}, [480, 0]),
        run("2. Copy departures to the website", "vendor_agent.py sync", [720, 0]),
        run("3. Map positions + destinations", "vendor_agent.py geo", [960, 0]),
        run("4. Trek or tour + trek facts", "vendor_agent.py facts", [1200, 0]),
        run("5. Rebuild the site", "vendor_agent.py deploy", [1440, 0]),
        run("6. Telegram report", "vendor_agent.py report", [1680, 0]),
    ], {**link(("Every 2 minutes", "1. Organisers' feed changed?"), ("1. Organisers' feed changed?", "Only when it changed"),
               ("2. Copy departures to the website", "3. Map positions + destinations"),
               ("3. Map positions + destinations", "4. Trek or tour + trek facts"),
               ("4. Trek or tour + trek facts", "5. Rebuild the site"), ("5. Rebuild the site", "6. Telegram report")),
        "Only when it changed": {"main": [[{"node": "2. Copy departures to the website", "type": "main", "index": 0}], []]}}),

    "gsc-pull": workflow("aorboSeoGscPull1", "SEO bot: Google Search daily pull", [
        cron("Every day 09:00 IST", "0 9 * * *", [0, 0]),
        run("Pull Search Console data + report", "gsc_pull.py", [260, 0]),
    ], link(("Every day 09:00 IST", "Pull Search Console data + report"))),
}

if __name__ == "__main__":
    for name, wf in WORKFLOWS.items():
        (HERE / f"{name}.json").write_text(json.dumps(wf, indent=1), encoding="utf-8")
        print("wrote", f"n8n/{name}.json")
