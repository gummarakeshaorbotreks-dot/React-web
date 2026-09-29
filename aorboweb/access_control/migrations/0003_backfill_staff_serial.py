from django.db import migrations


def backfill_serials(apps, schema_editor):
    StaffProfile = apps.get_model('access_control', 'StaffProfile')
    StaffSerialCounter = apps.get_model('access_control', 'StaffSerialCounter')
    counter, _ = StaffSerialCounter.objects.get_or_create(id=1)
    for profile in StaffProfile.objects.filter(staff_serial="").order_by("id"):
        counter.last_number += 1
        counter.save(update_fields=["last_number"])
        profile.staff_serial = f"AORBO{counter.last_number:05d}"
        profile.save(update_fields=["staff_serial"])


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('access_control', '0002_staffserialcounter_staffprofile_staff_serial'),
    ]

    operations = [
        migrations.RunPython(backfill_serials, noop_reverse),
    ]
