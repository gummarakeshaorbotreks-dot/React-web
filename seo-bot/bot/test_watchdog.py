"""python -m unittest test_watchdog  (pure part of watchdog.py)."""
import unittest

import watchdog as wd


class WatchdogTest(unittest.TestCase):
    def test_problems(self):
        self.assertEqual(wd.problems_now(True, True, 1.5), [])
        self.assertEqual(wd.problems_now(False, False, 3), ["n8n is not running"])
        self.assertEqual(wd.problems_now(True, False, 3), ["n8n is not answering"])
        self.assertEqual(wd.problems_now(True, True, 30), ["the vendor agent last checked 30 min ago (every 2 min expected)"])
        self.assertEqual(wd.problems_now(True, True, None), ["the vendor agent has never checked in"])

    def test_minutes_since(self):
        self.assertIsNone(wd.minutes_since(None))
        self.assertIsNone(wd.minutes_since("not a date"))
        self.assertLess(wd.minutes_since(wd.datetime.now().isoformat()), 1)


if __name__ == "__main__":
    unittest.main()
