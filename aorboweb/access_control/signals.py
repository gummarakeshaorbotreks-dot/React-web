"""Bumps a staff account's session_version whenever its password changes, so
any other already-open session for that account gets logged out on its next
request (via StaffSessionValidationMiddleware) - regardless of whether the
password was changed through the dedicated admin "change password" form,
self-service password reset, or set_password() called from anywhere else.
"""
from django.conf import settings
from django.db.models.signals import pre_save
from django.dispatch import receiver


@receiver(pre_save, sender=settings.AUTH_USER_MODEL)
def bump_session_version_on_password_change(sender, instance, **kwargs):
    if not instance.pk:
        return
    try:
        old = sender.objects.get(pk=instance.pk)
    except sender.DoesNotExist:
        return
    if old.password == instance.password:
        return
    profile = getattr(instance, "staff_profile", None)
    if profile is None:
        from .models import StaffProfile
        profile = StaffProfile.objects.filter(user_id=instance.pk).first()
    if profile is not None:
        profile.session_version = (profile.session_version or 0) + 1
        profile.save(update_fields=["session_version"])
