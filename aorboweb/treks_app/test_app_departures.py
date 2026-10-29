"""App departures on the website (30 Oct 2026): which page shows which app destination,
and how a feed departure becomes a Departure city. No database:
    python -m unittest treks_app.test_app_departures      (or manage.py test treks_app.test_app_departures)
"""

import unittest
from datetime import time

from treks_app import app_departures as rules

FEED_DEP = {
    "key": "a1b2c3d4e5f60718",
    "destination": {"id": 12, "name": "Gokarna", "state": "Karnataka"},
    "city": {"id": 5, "name": "bangalore"},
    "pickupPoint": "majestic bus stand",
    "departureTime": "21:30",
    "transport": "bus",
    "days": "Fri, Sat",
    "nextDate": "2026-11-06",
    "priceFrom": 4200,
    "organiser": {"id": 82, "name": "blue ridge treks"},
    "bookUrl": "https://aorbotreks.co.in/t/AbCd2345",
}


class PagesFor(unittest.TestCase):
    DEST = {12: "Gokarna", 40: "Wayanad Munnar Gokarna", 7: "Hampi"}

    def test_exact_name_only(self):
        treks = [("gokarna", "Gokarna", ""), ("gokarna-dandeli", "Gokarna-Dandeli", ""), ("hampi", "hampi", "")]
        self.assertEqual(rules.pages_for(treks, self.DEST), {12: ["gokarna"], 7: ["hampi"]})

    def test_explicit_ids_win_and_can_list_several(self):
        treks = [("south-loop", "South India Loop", "40, 7"), ("gokarna", "Gokarna", "")]
        self.assertEqual(rules.pages_for(treks, self.DEST), {40: ["south-loop"], 7: ["south-loop"], 12: ["gokarna"]})

    def test_ids_not_in_the_feed_are_ignored(self):
        self.assertEqual(rules.pages_for([("x", "X", "999")], self.DEST), {})


class ToRow(unittest.TestCase):
    def test_tidied_like_the_admin_form(self):
        row = rules.to_row(FEED_DEP)
        self.assertEqual(row["city"], "Bengaluru")
        self.assertEqual(row["pickup_point"], "Majestic Bus Stand")
        self.assertEqual(row["departure_time"], time(21, 30))
        self.assertEqual(row["price_from"], 4200)
        self.assertEqual(row["days"], "Fri, Sat")
        self.assertEqual(row["operator_name"], "Blue Ridge Treks")
        self.assertEqual(row["book_url"], "https://aorbotreks.co.in/t/AbCd2345")

    def test_a_link_that_is_not_ours_is_dropped(self):
        self.assertEqual(rules.to_row({**FEED_DEP, "bookUrl": "https://evil.example/t/AbCd2345"})["book_url"], "")

    def test_bad_rows_are_refused(self):
        for bad in ({"priceFrom": 0}, {"departureTime": "25:00"}, {"organiser": {"name": " "}}, {"pickupPoint": "x"}):
            with self.subTest(bad=bad), self.assertRaises(ValueError):
                rules.to_row({**FEED_DEP, **bad})

    def test_app_key_is_stable_per_page(self):
        self.assertEqual(rules.app_key("a1b2c3d4e5f60718", "gokarna"), "a1b2c3d4e5f60718:gokarna")


if __name__ == "__main__":
    unittest.main()
