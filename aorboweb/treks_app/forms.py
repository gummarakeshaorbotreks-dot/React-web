import logging
from django import forms
from django.conf import settings
from django.contrib.auth.forms import PasswordResetForm
from django.contrib.auth.tokens import default_token_generator
from django.contrib.auth import get_user_model
from django.core.mail import EmailMultiAlternatives
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode

logger = logging.getLogger(__name__)


class CustomPasswordResetForm(PasswordResetForm):
    def clean_email(self):
        email = self.cleaned_data['email']
        # Always return the email, regardless of whether it exists in the system.
        # This prevents user enumeration.
        return email

    def save(self, request=None, **kwargs):
        """
        Override Django's default password reset form save() to use the
        React email renderer instead of Django template files that will be
        deleted. Falls back gracefully (logs error, skips send) if the
        Node renderer fails — never raises an unhandled exception.
        """
        email = self.cleaned_data['email']
        UserModel = get_user_model()
        active_users = UserModel._default_manager.filter(
            email__iexact=email, is_active=True
        )

        protocol = 'https' if request and request.is_secure() else 'http'
        domain = request.get_host() if request else 'localhost:8000'

        for user in active_users:
            uidb64 = urlsafe_base64_encode(force_bytes(user.pk))
            token = default_token_generator.make_token(user)

            # Render subject as simple text
            subject = "Password Reset for Aorbo Treks"

            # Render the email body using React
            try:
                from .email_renderer import render_react_email
                html_content = render_react_email("PasswordResetEmail", {
                    "email": email,
                    "protocol": protocol,
                    "domain": domain,
                    "uidb64": uidb64,
                    "token": token,
                })
            except Exception as e:
                logger.error(
                    f"React email render failed for password reset to {email}: {e}"
                )
                return  # Skip sending — don't fall back to deleted templates

            try:
                mail = EmailMultiAlternatives(
                    subject=subject,
                    body=f"Follow the link below to reset your password for {email}.",
                    from_email=f"Aorbo Treks <{settings.DEFAULT_FROM_EMAIL}>",
                    to=[email],
                )
                mail.attach_alternative(html_content, "text/html")
                mail.send()
            except Exception as e:
                logger.error(
                    f"Failed to send password reset email to {email}: {e}"
                )
                # Don't re-raise — just log and continue
