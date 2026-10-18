"""The API's ready-to-show trek text (display.py) gives exactly what the website shows."""
import json
from pathlib import Path

from django.test import SimpleTestCase

from . import display

CASES = json.loads((Path(__file__).parent / "display_cases.json").read_text(encoding="utf-8"))


class SameAsWebsiteTests(SimpleTestCase):
    def test_price(self):
        for value, expected in CASES["price"]:
            with self.subTest(value=value):
                self.assertEqual(display.format_price(value), expected)

    def test_durations_every_option_in_full(self):
        for value, expected in CASES["durations"]:
            with self.subTest(value=value):
                self.assertEqual(display.duration_options(value), expected)

    def test_departure_days(self):
        for value, expected in CASES["days"]:
            with self.subTest(value=value):
                self.assertEqual(display.departure_days(value), expected)


class TrekDisplayTests(SimpleTestCase):
    def test_card_and_detail(self):
        d = display.trek_display("Chopta Trek", "Uttarakhand", 8000, "2D/1N, 3D/2N", "FRI, SAT, SUN")
        self.assertEqual(d["card"], {
            "kicker": "₹8,000 onwards",
            "title": "Chopta Trek",
            "meta": "Uttarakhand · Fri, Sat, Sun",
            "description": "2 Days / 1 Night, 3 Days / 2 Nights",
        })
        self.assertEqual(d["detail"]["price_label"], "₹8,000 onwards")
        self.assertEqual([f["label"] for f in d["detail"]["facts"]], ["Duration", "Departure"])
        self.assertEqual(d["detail"]["facts"][1]["options"], ["Fri", "Sat", "Sun"])

    def test_nothing_made_up(self):
        d = display.trek_display("New Trek", "Kerala", None, "", "")
        self.assertIsNone(d["price"])
        self.assertEqual(d["card"]["kicker"], "Kerala")
        self.assertEqual(d["card"]["description"], "")
        self.assertEqual(d["detail"]["facts"], [])

    def test_never_a_range(self):
        d = display.trek_display("X", "", 1, "2D/1N,3D/2N,4D/3N,5D/4N", "")
        self.assertNotRegex(d["duration_text"], r"\d\s*[–-]\s*\d")
