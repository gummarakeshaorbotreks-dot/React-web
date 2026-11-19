"""Book / app clicks on aorbotreks.com, counted for the SEO bot's weekly scorecard (read only).

The site logs each click on a booking link (/t/...) or an app link as a SearchLog row with
tag "out:<book|app>;src:<where the visit came from>;land:<page kind landed on>;on:<page kind clicked on>"
(aorbo-frontend src/utils/visitSource.js). This prints JSON totals for this week and the week before:

    manage.py out_clicks             last 7 days + the 7 before
    manage.py out_clicks --days 28
"""
import json
from collections import Counter
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from treks_app.models import SearchLog


def parse(tag):
    """'out:book;src:google;land:compare;on:trek' -> {'out': 'book', 'src': 'google', ...}; not ours -> None."""
    if not (tag or "").startswith("out:"):
        return None
    out = {}
    for part in tag.split(";"):
        k, _, v = part.partition(":")
        if k in ("out", "src", "land", "on") and v:
            out[k] = v[:40]
    return out if out.get("out") in ("book", "app") else None


def totals(rows):
    t = {"book": 0, "app": 0, "by_src": Counter(), "by_land": Counter(), "by_on": Counter(), "trek": Counter()}
    for tag, trek in rows:
        p = parse(tag)
        if not p:
            continue
        t[p["out"]] += 1
        t["by_src"][p.get("src", "?")] += 1
        t["by_land"][p.get("land", "?")] += 1
        t["by_on"][p.get("on", "?")] += 1
        if trek:
            t["trek"][trek] += 1
    return {k: (dict(v.most_common(10)) if isinstance(v, Counter) else v) for k, v in t.items()}


class Command(BaseCommand):
    help = "JSON totals of book/app clicks (this period and the one before)."

    def add_arguments(self, parser):
        parser.add_argument("--days", type=int, default=7)

    def handle(self, *args, **opts):
        days = max(1, min(int(opts["days"]), 90))
        now = timezone.now()
        a, b = now - timedelta(days=days), now - timedelta(days=2 * days)
        q = SearchLog.objects.filter(tag__startswith="out:")
        this = q.filter(searched_at__gte=a).values_list("tag", "trek_id")
        before = q.filter(searched_at__gte=b, searched_at__lt=a).values_list("tag", "trek_id")
        self.stdout.write(json.dumps({"days": days, "this": totals(this), "before": totals(before)}))
