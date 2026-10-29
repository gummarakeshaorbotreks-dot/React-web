from django.db import migrations, models


class Migration(migrations.Migration):
    """An app trip shown on a package with other places keeps its own name (30 Oct 2026)."""

    dependencies = [
        ('treks_app', '0022_app_departures'),
    ]

    operations = [
        migrations.AddField(
            model_name='trekdeparture',
            name='trip_name',
            field=models.CharField(blank=True, default='', max_length=200),
        ),
    ]
