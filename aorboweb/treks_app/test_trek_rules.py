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

    def test_corrects_typos(self):
        self.assertEqual(rules.normalize_operating_days("thr,fri,sat"), "Thu, Fri, Sat")  # found on the site
        self.assertEqual(rules.normalize_operating_days("fir, satur"), "Fri, Sat")
        self.assertEqual(rules.normalize_operating_days("THURSDAY"), "Thu")

    def test_refuses_non_days(self):
        with self.assertRaises(ValueError):
            rules.normalize_operating_days("xyz")


class NamePositionDescriptionRuleTests(SimpleTestCase):
    def test_name(self):
        self.assertEqual(rules.check_name("Coorg 4-Day Trip", {"coorg": "Coorg"}), "Coorg 4-Day Trip")
        with self.assertRaises(ValueError):
            rules.check_name("Coorg", {"coorg": "coorg"})  # same name as another package
        self.assertEqual(rules.check_name("char dham yatra", {}), "Char Dham Yatra")  # capitals added

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


class CapitalsRuleTests(SimpleTestCase):
    def test_title_case(self):
        self.assertEqual(rules.title_case("Ananthagiri hills"), "Ananthagiri Hills")
        self.assertEqual(rules.title_case("Manali-kasol"), "Manali-Kasol")
        self.assertEqual(rules.title_case("Rajgad to Torna fort"), "Rajgad to Torna Fort")
        self.assertEqual(rules.title_case("McLeod Ganj trek"), "McLeod Ganj Trek")
        self.assertEqual(rules.title_case("cute vogayes"), "Cute Vogayes")

    def test_places(self):
        self.assertEqual(rules.tidy_place("malpe beach"), "Malpe Beach")
        self.assertEqual(rules.tidy_place("RK beach"), "RK Beach")
        self.assertEqual(rules.tidy_place("forest Trekking Trail (6 km)"), "Forest Trekking Trail (6 km)")
        self.assertEqual(rules.tidy_place("Pratapgad Fort – Historic Maratha fort"), "Pratapgad Fort – Historic Maratha fort")

    def test_activities(self):
        self.assertEqual(rules.tidy_activities("Water Sports,\nboat ride,\nbonfire & music."),
                         "Water Sports, Boat ride, Bonfire & music")
        # The admin's text box sends Windows line breaks; one bad run left "\r" items behind.
        self.assertEqual(rules.tidy_activities('Cycling,\r\nTent Pitching,\r\nAdventure Rope Activities",\r\n'),
                         "Cycling, Tent Pitching, Adventure Rope Activities")
        self.assertEqual(rules.tidy_activities("Cycling, \r, Tent Pitching, \r, Camping"), "Cycling, Tent Pitching, Camping")


class DepartureCityRuleTests(SimpleTestCase):
    """Departure cities (18 Oct 2026): one spelling per city, as on the "Treks near <city>" pages."""

    def test_maps_popular_spellings_to_the_official_name(self):
        for typed, official in (("bangalore", "Bengaluru"), ("Bangalore ", "Bengaluru"), ("BENGALURU", "Bengaluru"),
                                ("vizag", "Visakhapatnam"), ("mysore", "Mysuru"), ("Gurgaon", "Gurugram")):
            with self.subTest(typed=typed):
                self.assertEqual(rules.normalize_city(typed), official)

    def test_title_cases_other_cities(self):
        self.assertEqual(rules.normalize_city("hyderabad"), "Hyderabad")
        self.assertEqual(rules.normalize_city("  navi   mumbai "), "Navi Mumbai")

    def test_refuses_what_is_not_a_city_name(self):
        for wrong in ("", "  ", "Hyd123", "<script>", "https://x.in", "a"):
            with self.subTest(wrong=wrong), self.assertRaises(ValueError):
                rules.normalize_city(wrong)

    def test_pickup_point(self):
        self.assertEqual(rules.tidy_pickup("ameerpet metro station"), "Ameerpet Metro Station")
        for wrong in ("", "ab", "see https://maps.app", "<b>gate</b>"):
            with self.subTest(wrong=wrong), self.assertRaises(ValueError):
                rules.tidy_pickup(wrong)
