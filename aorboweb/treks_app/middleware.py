"""Catches every unhandled exception from every view in the project (both
treks_app's API views and Django admin) and persists it as a CrashReport,
in addition to whatever Django's own logging/ADMINS email already does.
Never lets a failure here mask the original exception - Django still shows
its normal 500 page after this runs.
"""
import logging
import traceback

from .models import CrashReport

logger = logging.getLogger("treks_app.crashes")


class BackendCrashLoggingMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        return self.get_response(request)

    def process_exception(self, request, exception):
        try:
            platform = "admin" if request.path.startswith("/supersecretadmin/") else "backend"
            CrashReport.objects.create(
                platform=platform,
                severity="fatal",
                error_message=str(exception)[:5000] or exception.__class__.__name__,
                stack_trace=traceback.format_exc()[:10000],
                route=request.path[:500],
                user_agent=request.META.get("HTTP_USER_AGENT", "")[:255],
                ip_address=request.META.get("REMOTE_ADDR"),
            )
        except Exception:
            logger.exception("Failed to persist CrashReport for an unhandled exception")
        # Returning None lets Django's normal exception handling continue -
        # this middleware only observes, never suppresses or replaces errors.
        return None
