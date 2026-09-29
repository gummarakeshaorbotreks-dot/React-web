import json
import os
from unittest.mock import patch

from django.conf import settings
from django.core.cache import cache
from django.test import TestCase, override_settings
from django.urls import reverse
from rest_framework.throttling import ScopedRateThrottle

# `ScopedRateThrottle.THROTTLE_RATES` is bound to `api_settings.DEFAULT_THROTTLE_RATES`
# once, at class-definition time (see rest_framework/throttling.py), so
# `override_settings(REST_FRAMEWORK=...)` does NOT change it for already-imported
# throttle classes. Tests that need a tight rate must patch the class attribute
# directly instead.
_TEST_THROTTLE_RATES = dict(settings.REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"])


class ContactSecurityTests(TestCase):
    """Regression tests for the contact-form hardening (throttling + email validation)."""

    def setUp(self):
        cache.clear()

    def _valid_payload(self, **overrides):
        payload = {
            "name": "Test User",
            "email": "test.user@example.com",
            "mobile": "9999999999",
            "user_type": "trekker",
            "comment": "Looking for a weekend trek.",
        }
        payload.update(overrides)
        return payload

    def test_missing_required_field_returns_400(self):
        payload = self._valid_payload(name="")
        response = self.client.post(
            "/api/contact-submit/",
            data=json.dumps(payload),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)

    def test_malformed_email_is_rejected(self):
        payload = self._valid_payload(email="not-an-email")
        response = self.client.post(
            "/api/contact-submit/",
            data=json.dumps(payload),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("valid email", response.json().get("error", ""))

    @override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
    def test_well_formed_submission_is_accepted(self):
        payload = self._valid_payload()
        response = self.client.post(
            "/api/contact-submit/",
            data=json.dumps(payload),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)

    @override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
    @patch.object(
        ScopedRateThrottle,
        "THROTTLE_RATES",
        {**_TEST_THROTTLE_RATES, "contact_submit": "2/min"},
    )
    def test_contact_endpoint_is_rate_limited_per_ip(self):
        """Before the fix, `contact` was a plain Django view with no DRF throttling at
        all, so it could be used as an unthrottled bulk-email relay. It must now reject
        requests once the per-IP scope limit is exceeded."""
        payload = self._valid_payload()

        first = self.client.post(
            "/api/contact-submit/", data=json.dumps(payload), content_type="application/json"
        )
        second = self.client.post(
            "/api/contact-submit/", data=json.dumps(payload), content_type="application/json"
        )
        third = self.client.post(
            "/api/contact-submit/", data=json.dumps(payload), content_type="application/json"
        )

        self.assertEqual(first.status_code, 200)
        self.assertEqual(second.status_code, 200)
        self.assertEqual(third.status_code, 429)

    def test_get_request_returns_405(self):
        response = self.client.get("/api/contact-submit/")
        self.assertEqual(response.status_code, 405)


class ScopedThrottleWiringTests(TestCase):
    """`ScopedRateThrottle` silently allows every request when `view.throttle_scope`
    is unset (see DRF's `ScopedRateThrottle.allow_request`). Setting `.throttle_scope`
    on a function *after* it has already been wrapped by `@api_view`/`@throttle_classes`
    is a no-op, because `api_view` copies the attribute onto the generated view class
    at decoration time. These tests guard against that regression on the two
    AI/write-heavy endpoints that must stay rate-limited."""

    def setUp(self):
        cache.clear()

    @patch.object(
        ScopedRateThrottle,
        "THROTTLE_RATES",
        {**_TEST_THROTTLE_RATES, "ai_enrich": "1/min"},
    )
    @patch("treks_app.utils.get_place_image", return_value=None)
    @patch(
        "treks_app.ai_enrichment.enrich_destination_with_ai",
        return_value={"summary": "test"},
    )
    def test_enrich_destination_endpoint_is_throttled(self, mock_enrich, mock_image):
        first = self.client.get("/api/enrich-destination/", {"name": "Test Peak"})
        second = self.client.get("/api/enrich-destination/", {"name": "Test Peak"})

        self.assertEqual(first.status_code, 200)
        self.assertEqual(second.status_code, 429)

    @patch.object(
        ScopedRateThrottle,
        "THROTTLE_RATES",
        {**_TEST_THROTTLE_RATES, "osm_draft_create": "1/min"},
    )
    @patch("treks_app.views.send_osm_draft_notification")
    @patch("treks_app.utils.get_place_image", return_value=None)
    @patch(
        "treks_app.ai_enrichment.enrich_destination_with_ai",
        return_value={"summary": "test", "activities": []},
    )
    def test_create_trek_from_osm_endpoint_is_throttled(
        self, mock_enrich, mock_image, mock_notify
    ):
        payload = {"name": "Brand New Peak A", "display_name": "Brand New Peak A, India"}
        first = self.client.post(
            "/api/treks/create-from-osm/",
            data=json.dumps(payload),
            content_type="application/json",
        )
        payload2 = {"name": "Brand New Peak B", "display_name": "Brand New Peak B, India"}
        second = self.client.post(
            "/api/treks/create-from-osm/",
            data=json.dumps(payload2),
            content_type="application/json",
        )

        self.assertIn(first.status_code, (200, 201))
        self.assertEqual(second.status_code, 429)


class HardeningRegressionTests(TestCase):
    """Guards against re-introducing the fixed vulnerabilities."""

    def test_axes_lockout_is_enabled(self):
        self.assertTrue(
            settings.AXES_ENABLED,
            "AXES_ENABLED must stay True - disabling it removes brute-force "
            "protection on the admin login form.",
        )

    def test_axes_middleware_is_last(self):
        self.assertEqual(
            settings.MIDDLEWARE[-1],
            "axes.middleware.AxesMiddleware",
            "django-axes requires AxesMiddleware to be the last entry in MIDDLEWARE.",
        )

    def test_force_http_middleware_not_installed(self):
        for entry in settings.MIDDLEWARE:
            self.assertNotIn(
                "force_http",
                entry.lower(),
                "ForceHttpMiddleware downgrades HTTPS requests to HTTP and must "
                "never be wired into MIDDLEWARE.",
            )

    def test_robots_txt_does_not_disclose_admin_path(self):
        robots_path = os.path.join(settings.BASE_DIR, "robots.txt")
        with open(robots_path, "r", encoding="utf-8") as f:
            content = f.read()
        self.assertNotIn(
            "supersecretadmin",
            content,
            "robots.txt must not disclose the admin panel path to crawlers/scanners.",
        )


class CrashReportTests(TestCase):
    def setUp(self):
        cache.clear()

    def test_missing_error_message_rejected(self):
        response = self.client.post(
            "/api/crash-report/", data=json.dumps({}), content_type="application/json"
        )
        self.assertEqual(response.status_code, 400)

    def test_valid_report_is_stored(self):
        from .models import CrashReport

        response = self.client.post(
            "/api/crash-report/",
            data=json.dumps({
                "error_message": "TypeError: cannot read properties of undefined",
                "platform": "web",
                "severity": "fatal",
                "route": "/treks/kedarkantha-trek",
                "stack_trace": "at Component (App.jsx:42)",
            }),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 201)
        report = CrashReport.objects.get()
        self.assertEqual(report.platform, "web")
        self.assertEqual(report.severity, "fatal")
        self.assertTrue(report.report_id.startswith("CR-WEB-"))
        self.assertFalse(report.is_resolved)

    def test_invalid_platform_and_severity_fall_back_to_defaults(self):
        from .models import CrashReport

        response = self.client.post(
            "/api/crash-report/",
            data=json.dumps({"error_message": "boom", "platform": "not-a-real-platform", "severity": "??"}),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 201)
        report = CrashReport.objects.get()
        self.assertEqual(report.platform, "web")
        self.assertEqual(report.severity, "error")

    def test_report_ids_are_unique_across_platforms(self):
        from .models import CrashReport

        for platform in ("web", "admin", "backend"):
            CrashReport.objects.create(platform=platform, error_message="x")
        ids = set(CrashReport.objects.values_list("report_id", flat=True))
        self.assertEqual(len(ids), 3)

    @patch.object(
        ScopedRateThrottle,
        "THROTTLE_RATES",
        {**settings.REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"], "crash_report": "2/min"},
    )
    def test_crash_report_endpoint_is_rate_limited(self):
        payload = {"error_message": "boom"}
        for _ in range(2):
            response = self.client.post(
                "/api/crash-report/", data=json.dumps(payload), content_type="application/json"
            )
            self.assertEqual(response.status_code, 201)
        third = self.client.post(
            "/api/crash-report/", data=json.dumps(payload), content_type="application/json"
        )
        self.assertEqual(third.status_code, 429)


class BackendCrashLoggingMiddlewareTests(TestCase):
    def test_unhandled_view_exception_is_persisted(self):
        from django.test import RequestFactory

        from .middleware import BackendCrashLoggingMiddleware
        from .models import CrashReport

        middleware = BackendCrashLoggingMiddleware(get_response=lambda r: None)
        request = RequestFactory().get("/api/treks/does-not-exist/")
        request.META["HTTP_USER_AGENT"] = "pytest"

        # traceback.format_exc() (used inside process_exception) only has
        # anything to report when called from within a real except block -
        # Django itself always calls process_exception that way.
        try:
            raise ValueError("something broke")
        except ValueError as exc:
            middleware.process_exception(request, exc)

        report = CrashReport.objects.get()
        self.assertEqual(report.platform, "backend")
        self.assertEqual(report.severity, "fatal")
        self.assertIn("something broke", report.error_message)
        self.assertIn("ValueError", report.stack_trace)

    def test_admin_path_exceptions_tagged_as_admin_platform(self):
        from django.test import RequestFactory

        from .middleware import BackendCrashLoggingMiddleware
        from .models import CrashReport

        middleware = BackendCrashLoggingMiddleware(get_response=lambda r: None)
        request = RequestFactory().get("/supersecretadmin/treks_app/blog/")

        middleware.process_exception(request, RuntimeError("admin oops"))

        report = CrashReport.objects.get()
        self.assertEqual(report.platform, "admin")

    def test_middleware_never_raises_even_if_persistence_fails(self):
        from django.test import RequestFactory

        from .middleware import BackendCrashLoggingMiddleware

        middleware = BackendCrashLoggingMiddleware(get_response=lambda r: None)
        request = RequestFactory().get("/")

        with patch("treks_app.middleware.CrashReport.objects.create", side_effect=Exception("db down")):
            result = middleware.process_exception(request, ValueError("original error"))
        self.assertIsNone(result)
