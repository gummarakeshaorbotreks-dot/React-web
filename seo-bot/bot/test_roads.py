"""python -m unittest test_roads  (pure parts of roads.py)."""
import unittest

import roads


class RoadsTest(unittest.TestCase):
    def test_road_of(self):
        ans = {"code": "Ok", "routes": [{"distance": 331240.5, "duration": 22880.0, "legs": [{"summary": "NH75, NH73"}]}],
               "waypoints": [{"distance": 12.0}, {"distance": 840.0}]}
        self.assertEqual(roads.road_of(ans, "2026-11-19"), {"km": 331.2, "min": 381, "via": "NH75, NH73", "snap_km": 0.84, "at": "2026-11-19"})
        self.assertIsNone(roads.road_of({"code": "NoRoute"}, "2026-11-19"))
        self.assertIsNone(roads.road_of(None, "2026-11-19"))

    def test_todo(self):
        cands = [{"key": "bangalore|a"}, {"key": "bangalore|b"}, {"key": "pune|c"}]
        cur = {"bangalore|a": {"at": "2026-11-01"}, "pune|c": {"at": "2026-01-01"}}
        self.assertEqual([c["key"] for c in roads.todo_pairs(cands, cur, "2026-11-19")], ["bangalore|b", "pune|c"])
        self.assertEqual(len(roads.todo_pairs(cands, {}, "2026-11-19", limit=2)), 2)
