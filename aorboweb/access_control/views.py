"""Two-step staff login: password -> (optional) TOTP/backup-code MFA step.
Intercepts /supersecretadmin/login/ ahead of django.contrib.admin's own
login URL (see aorbo_project/urls.py) so all existing admin registrations
keep working unchanged.
"""
import base64
import io
from datetime import timedelta

import qrcode

from django.conf import settings
from django.contrib.auth import authenticate, get_user_model, login as auth_login
from django.contrib.auth.views import redirect_to_login
from django.shortcuts import redirect, render
from django.urls import reverse
from django.utils import timezone
from django.views.decorators.cache import never_cache
from django.views.decorators.csrf import csrf_protect

from . import audit, mfa
from .backends import FAILURE_LIMIT, LOCKOUT_MINUTES
from .models import StaffMfa

TRUSTED_DEVICE_COOKIE = "staff_td"
MFA_PENDING_TTL_MINUTES = 5
MFA_SETUP_TTL_MINUTES = 15


def _admin_index_url():
    return reverse("admin:index")


def _qr_data_uri(otpauth_uri: str) -> str:
    img = qrcode.make(otpauth_uri)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()


def _issue_full_session(request, user, via: str, remember_device: bool = False):
    profile = user.staff_profile
    profile.session_version = (profile.session_version or 0) + 1
    profile.failed_login_attempts = 0
    profile.account_locked_until = None
    profile.save(update_fields=["session_version", "failed_login_attempts", "account_locked_until"])

    if not hasattr(user, "backend"):
        user.backend = "access_control.backends.StaffLockoutBackend"
    auth_login(request, user)
    request.session["staff_session_version"] = profile.session_version
    request.session.pop("mfa_pending_user_id", None)
    request.session.pop("mfa_pending_deadline", None)
    request.session.pop("mfa_setup_user_id", None)

    audit.record(audit.from_request(
        request, staff_profile=profile,
        action="staff.login", resource_type="staff", resource_id=str(user.id),
        after_json={"via": via, "session_version": profile.session_version},
    ))

    response = redirect(request.POST.get("next") or request.GET.get("next") or _admin_index_url())
    if remember_device and via != "trusted_device":
        raw_token = mfa.issue_trusted_device(user, request)
        response.set_cookie(
            TRUSTED_DEVICE_COOKIE, raw_token,
            max_age=mfa.TRUSTED_DEVICE_DAYS * 86400,
            httponly=True, secure=not settings.DEBUG, samesite="Strict",
        )
    return response


def _record_mfa_failure(user, reason: str):
    profile = user.staff_profile
    profile.failed_login_attempts += 1
    if profile.failed_login_attempts >= FAILURE_LIMIT:
        profile.account_locked_until = timezone.now() + timedelta(minutes=LOCKOUT_MINUTES)
    profile.save(update_fields=["failed_login_attempts", "account_locked_until"])


@never_cache
@csrf_protect
def staff_login(request):
    if request.user.is_authenticated:
        return redirect(_admin_index_url())

    error = None
    if request.method == "POST":
        username = request.POST.get("username", "")
        password = request.POST.get("password", "")
        user = authenticate(request, username=username, password=password)

        if user is None:
            error = "Please enter the correct username and password for a staff account."
        elif not hasattr(user, "staff_profile"):
            # Superuser created via createsuperuser with no RBAC profile yet -
            # let them straight in rather than locking themselves out.
            return _issue_full_session(request, user, via="password")
        else:
            profile = user.staff_profile
            role_name = profile.role.name

            trusted_token = request.COOKIES.get(TRUSTED_DEVICE_COOKIE)
            if profile.mfa_enabled and trusted_token and mfa.check_trusted_device(user, trusted_token):
                return _issue_full_session(request, user, via="trusted_device")

            staff_mfa = StaffMfa.objects.filter(user=user).first()

            if not profile.mfa_enabled and staff_mfa and staff_mfa.pending_secret:
                request.session["mfa_setup_user_id"] = user.id
                request.session["mfa_setup_deadline"] = (
                    timezone.now() + timedelta(minutes=MFA_SETUP_TTL_MINUTES)
                ).isoformat()
                return redirect("access_control:mfa_setup_confirm")

            if not profile.mfa_enabled and mfa.mfa_required_for_role(role_name):
                error = "2FA setup is required for your role. Ask an admin to set it up for your account."
            elif profile.mfa_enabled:
                request.session["mfa_pending_user_id"] = user.id
                request.session["mfa_pending_deadline"] = (
                    timezone.now() + timedelta(minutes=MFA_PENDING_TTL_MINUTES)
                ).isoformat()
                return redirect("access_control:mfa_verify")
            else:
                return _issue_full_session(request, user, via="password")

    context = {
        "title": "Log in",
        "next": request.GET.get("next", ""),
        "error": error,
        "site_title": "Aorbo Treks Admin",
        "site_header": "Aorbo Treks Admin",
    }
    return render(request, "admin/login.html", context)


