from django.db import migrations, models


class Migration(migrations.Migration):
    """Real departures from the Aorbo app (30 Oct 2026, treks_app/app_departures.py)."""

    dependencies = [
        ('treks_app', '0021_trekdeparture'),
    ]

    operations = [
        migrations.AddField(
            model_name='treklist',
            name='app_destination_ids',
            field=models.CharField(
                blank=True, default='', max_length=200,
                help_text="Aorbo app destination IDs whose real departures show on this page, e.g. 12, 40. "
                          "Leave empty to use the app destination with exactly this trek's name."),
        ),
        migrations.AddField(
            model_name='trekdeparture',
            name='source',
            field=models.CharField(
                choices=[('manual', 'Entered here'), ('app', 'From the Aorbo app')], default='manual', max_length=10,
                help_text="Rows from the Aorbo app update themselves; change them in the vendor's trek."),
        ),
        migrations.AddField(
            model_name='trekdeparture',
            name='app_key',
            field=models.CharField(blank=True, editable=False, max_length=64, null=True, unique=True),
        ),
        migrations.AddField(
            model_name='trekdeparture',
            name='book_url',
            field=models.URLField(blank=True, default='', max_length=200, help_text='Booking link in the Aorbo app.'),
        ),
    ]
