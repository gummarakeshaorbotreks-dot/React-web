"""python -m unittest test_destinations — destination links (destinations.py), 30 Oct 2026.

Gemini put the Kedarnath yatra under Kedarkantha (similar name, different place). A destination
the package's own name and places never mention is now dropped only after two separate "no"s.
No Gemini calls here: its answers are faked.
"""
import unittest
from unittest import mock

import destinations as D

KEDARNATH = {"id": "kedarnath-yatra", "name": "Kedarnath", "state": "Uttarakhand",
             "places": ["Kedarnath Trek Route (Gaurikund → Kedarnath)", "Snow Trails & Meadows"]}
TADIANDAMOL = {"id": "tadiandamol", "name": "Tadiandamol", "state": "Karnataka", "places": ["Tadiandamol Peak"]}
MYSURU = {"id": "coorg-mysore", "name": "Coorg-Chikkamagaluru-Mysuru", "state": "Karnataka", "places": ["Abbey Falls"]}
BY_ID = {p["id"]: p for p in (KEDARNATH, TADIANDAMOL, MYSURU)}
CANON = {"kedarnath": "Kedarnath", "kedarkantha": "Kedarkantha", "coorg": "Coorg", "kodagu": "Coorg", "mysore": "Mysore"}


def gemini(says):
    """A fake generate_json answering from {(package name, destination): [first, second] answers}."""
    asked = {}

    def answer(prompt, schema=None, **kw):
        import json
        items = json.loads(prompt[prompt.index("["):])
        out = []
        for it in items:
            key = (it["package"], it["destination"])
            n = asked.get(key, 0)
            asked[key] = n + 1
            if key in says and n < len(says[key]) and says[key][n] is not None:
                out.append({"n": it["n"], "visits": says[key][n]})
        return {"answers": out}
    return answer


def cache():
    return {"kedarnath-yatra": {"name": "Kedarnath", "dests": ["Kedarnath", "Kedarkantha"]},
            "tadiandamol": {"name": "Tadiandamol", "dests": ["Tadiandamol", "Coorg"]},
            "coorg-mysore": {"name": "Coorg-Chikkamagaluru-Mysuru", "dests": ["Coorg", "Mysore"]}}


class DropUnconfirmed(unittest.TestCase):
    def run_with(self, says):
        with mock.patch.object(D, "generate_json", gemini(says)):
            return D.drop_unconfirmed(cache(), BY_ID, CANON)

    def test_named_in_the_package_is_never_asked(self):
        self.assertTrue(D.named_in(KEDARNATH, {"Kedarnath"}))
        self.assertTrue(D.named_in(TADIANDAMOL, {"Tadiandamol"}))
        self.assertFalse(D.named_in(KEDARNATH, {"Kedarkantha", "kedarkantha"}))

    def test_similar_name_different_place_is_dropped(self):
        c = self.run_with({("Kedarnath", "Kedarkantha"): [False, False],
                           ("Tadiandamol", "Coorg"): [True], ("Coorg-Chikkamagaluru-Mysuru", "Mysore"): [True]})
        self.assertEqual(c["kedarnath-yatra"]["dests"], ["Kedarnath"])
        self.assertEqual(c["tadiandamol"]["dests"], ["Tadiandamol", "Coorg"])
        self.assertEqual(c["coorg-mysore"]["dests"], ["Coorg", "Mysore"])
        self.assertTrue(all(v["checked"] for v in c.values()))

    def test_one_no_is_not_enough(self):
        c = self.run_with({("Kedarnath", "Kedarkantha"): [False, True],
                           ("Tadiandamol", "Coorg"): [True], ("Coorg-Chikkamagaluru-Mysuru", "Mysore"): [False, True]})
        self.assertEqual(c["kedarnath-yatra"]["dests"], ["Kedarnath", "Kedarkantha"])
        self.assertEqual(c["coorg-mysore"]["dests"], ["Coorg", "Mysore"])

    def test_unanswered_is_kept_and_asked_again_next_run(self):
        c = self.run_with({("Tadiandamol", "Coorg"): [True], ("Coorg-Chikkamagaluru-Mysuru", "Mysore"): [True],
                           ("Kedarnath", "Kedarkantha"): [False, None]})
        self.assertEqual(c["kedarnath-yatra"]["dests"], ["Kedarnath", "Kedarkantha"])
        self.assertFalse(c["kedarnath-yatra"]["checked"])
        self.assertTrue(c["tadiandamol"]["checked"])

    def test_checked_packages_are_not_asked_again(self):
        c = cache()
        for v in c.values():
            v["checked"] = True
        with mock.patch.object(D, "generate_json", side_effect=AssertionError("asked again")):
            self.assertEqual(D.drop_unconfirmed(c, BY_ID, CANON), c)


if __name__ == "__main__":
    unittest.main()
