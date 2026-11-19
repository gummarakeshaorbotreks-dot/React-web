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

    def test_organiser_facts_count_when_organisers_agree(self):
        one = dep("Blue Ridge", "Kudremukh", "Bengaluru", trip={"difficulty": "extreme", "best_months": [11, 10, 12], "trail_km": 18.0, "altitude_m": 1894})
        same_org_other_city = dep("Blue Ridge", "Kudremukh", "Mysuru", trip={"difficulty": "extreme", "best_months": [10, 11, 12]})
        facts, notes = va.organiser_facts([one, same_org_other_city])
        self.assertEqual(facts, {"difficulty": "difficult", "months": [10, 11, 12], "trail_km": 18, "altitude_m": 1894})
        self.assertEqual(notes, [])
        other = dep("Peak Co", "Kudremukh", "Bengaluru", trip={"difficulty": "moderate", "best_months": [11, 12, 1], "trail_km": 19.5, "altitude_m": 1650})
        facts, notes = va.organiser_facts([one, other])
        self.assertEqual(facts, {"months": [11, 12], "trail_km": 18})  # difficulty + height differ: left out
        self.assertIn("organisers differ on difficulty", notes)
        self.assertIn("organisers differ on height", notes)
        self.assertEqual(va.organiser_facts([dep("A", "X", "Y", trip={"difficulty": None})]), ({}, []))
        apart = [dep("A", "X", "Y", trip={"best_months": [6, 7]}), dep("B", "X", "Y", trip={"best_months": [12, 1]})]
        self.assertEqual(va.organiser_facts(apart), ({}, ["organisers' best months don't overlap"]))

    def test_height_open_data_wins_organiser_fills_the_gap(self):
        facts, notes, meta = {}, [], {}
        va.settle_height(facts, notes, meta, 1700, (1894, "Kudremukh", None, (1894, 1894)))
        self.assertEqual((facts["altitude_m"], meta["altitude_m"]), (1894, "open-data"))
        self.assertTrue(any("differs from open data" in n for n in notes))
        facts, notes, meta = {}, [], {}
        va.settle_height(facts, notes, meta, 1650, (None, None, "no height in open data", (None, None)))
        self.assertEqual((facts["altitude_m"], meta["altitude_m"]), (1650, "organiser"))
        facts, notes, meta = {}, [], {}
        va.settle_height(facts, notes, meta, 1650, (None, None, "height not confirmed", (1200, None)))
        self.assertNotIn("altitude_m", facts)  # open data says 1,200 m: the organiser's 1,650 m is left out
        self.assertTrue(notes)

    def test_wrong_command_and_blocks(self):
        self.assertEqual(va.parse_wrong("/wrong kudremukh-trek"), ("kudremukh-trek", "*"))
        self.assertEqual(va.parse_wrong("/wrong@AorboBot Coorg-Trek height"), ("coorg-trek", "altitude_m"))
        self.assertEqual(va.parse_wrong("/wrong coorg-trek colour"), ("coorg-trek", None))
        self.assertIsNone(va.parse_wrong("wrong coorg"))
        self.assertIsNone(va.parse_wrong("/wrong ../etc"))
        f = {"name": "Coorg", "altitude_m": 1715, "top": "Tadiandamol", "rail": "Mysuru Junction", "months": [10, 11]}
        self.assertEqual(va.without_blocked(f, ["altitude_m"]), {"name": "Coorg", "rail": "Mysuru Junction", "months": [10, 11]})
        self.assertEqual(va.without_blocked(f, ["*"]), {"name": "Coorg"})
        self.assertEqual(va.without_blocked(f, None), f)

    def test_nearest_from_our_copies_and_deps_for(self):
        rows = [["Mysuru Junction", 12.3166, 76.6450], ["Far Away", 28.6, 77.2]]
        self.assertEqual([n for n, _ in va.nearest(rows, 12.30, 76.65, 120)], ["Mysuru Junction"])
        feed = {"departures": [dep("A", "Kudremukh Trek", "Bengaluru"), dep("B", "Coorg", "Mysuru")]}
        self.assertEqual(len(va.deps_for(feed, "Kudremukh")), 1)
        self.assertEqual(va.deps_for(feed, ""), [])

    def test_busy_while_the_last_run_works(self):
        from datetime import datetime, timedelta
        now = datetime(2026, 11, 19, 21, 0)
        self.assertFalse(va.busy(None, now))
        self.assertTrue(va.busy({"started": "2026-11-19T20:50:00"}, now))
        self.assertFalse(va.busy({"started": "2026-11-19T20:50:00", "finished": "2026-11-19T20:55:00"}, now))
        self.assertFalse(va.busy({"started": (now - timedelta(minutes=45)).isoformat()}, now))  # a crashed run frees up


if __name__ == "__main__":
    unittest.main()
