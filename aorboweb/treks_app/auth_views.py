"""
Custom JSON-returning views for authentication flows (password reset, lockout).
Replaces Django's default HTML-rendering auth views used in
aorbo_project/urls.py via include('django.contrib.auth.urls').

All endpoints return JsonResponse so the React SPA can handle the UI.
"""

import json
import logging
from django.http import JsonResponse
from django.contrib.auth import views as auth_views
from django.contrib.auth.forms import SetPasswordForm
from .forms import CustomPasswordResetForm
from django.contrib.auth.tokens import default_token_generator
from django.contrib.auth.models import User
from django.utils.http import urlsafe_base64_decode
from django.utils.encoding import force_str
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.contrib.auth import get_user_model
from django.conf import settings

logger = logging.getLogger(__name__)


@csrf_exempt
@require_http_methods(["POST"])
def api_password_reset(request):
    """
    POST /accounts/password_reset/
    Body: { "email": "user@example.com" }
    Returns: {"success": true}  (always — prevents user enumeration)
    """
    try:
        data = json.loads(request.body) if request.body else {}
    except json.JSONDecodeError:
        data = request.POST.dict()

    email = data.get("email", "").strip()

    if not email:
        return JsonResponse({"error": "Email is required"}, status=400)

    form = CustomPasswordResetForm(data={"email": email})
    if form.is_valid():
        form.save(
            request=request,
            use_https=request.is_secure(),
        )

    # Always return success to prevent user enumeration
    return JsonResponse({"success": True})


@require_http_methods(["GET"])
def api_password_reset_done(request):
    """
    GET /accounts/password_reset/done/
    Returns: {"status": "email_sent"}
    """
    return JsonResponse({"status": "email_sent"})


@csrf_exempt
@require_http_methods(["GET", "POST"])
def api_password_reset_confirm(request, uidb64, token):
    """
    GET  /accounts/reset/<uidb64>/<token>/  → {"valid": true/false}
    POST /accounts/reset/<uidb64>/<token>/  → {"success": true} | {"error": "..."}
    """
    UserModel = get_user_model()
    try:
        uid = force_str(urlsafe_base64_decode(uidb64))
        user = UserModel.objects.get(pk=uid)
    except (TypeError, ValueError, OverflowError, UserModel.DoesNotExist):
        user = None

    if request.method == "GET":
        if user is not None and default_token_generator.check_token(user, token):
            return JsonResponse({"valid": True})
        return JsonResponse({"valid": False})

    # POST — set new password
    try:
        data = json.loads(request.body) if request.body else {}
    except json.JSONDecodeError:
        data = request.POST.dict()

    new_password1 = data.get("new_password1", "")
    new_password2 = data.get("new_password2", "")

    if not user or not default_token_generator.check_token(user, token):
        return JsonResponse({"error": "The password reset link was invalid or has expired."}, status=400)

    if not new_password1 or not new_password2:
        return JsonResponse({"error": "Both password fields are required."}, status=400)

    if new_password1 != new_password2:
        return JsonResponse({"error": "The two password fields didn't match."}, status=400)

    form = SetPasswordForm(user, data={"new_password1": new_password1, "new_password2": new_password2})
    if form.is_valid():
        form.save()
        return JsonResponse({"success": True})
    else:
        errors = " ".join([msg for msgs in form.errors.values() for msg in msgs])
        return JsonResponse({"error": errors}, status=400)


@require_http_methods(["GET"])
def api_password_reset_complete(request):
    """
    GET /accounts/reset/done/
    Returns: {"status": "complete"}
    """
    return JsonResponse({"status": "complete"})


@require_http_methods(["GET"])
def api_lockout(request):
    """
    GET /accounts/lockout/
    Replaces the django-axes lockout HTML template.
    Returns: {"error": "locked_out"}
    """
    return JsonResponse({"error": "locked_out"})