def _get_pending_user(request, session_key: str, deadline_key: str, user_id_key: str):
    user_id = request.session.get(user_id_key)
    deadline_raw = request.session.get(deadline_key)
    if not user_id or not deadline_raw:
        return None
    if timezone.now() > timezone.datetime.fromisoformat(deadline_raw):
        request.session.pop(user_id_key, None)
        request.session.pop(deadline_key, None)
        return None
    return get_user_model().objects.filter(id=user_id).first()


@never_cache
@csrf_protect
def mfa_verify(request):
    user = _get_pending_user(request, "mfa_pending_user_id", "mfa_pending_deadline", "mfa_pending_user_id")
    if user is None or not hasattr(user, "staff_profile"):
        return redirect("access_control:staff_login")

    profile = user.staff_profile
    if profile.account_locked_until and profile.account_locked_until > timezone.now():
        return render(request, "admin/mfa_verify.html", {
            "error": "This account is temporarily locked. Try again later.",
        })

    error = None
    if request.method == "POST":
        code = request.POST.get("code", "").strip()
        remember = request.POST.get("remember_device") == "on"
        staff_mfa = StaffMfa.objects.filter(user=user).first()

        if not staff_mfa or not staff_mfa.totp_secret:
            error = "2FA is not set up correctly for this account. Contact an admin."
        elif "-" in code:
            ok, updated_codes = mfa.verify_backup_code(staff_mfa.backup_codes, code)
            if ok:
                staff_mfa.backup_codes = updated_codes
                staff_mfa.last_used_at = timezone.now()
                staff_mfa.save(update_fields=["backup_codes", "last_used_at"])
                return _issue_full_session(request, user, via="backup_code", remember_device=remember)
            error = "Invalid backup code."
            _record_mfa_failure(user, "bad_backup_code")
        else:
            code_hash = mfa.hash_totp_code(code)
            if staff_mfa.last_used_code_hash and code_hash == staff_mfa.last_used_code_hash:
                error = "That code was already used. Wait for a new one."
            else:
                secret = mfa.decrypt(staff_mfa.totp_secret)
                if mfa.verify_totp(secret, code):
                    staff_mfa.last_used_code_hash = code_hash
                    staff_mfa.last_used_at = timezone.now()
                    staff_mfa.save(update_fields=["last_used_code_hash", "last_used_at"])
                    return _issue_full_session(request, user, via="totp", remember_device=remember)
                error = "Invalid code."
                _record_mfa_failure(user, "bad_totp")

    return render(request, "admin/mfa_verify.html", {"error": error})


@never_cache
@csrf_protect
def mfa_setup_confirm(request):
    """First-time forced enrollment: admin already generated a QR
    (pending_secret) for this user; they scan it and confirm here before the
    account is usable."""
    user = _get_pending_user(request, "mfa_setup_user_id", "mfa_setup_deadline", "mfa_setup_user_id")
    if user is None:
        return redirect("access_control:staff_login")

    staff_mfa = StaffMfa.objects.filter(user=user).first()
    if not staff_mfa or not staff_mfa.pending_secret:
        return redirect("access_control:staff_login")

    error = None
    backup_codes = None
    if request.method == "POST":
        code = request.POST.get("code", "").strip()
        secret = mfa.decrypt(staff_mfa.pending_secret)
        if mfa.verify_totp(secret, code):
            plaintext_codes, stored_codes = mfa.generate_backup_codes()
            staff_mfa.totp_secret = staff_mfa.pending_secret
            staff_mfa.pending_secret = None
            staff_mfa.enabled_at = timezone.now()
            staff_mfa.backup_codes = stored_codes
            staff_mfa.save(update_fields=["totp_secret", "pending_secret", "enabled_at", "backup_codes"])

            profile = user.staff_profile
            profile.mfa_enabled = True
            profile.save(update_fields=["mfa_enabled"])

            audit.record(audit.from_request(
                request, staff_profile=profile,
                action="staff.mfa_enabled", resource_type="staff", resource_id=str(user.id),
            ))

            # Show backup codes once, then require a fresh login for the
            # actual session (simplest correct flow — no dangling "almost
            # logged in" state).
            request.session.pop("mfa_setup_user_id", None)
            request.session.pop("mfa_setup_deadline", None)
            return render(request, "admin/mfa_setup_done.html", {"backup_codes": plaintext_codes})
        error = "Invalid code. Check your authenticator app and try again."

    secret = mfa.decrypt(staff_mfa.pending_secret)
    otpauth_uri = mfa.provisioning_uri(secret, user.email)
    return render(request, "admin/mfa_setup_confirm.html", {
        "error": error,
        "qr_data_uri": _qr_data_uri(otpauth_uri),
        "secret": secret,
    })
