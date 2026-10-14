from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('treks_app', '0019_crashreport'),
    ]

    operations = [
        migrations.CreateModel(
            name='SeoOverride',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('path', models.CharField(help_text='Page address exactly as on the site, e.g. /treks/Coorg or /about', max_length=300, unique=True)),
                ('title', models.CharField(blank=True, help_text='Google shows about 60 characters', max_length=70)),
                ('description', models.CharField(blank=True, help_text='Google shows about 155 characters', max_length=170)),
                ('faqs', models.JSONField(blank=True, default=list, help_text='List of {"q": "question", "a": "answer"}; shown on the page')),
                ('active', models.BooleanField(default=True)),
                ('source', models.CharField(choices=[('team', 'Team'), ('bot', 'SEO bot')], default='team', max_length=10)),
                ('note', models.CharField(blank=True, help_text='Why it was changed', max_length=300)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'verbose_name': 'SEO override',
                'verbose_name_plural': 'SEO overrides',
                'ordering': ['path'],
            },
        ),
    ]
