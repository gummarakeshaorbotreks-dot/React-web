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


class PagePlaces(unittest.TestCase):
    def test_package_names_become_places(self):
        cases = {
            "Ooty-Coonoor-Isha Foundation": ["ooty", "coonoor", "ishafoundation"],
            "Coorg 4-Day Trip": ["coorg"],
            "Kedarkantha Trek": ["kedarkantha"],
            "Char Dham Yatra": ["chardham"],
            "Araku-Vizag": ["araku", "visakhapatnam"],
            "Leh Ladakh": ["lehladakh"],
        }
        for name, places in cases.items():
            with self.subTest(name=name):
                self.assertEqual(rules.page_places(name), places)

    def test_same_place_across_spellings(self):
        self.assertTrue(rules.same_place(rules.place_key("Munnar Tea Gardens"), rules.place_key("Munnar")))
        self.assertTrue(rules.same_place(rules.place_key("Dwaraka"), rules.place_key("Dwarka")))
        self.assertTrue(rules.same_place(rules.place_key("Kodagu"), rules.place_key("Coorg")))
        self.assertTrue(rules.same_place(rules.place_key("Leh"), "lehladakh"))
        self.assertFalse(rules.same_place("goa", "goavelhabeachresort"))  # 3 letters: too short to be a prefix match


class PagesFor(unittest.TestCase):
    # Real website package names; app destinations as the feed sends them (their places).
    TREKS = [("gokarna", "Gokarna", ""), ("gokarna-dandeli", "Gokarna-Dandeli", ""), ("dandeli", "Dandeli", ""),
             ("munnar", "Munnar", ""), ("wayanad", "Wayanad", ""), ("ooty-coonoor", "Ooty-Coonoor", ""),
             ("coorg-trek", "Coorg Trek", ""), ("coorg-4-day", "Coorg 4-Day Trip", "")]

    def test_same_places_get_the_package_itself(self):
        out = rules.pages_for(self.TREKS, {12: ["Gokarna"], 20: ["Gokarna", "Dandeli"], 5: ["Coorg"]})
        self.assertEqual(out[12], [("gokarna", "")])
        self.assertEqual(out[20], [("gokarna-dandeli", "")])  # not the one-place Gokarna / Dandeli pages
        self.assertEqual(out[5], [("coorg-trek", ""), ("coorg-4-day", "")])

    def test_a_trip_with_no_same_package_shows_on_its_places_pages_with_its_own_name(self):
        out = rules.pages_for(self.TREKS, {40: ["Wayanad", "Munnar", "Gokarna"]})
        self.assertEqual(sorted(out[40]), [("gokarna", "Wayanad · Munnar · Gokarna"), ("munnar", "Wayanad · Munnar · Gokarna"),
                                           ("wayanad", "Wayanad · Munnar · Gokarna")])

    def test_a_place_with_no_page_of_its_own_uses_the_packages_that_visit_it(self):
        self.assertEqual(rules.pages_for(self.TREKS, {9: ["Coonoor"]})[9], [("ooty-coonoor", "Coonoor")])

    def test_a_place_the_website_has_no_page_for_is_left_out(self):
        self.assertEqual(rules.pages_for(self.TREKS, {77: ["Taj Mahal"]}), {})

    def test_explicit_ids_still_override(self):
        treks = self.TREKS + [("south-loop", "South India Loop", "40")]
        self.assertEqual(rules.pages_for(treks, {40: ["Wayanad", "Munnar", "Gokarna"]})[40], [("south-loop", "")])


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
