"""Copy the Aorbo app's real departures into the website (30 Oct 2026).

    venv/bin/python manage.py sync_app_departures          # hourly from cron
    venv/bin/python manage.py sync_app_departures --dry-run

Reads the app feed (treks_app/app_departures.py FEED_URL; env APP_DEPARTURES_URL
overrides it), matches each app destination to website trek pages and upserts
TrekDeparture rows with source="app". App rows that are no longer in the feed
(dates ended, vendor suspended, trek off sale) are switched off. Staff rows
(source="manual") are never touched. If the feed can't be read, nothing changes.
The SEO bot's content sync sees the change and rebuilds the pages.
"""

import json
import os
import urllib.request

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from treks_app import app_departures as rules
from treks_app.models import Operator, TrekDeparture, TrekList


class Command(BaseCommand):
    help = "Sync real departures from the Aorbo app into the website's Departure cities."

    def add_arguments(self, parser):
        parser.add_argument("--dry-run", action="store_true", help="Show what would change, change nothing.")

    def handle(self, *args, dry_run=False, **opts):
        url = os.environ.get("APP_DEPARTURES_URL") or rules.FEED_URL
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "aorbotreks-website-sync"})
            with urllib.request.urlopen(req, timeout=30) as r:
                body = json.load(r)
        except Exception as e:  # noqa: BLE001 — any failure: change nothing
            raise CommandError(f"Could not read the app feed ({e}); nothing changed.")
        if not body.get("success") or not isinstance((body.get("data") or {}).get("departures"), list):
            raise CommandError("The app feed answered without departures; nothing changed.")
        feed = body["data"]["departures"]

        destinations = {d["destination"]["id"]: d["destination"]["name"] for d in feed if d.get("destination")}
        treks = list(TrekList.objects.values_list("id", "name", "app_destination_ids"))
        pages = rules.pages_for(treks, destinations)

        seen, created, updated, skipped = set(), 0, 0, []
        with transaction.atomic():
            for dep in feed:
                trek_ids = pages.get((dep.get("destination") or {}).get("id"), [])
                if not trek_ids:
                    continue
                try:
                    row = rules.to_row(dep)
                except ValueError as e:
                    skipped.append(f"{dep.get('pickupPoint')}: {e}")
                    continue
                operator, _ = Operator.objects.get_or_create(name=row.pop("operator_name"))
                for trek_id in trek_ids:
                    key = rules.app_key(dep["key"], trek_id)
                    seen.add(key)
                    values = {**row, "operator": operator, "is_active": True, "source": "app", "trek_id": trek_id}
                    obj = TrekDeparture.objects.filter(app_key=key).first()
                    if obj is None:
                        if not dry_run:
                            TrekDeparture.objects.create(app_key=key, **values)
                        created += 1
                    elif any(getattr(obj, f) != v for f, v in values.items()):
                        if not dry_run:
                            TrekDeparture.objects.filter(pk=obj.pk).update(**values)
                        updated += 1
            stale = TrekDeparture.objects.filter(source="app", is_active=True).exclude(app_key__in=seen)
            switched_off = stale.count()
            if not dry_run:
                stale.update(is_active=False)
            if dry_run:
                transaction.set_rollback(True)

        unmatched = sorted({name for dest_id, name in destinations.items() if dest_id not in pages})
        self.stdout.write(
            f"{'DRY RUN: ' if dry_run else ''}feed {len(feed)} departure(s); "
            f"added {created}, updated {updated}, switched off {switched_off}, skipped {len(skipped)}"
        )
        if unmatched:
            self.stdout.write("App destinations with no website page (link them in a trek's 'Aorbo app destination IDs'): "
                              + ", ".join(f"{n} (#{i})" for i, n in sorted(destinations.items()) if i not in pages))
        for s in skipped[:20]:
            self.stdout.write(f"  skipped {s}")
