"""python -m unittest test_scorecard  (pure parts of scorecard.py)."""
import unittest

import scorecard as sc


class ScorecardTest(unittest.TestCase):
    def test_family(self):
        self.assertEqual(sc.family("https://aorbotreks.com/compare/a-vs-b"), "Compare")
        self.assertEqual(sc.family("https://aorbotreks.com/collections/best-treks-in-december"), "Collections")
        self.assertEqual(sc.family("https://aorbotreks.com/treks-near/mysuru"), "Treks near town")
        self.assertEqual(sc.family("https://aorbotreks.com/treks/kudremukh"), "Trek pages")
        self.assertEqual(sc.family("https://aorbotreks.com/"), "Home + other")

    def test_on_track_and_change(self):
        self.assertEqual(sc.on_track(150, 300, 45), (150.0, True))
        self.assertEqual(sc.on_track(10, 300, 45)[1], False)
        self.assertEqual(sc.on_track(5, 10, 200)[0], 10)   # after day 90 the goal itself
        self.assertEqual(sc.pct_change(12, 10), "+20%")
        self.assertEqual(sc.pct_change(3, 0), "new")
        self.assertEqual(sc.pct_change(0, 0), "–")
