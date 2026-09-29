"""Kills an already-open staff session the moment it's no longer valid -
the account was deactivated, its password was reset, its 2FA was reset, or
someone logged into it again elsewhere (session_version bumped on every
successful login, forcing every other open session for that account to log
out on its next request). Without this, `session_version` is written but
never read, and Django's session cookie alone stays valid until it expires
naturally (see SESSION_COOKIE_AGE) regardless of account state changes.
"""
from django.contrib.auth import logout
from django.shortcuts import redirect


class StaffSessionValidationMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        user = getattr(request, "user", None)
        if user is not None and user.is_authenticated:
            profile = getattr(user, "staff_profile", None)
            if profile is not None:
                session_version = request.session.get("staff_session_version")
                stale = session_version is not None and session_version != profile.session_version
                inactive = profile.status != "active"
                if stale or inactive:
                    logout(request)
                    if request.path.startswith("/supersecretadmin/"):
                        return redirect("access_control:staff_login")

        return self.get_response(request)
