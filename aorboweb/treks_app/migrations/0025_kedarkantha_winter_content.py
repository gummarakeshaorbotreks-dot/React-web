"""Kedarkantha winter content (owner, 30 Oct 2026: "build it — this year, next year, it keeps working").

Kedarkantha peaks in Google every November–January (Desktop\\Aorbo-Search-Research). Its page had a
one-line description and no questions. This adds, as data in git:
  - a fuller description of the trek (only if the page still has the old one-liner);
  - search title, description and questions for /treks/kedarkantha-trek and /destinations/kedarkantha
    (SeoOverride, source "team", so the SEO bot never rewrites them).
Evergreen facts only — no prices, dates or durations, which change and come from the trek data.
Run again, it changes nothing; reverse removes only what it added.
"""

from django.db import migrations

TREK_ID = "kedarkantha-trek"
OLD_DESC = "Beautiful snow trek in Uttarakhand offering stunning views of snow-capped peaks."
NEW_DESC = (
    "Kedarkantha is a winter snow trek from Sankri village in Uttarkashi district, Uttarakhand. "
    "The trail climbs through pine and oak forest to Juda Ka Talab, a small lake that freezes in winter, "
    "then to the base camp and a summit at about 3,800 m (around 12,500 ft) with views across the Garhwal "
    "Himalaya. Snow usually lies on the trail from December to April."
)

SEASON = {
    "q": "When is the season for the Kedarkantha trek?",
    "a": "It is known as a winter trek: snow usually lies on the trail from December to April, "
         "with the most from late December to February. It can be done in spring and autumn too, without snow.",
}
START = {
    "q": "Where does the Kedarkantha trek start?",
    "a": "From Sankri, a village in Uttarkashi district, Uttarakhand. Sankri is reached by road from "
         "Dehradun, about 200 km away, which takes most of a day.",
}
OVERRIDES = [
    {
        "path": "/treks/kedarkantha-trek",
        "title": "Kedarkantha Trek: Winter Snow Trek in Uttarakhand | Aorbo Treks",
        "description": "Kedarkantha is a winter snow trek from Sankri in Uttarakhand, with a summit at about "
                       "3,800 m. See prices and organisers, and book on Aorbo Treks.",
        "faqs": [
            SEASON,
            START,
            {"q": "How high is Kedarkantha?",
             "a": "The summit is at about 3,800 m (around 12,500 ft). On the way the trail passes Juda Ka Talab, "
                  "a small lake that freezes in winter, and the Kedarkantha base camp."},
            {"q": "How difficult is the Kedarkantha trek?",
             "a": "It is an easy to moderate trek and a common first snow trek. Walking several hours a day in "
                  "snow needs reasonable fitness, so regular walking or jogging in the weeks before helps."},
            {"q": "How long is the Kedarkantha trek?",
             "a": "About 20 km on foot in all, from Sankri to the summit and back. Each organiser's itinerary "
                  "shows the day-by-day plan."},
            {"q": "What should I carry for the Kedarkantha trek in winter?",
             "a": "Warm layers (thermals, a fleece and a padded or down jacket), waterproof gloves, a woollen cap, "
                  "trekking shoes with a good grip, and sunglasses for the glare off the snow."},
        ],
    },
    {
        "path": "/destinations/kedarkantha",
        "title": "Kedarkantha Trek Packages: Winter Snow Trek | Aorbo Treks",
        "description": "Kedarkantha winter snow trek packages from Sankri, Uttarakhand. Compare organisers, "
                       "prices and dates, and book on Aorbo Treks.",
        "faqs": [SEASON, START],
    },
]
NOTE = "Kedarkantha winter content (migration 0025, 30 Oct 2026)"


def forwards(apps, schema_editor):
    TrekList = apps.get_model("treks_app", "TrekList")
    SeoOverride = apps.get_model("treks_app", "SeoOverride")
    TrekList.objects.filter(id=TREK_ID, short_desc=OLD_DESC).update(short_desc=NEW_DESC)
    for o in OVERRIDES:
        if not SeoOverride.objects.filter(path=o["path"]).exists():  # never overwrite the team's own
            SeoOverride.objects.create(active=True, source="team", note=NOTE, **o)


def backwards(apps, schema_editor):
    TrekList = apps.get_model("treks_app", "TrekList")
    SeoOverride = apps.get_model("treks_app", "SeoOverride")
    TrekList.objects.filter(id=TREK_ID, short_desc=NEW_DESC).update(short_desc=OLD_DESC)
    SeoOverride.objects.filter(note=NOTE).delete()


class Migration(migrations.Migration):
    dependencies = [
        ("treks_app", "0024_treklist_from_app"),
    ]

    operations = [
        migrations.RunPython(forwards, backwards),
    ]
