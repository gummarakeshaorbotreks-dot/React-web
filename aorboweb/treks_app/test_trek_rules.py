"""The trek entry rules (trek_rules.py), with the real mistakes found on the live site."""
from django.test import SimpleTestCase

from . import trek_rules as rules


class DurationRuleTests(SimpleTestCase):
    def test_tidies_valid_formats(self):
        self.assertEqual(rules.normalize_duration("3D/2N,2D/1N"), "2D/1N, 3D/2N")
        self.assertEqual(rules.normalize_duration("3D / 2N"), "3D/2N")
        self.assertEqual(rules.normalize_duration("2D-1N, 3D-2N"), "2D/1N, 3D/2N")
        self.assertEqual(rules.normalize_duration("1D"), "1D")
        self.assertEqual(rules.normalize_duration("1D/1N"), "1D/1N")  # overnight start
        self.assertEqual(rules.normalize_duration("4 Days"), "4D")

    def test_refuses_mistakes_found_on_the_site(self):
        for wrong in ("D/2N,4D/3N", "4D/3N,6D/5D", "6N/7D", "3D/4N, 2D/3N", "", "three days"):
            with self.subTest(wrong=wrong), self.assertRaises(ValueError):
                rules.normalize_duration(wrong)

    def test_swapped_order_says_how_to_fix(self):
        with self.assertRaisesRegex(ValueError, "8D/7N"):
            rules.normalize_duration("7N/8D")


class StateRuleTests(SimpleTestCase):
    def test_tidies(self):
        self.assertEqual(rules.normalize_state("karnataka"), "Karnataka")
        self.assertEqual(rules.normalize_state("Kerala,Tamilnadu"), "Kerala, Tamil Nadu")
        self.assertEqual(rules.normalize_state("Jammu and Kashmir"), "Jammu and Kashmir")
        self.assertEqual(rules.normalize_state("Uttar pradesh , Nepal"), "Uttar Pradesh, Nepal")
        self.assertEqual(rules.normalize_state("Pondicherry"), "Puducherry")

    def test_refuses_unknown(self):
        for wrong in ("", "Himachal", "Karnatka", "Goa beach"):
            with self.subTest(wrong=wrong), self.assertRaises(ValueError):
                rules.normalize_state(wrong)


class DepartureDayRuleTests(SimpleTestCase):
    def test_tidies(self):
        self.assertEqual(rules.normalize_operating_days("THU, FRI, SAT"), "Thu, Fri, Sat")
        self.assertEqual(rules.normalize_operating_days("sat,fri"), "Fri, Sat")
        self.assertEqual(rules.normalize_operating_days("daily"), "Daily")

    def test_refuses_typos(self):
        with self.assertRaises(ValueError):
            rules.normalize_operating_days("thr,fri,sat")


class NamePositionDescriptionRuleTests(SimpleTestCase):
    def test_name(self):
        self.assertEqual(rules.check_name("Coorg 4-Day Trip", {"coorg": "Coorg"}), "Coorg 4-Day Trip")
        with self.assertRaises(ValueError):
            rules.check_name("Coorg", {"coorg": "coorg"})  # same name as another package
        with self.assertRaises(ValueError):
            rules.check_name("char dham yatra", {})  # all lowercase

    def test_position(self):
        rules.check_position(None, None, {})
        rules.check_position(30.83, 78.55, {"x": (13.75, 79.70)})
        with self.assertRaises(ValueError):
            rules.check_position(15.924091, 80.186381, {"srikalahasti": (15.924091, 80.186381)})  # shared point
        with self.assertRaises(ValueError):
            rules.check_position(78.55, 30.83, {})  # swapped
        with self.assertRaises(ValueError):
            rules.check_position(30.83, None, {})

    def test_description(self):
        kerala = ("This journey takes you through the serene beauty of Kerala to the southernmost tip of India, "
                  "Kanyakumari. The route offers lush green landscapes, coconut groves and backwaters.")
        rules.check_description("A pilgrimage and heritage journey through Mathura, Agra and Ayodhya.", {"kerala": kerala})
        with self.assertRaises(ValueError):
            rules.check_description(kerala, {"kerala-kanyakumari": kerala})  # copied
        with self.assertRaises(ValueError):
            rules.check_description("Nice trek.", {})  # too short
