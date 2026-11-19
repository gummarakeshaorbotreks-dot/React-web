"""python -m unittest test_vendor_agent  (pure helpers of vendor_agent.py; no network)."""
import unittest

import vendor_agent as va


def dep(org, dest, city, **extra):
    return {"organiser": {"name": org}, "destination": {"name": dest}, "city": {"name": city}, "nextDate": "2026-12-01", **extra}


class VendorAgentTest(unittest.TestCase):
    def test_digest_ignores_the_moving_next_date(self):
        a = {"departures": [dep("Blue Ridge", "Gokarna", "Bengaluru")]}
        b = {"departures": [{**dep("Blue Ridge", "Gokarna", "Bengaluru"), "nextDate": "2026-12-08"}]}
        self.assertEqual(va.feed_digest(a), va.feed_digest(b))
        c = {"departures": [{**dep("Blue Ridge", "Gokarna", "Bengaluru"), "priceFrom": 4999}]}
        self.assertNotEqual(va.feed_digest(a), va.feed_digest(c))

    def test_changes_say_who_added_what(self):
        old = {"departures": [dep("Blue Ridge", "Gokarna", "Bengaluru"), dep("Old Co", "Coorg", "Mysuru")]}
        new = {"departures": [dep("Blue Ridge", "Gokarna", "Bengaluru"), dep("Blue Ridge", "Gokarna", "Hyderabad"),
                              dep("Blue Ridge", "Kudremukh", "Bengaluru"), dep("Peak Co", "Kedarkantha", "Delhi")]}
        lines = va.feed_changes(old, new)
        self.assertIn("➕ Blue Ridge: Gokarna now also from Hyderabad", lines)
        self.assertIn("➕ Blue Ridge: Kudremukh from Bengaluru", lines)
        self.assertIn("🆕 Peak Co: Kedarkantha from Delhi", lines)
        self.assertIn("⏸ Old Co: no bookable dates now", lines)

    def test_place_name_and_kind(self):
        self.assertEqual(va.place_name("Kudremukh Trek"), "Kudremukh")
        self.assertEqual(va.place_name("Kedarkantha Winter Trek 5D"), "Kedarkantha")
        self.assertEqual(va.kind_of({"name": "Gokarna Beach Getaway", "activities": ["Beach hopping"]}), "trip")
        self.assertEqual(va.kind_of({"name": "Gokarna Beach Getaway", "activities": ["Beach Trekking"]}), "trek")
        self.assertEqual(va.kind_of({"name": "Skandagiri Night Trek"}), "trek")
        self.assertEqual(va.kind_of({"name": "Mathura Agra Ayodhya"}), "trip")

    def test_heights_must_agree(self):
        self.assertTrue(va.heights_agree(1646, 1646))
        self.assertTrue(va.heights_agree(1894, 1870))
        self.assertFalse(va.heights_agree(1712, 1226))
        self.assertFalse(va.heights_agree(None, 1500))

    def test_station_is_a_junction_when_there_is_one(self):
        self.assertEqual(va.best_station([("Shrivagilu", 20), ("Mysuru Junction", 105), ("Hunsur", 70)]), "Mysuru Junction")
        self.assertEqual(va.best_station([("Kasara", 25), ("Igatpuri", 30)]), "Kasara")
        self.assertIsNone(va.best_station([("Far Halt", 90)]))
        self.assertEqual(va.best_station([("Hirehalli", 8), ("Tumakuru", 20), ("Yelahanka Junction", 60)], "Tumakuru"), "Tumakuru")

    def test_osm_height_parsing(self):
        self.assertEqual(va.peak_ele({"ele": "1646"}), 1646.0)
        self.assertEqual(va.peak_ele({"ele": "1894 m"}), 1894.0)
        self.assertIsNone(va.peak_ele({"ele": "approx 5000 ft"}))


if __name__ == "__main__":
    unittest.main()
