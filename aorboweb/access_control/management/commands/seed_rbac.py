from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction

from access_control.catalog import CATALOG, ROLES
from access_control.models import Role, RolePermission, StaffPermission, StaffProfile

User = get_user_model()


class Command(BaseCommand):
    help = (
        "Idempotent: creates/updates the permission catalog and role set, syncs each "
        "role's grants to match access_control/catalog.py exactly, and backfills a "
        "super_admin StaffProfile for any existing superuser that doesn't have one yet."
    )

    @transaction.atomic
    def handle(self, *args, **options):
        for key, label, category, is_dangerous in CATALOG:
            resource, _, action = key.partition(":")
            StaffPermission.objects.update_or_create(
                key=key,
                defaults={
                    "resource": resource or "*",
                    "action": action or "*",
                    "category": category,
                    "label": label,
                    "is_dangerous": is_dangerous,
                },
            )
        self.stdout.write(self.style.SUCCESS(f"Synced {len(CATALOG)} permissions."))

        for role_spec in ROLES:
            role, _ = Role.objects.update_or_create(
                name=role_spec["name"],
                defaults={
                    "rank": role_spec["rank"],
                    "is_system": role_spec["is_system"],
                    "description": role_spec["description"],
                },
            )
            wanted_keys = set(role_spec["keys"])
            current_keys = set(role.permissions.values_list("key", flat=True))

            to_add = wanted_keys - current_keys
            to_remove = current_keys - wanted_keys
            if to_add:
                perms = StaffPermission.objects.filter(key__in=to_add)
                RolePermission.objects.bulk_create(
                    [RolePermission(role=role, permission=p) for p in perms],
                    ignore_conflicts=True,
                )
            if to_remove:
                RolePermission.objects.filter(role=role, permission__key__in=to_remove).delete()

            self.stdout.write(f"  {role.name}: +{len(to_add)} -{len(to_remove)} (now {len(wanted_keys)} keys)")

        wanted_names = {r["name"] for r in ROLES}
        for stale in Role.objects.filter(is_system=True).exclude(name__in=wanted_names):
            if stale.staff.exists():
                self.stdout.write(self.style.WARNING(
                    f"  NOT removing stale role '{stale.name}' — {stale.staff.count()} staff still assigned to it."
                ))
                continue
            self.stdout.write(f"  Removing stale system role: {stale.name}")
            stale.delete()

        super_admin_role = Role.objects.get(name="super_admin")
        backfilled = 0
        for user in User.objects.filter(is_superuser=True):
            _profile, created = StaffProfile.objects.get_or_create(
                user=user, defaults={"role": super_admin_role, "status": "active"}
            )
            if created:
                backfilled += 1
        self.stdout.write(self.style.SUCCESS(f"Backfilled StaffProfile for {backfilled} existing superuser(s)."))
