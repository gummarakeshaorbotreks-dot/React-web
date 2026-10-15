from django.conf import settings
from django.db import migrations


def grant_staff_to_active_profiles(apps, schema_editor):
    """Accounts created before signals.sync_is_staff_with_profile existed may
    have a role but "Staff status" left unticked, which locks them out of the
    admin. Only ever grants; never removes access from anyone."""
    StaffProfile = apps.get_model('access_control', 'StaffProfile')
    User = apps.get_model(settings.AUTH_USER_MODEL)
    user_ids = StaffProfile.objects.filter(status="active").values_list("user_id", flat=True)
    User.objects.filter(pk__in=list(user_ids), is_staff=False).update(is_staff=True)


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('access_control', '0003_backfill_staff_serial'),
    ]

    operations = [
        migrations.RunPython(grant_staff_to_active_profiles, noop_reverse),
    ]
