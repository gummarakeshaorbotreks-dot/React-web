from django.db import migrations, models


class Migration(migrations.Migration):
    """Pages made automatically for app places the website had no page for (30 Oct 2026)."""

    dependencies = [
        ('treks_app', '0023_trekdeparture_trip_name'),
    ]

    operations = [
        migrations.AddField(
            model_name='treklist',
            name='from_app',
            field=models.BooleanField(default=False, help_text="Made automatically from the Aorbo app's real departures. The hourly sync keeps its price, days and duration up to date."),
        ),
        migrations.AlterField(
            model_name='treklist',
            name='app_destination_ids',
            field=models.CharField(blank=True, default='', help_text='Only for rare cases: Aorbo app destination IDs whose real departures show on this page, e.g. 12, 40. Leave empty: pages are matched to app trips by place automatically.', max_length=200),
        ),
    ]
