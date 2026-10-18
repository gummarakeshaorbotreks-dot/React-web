from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    """Departure cities for the "<destination> trip from <city>" pages (18 Oct 2026)."""

    dependencies = [
        ('treks_app', '0020_seooverride'),
    ]

    operations = [
        migrations.CreateModel(
            name='TrekDeparture',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('city', models.CharField(help_text='The city the trip leaves from, e.g. Hyderabad, Bengaluru.', max_length=60)),
                ('pickup_point', models.CharField(help_text='Where travellers board, e.g. Ameerpet Metro Station.', max_length=200)),
                ('departure_time', models.TimeField(help_text='When the vehicle leaves the pickup point.')),
                ('price_from', models.PositiveIntegerField(help_text='Lowest price per person from this city, in rupees.')),
                ('days', models.CharField(blank=True, help_text="Days it leaves from this city, e.g. Fri, Sat. Empty = the trek's departure days.", max_length=100)),
                ('is_active', models.BooleanField(default=True, help_text='Untick when it no longer runs (the page updates on the next rebuild).')),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('operator', models.ForeignKey(blank=True, help_text='The organiser that runs this departure.', null=True, on_delete=django.db.models.deletion.SET_NULL, to='treks_app.operator')),
                ('trek', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='departures', to='treks_app.treklist')),
            ],
            options={
                'verbose_name': 'Departure city',
                'verbose_name_plural': 'Departure cities',
                'ordering': ['city', 'departure_time'],
            },
        ),
    ]
