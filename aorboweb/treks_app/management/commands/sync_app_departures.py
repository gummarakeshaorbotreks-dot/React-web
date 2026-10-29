"""Copy the Aorbo app's real departures into the website (30 Oct 2026).

    venv/bin/python manage.py sync_app_departures          # hourly from cron
    venv/bin/python manage.py sync_app_departures --dry-run

Reads the app feed (treks_app/app_departures.py FEED_URL; env APP_DEPARTURES_URL
overrides it), matches each app destination to website trek pages and upserts
TrekDeparture rows with source="app". App rows that are no longer in the feed
(dates ended, vendor suspended, trek off sale) are switched off. Staff rows
(source="manual") are never touched. If the feed can't be read, nothing changes.
An app place with no website page at all gets one (app_departures.new_page, at
most MAX_NEW_PAGES a run, same checks as the admin); those pages' price, days and
durations follow the app. What could not be made is printed with the reason.
The SEO bot's content sync sees the change and rebuilds the pages.
"""

import json
import os
import urllib.request

from django.core.cache import cache
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from treks_app import app_departures as rules
from treks_app import trek_rules
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

        # Each app destination's departures and places (a combined one lists several; older feeds: its name).
        by_dest = {}
        for d in feed:
            if d.get("destination"):
                by_dest.setdefault(d["destination"]["id"], []).append(d)
        destinations = {i: (deps[0]["destination"].get("places") or [deps[0]["destination"]["name"]])
                        for i, deps in by_dest.items()}

        seen, created, updated, skipped = set(), 0, 0, []
        new_pages, not_made, refreshed = [], [], 0
        with transaction.atomic():
            pages = rules.pages_for(self.treks(), destinations)
            for dest_id in [i for i in sorted(by_dest) if i not in pages]:
                if len(new_pages) >= rules.MAX_NEW_PAGES:
                    break  # the rest next hour
                try:
                    page = self.make_page(dest_id, by_dest[dest_id])
                except ValueError as e:
                    not_made.append(f"{' + '.join(destinations[dest_id])} (#{dest_id}): {e}")
                    continue
                if dest_id not in rules.pages_for(self.treks(), {dest_id: destinations[dest_id]}):
                    # Its name doesn't read back as the same places: link it by ID instead.
                    TrekList.objects.filter(pk=page.pk).update(app_destination_ids=str(dest_id))
                new_pages.append(f"/treks/{page.id}")
            if new_pages:
                pages = rules.pages_for(self.treks(), destinations)
                cache.delete("featured_treks_qs")
            refreshed = self.refresh_app_pages(pages, by_dest)

            for dep in feed:
                targets = pages.get((dep.get("destination") or {}).get("id"), [])
                if not targets:
                    continue
                try:
                    row = rules.to_row(dep)
                except ValueError as e:
                    skipped.append(f"{dep.get('pickupPoint')}: {e}")
                    continue
                operator, _ = Operator.objects.get_or_create(name=row.pop("operator_name"))
                for trek_id, trip_name in targets:
                    key = rules.app_key(dep["key"], trek_id)
                    seen.add(key)
                    values = {**row, "operator": operator, "is_active": True, "source": "app", "trek_id": trek_id,
                              "trip_name": trip_name}
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

        self.stdout.write(
            f"{'DRY RUN: ' if dry_run else ''}feed {len(feed)} departure(s); "
            f"added {created}, updated {updated}, switched off {switched_off}, skipped {len(skipped)}"
        )
        if new_pages:
            self.stdout.write("New pages for app places: " + ", ".join(new_pages))
        if refreshed:
            self.stdout.write(f"App-made pages updated (price, days, duration): {refreshed}")
        for n in not_made:
            self.stdout.write(f"  no page made for {n}")
        no_page = [f"{' + '.join(n)} (#{i})" for i, n in sorted(destinations.items()) if i not in pages]
        if no_page:
            self.stdout.write("App places with no website page yet: " + ", ".join(no_page))
        for s in skipped[:20]:
            self.stdout.write(f"  skipped {s}")

    @staticmethod
    def treks():
        return list(TrekList.objects.values_list("id", "name", "app_destination_ids"))

    @staticmethod
    def make_page(dest_id, deps):
        """A page for an app place the website has none for (facts only; the admin's checks)."""
        fields, organisers = rules.new_page(deps)
        others = TrekList.objects.all()
        fields["name"] = trek_rules.check_name(fields["name"], dict(others.values_list("id", "name")))
        fields["short_desc"] = trek_rules.check_description(fields["short_desc"],
                                                            dict(others.values_list("id", "short_desc")))
        page = TrekList.objects.create(**fields, currency="INR", from_app=True)
        page.operators.set([Operator.objects.get_or_create(name=n)[0] for n in organisers])
        return page

    @staticmethod
    def refresh_app_pages(pages, by_dest):
        """App-made pages follow the app: lowest price, departure days, durations."""
        mine = set(TrekList.objects.filter(from_app=True).values_list("id", flat=True))
        deps_of = {}
        for dest_id, targets in pages.items():
            for tid, label in targets:
                if tid in mine and not label:
                    deps_of.setdefault(tid, []).extend(by_dest.get(dest_id, []))
        changed = 0
        for tid, deps in deps_of.items():
            try:
                fields, _ = rules.new_page(deps)
            except ValueError:
                continue
            values = {k: fields[k] for k in ("price_start", "operating_days", "duration_days")}
            if TrekList.objects.filter(pk=tid).exclude(**values).update(**values):
                changed += 1
        return changed
