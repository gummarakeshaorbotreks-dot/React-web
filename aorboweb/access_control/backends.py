"""Authentication backend that adds failed-login lockout to staff accounts.
Mirrors authController.js's login() lockout mechanics (10 attempts -> 30 min
lock). Runs in addition to axes, which handles IP-based lockout separately;
this one is per-account.
"""
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.contrib.auth.backends import ModelBackend
from django.utils import timezone

FAILURE_LIMIT = 10
LOCKOUT_MINUTES = 30


class StaffLockoutBackend(ModelBackend):
    def authenticate(self, request, username=None, password=None, **kwargs):
        UserModel = get_user_model()
        if username is None:
            username = kwargs.get(UserModel.USERNAME_FIELD)
        if username is None or password is None:
            return None

        try:
            user = UserModel._default_manager.get_by_natural_key(username)
        except UserModel.DoesNotExist:
            # Run the default hasher anyway to keep timing consistent with a
            # real lookup (Django's own ModelBackend does the same trick).
            UserModel().set_password(password)
            return None

        profile = getattr(user, "staff_profile", None)
        if profile is not None:
            if profile.account_locked_until and profile.account_locked_until > timezone.now():
                return None
            if profile.status != "active":
                return None

        if not user.check_password(password) or not self.user_can_authenticate(user):
            if profile is not None:
                profile.failed_login_attempts += 1
                if profile.failed_login_attempts >= FAILURE_LIMIT:
                    profile.account_locked_until = timezone.now() + timedelta(minutes=LOCKOUT_MINUTES)
                profile.save(update_fields=["failed_login_attempts", "account_locked_until"])
            return None

        if profile is not None and (profile.failed_login_attempts or profile.account_locked_until):
            profile.failed_login_attempts = 0
            profile.account_locked_until = None
            profile.save(update_fields=["failed_login_attempts", "account_locked_until"])

        return user
