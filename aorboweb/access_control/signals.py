"""Bumps a staff account's session_version whenever its password changes, so
any other already-open session for that account gets logged out on its next
request (via StaffSessionValidationMiddleware) - regardless of whether the
password was changed through the dedicated admin "change password" form,
self-service password reset, or set_password() called from anywhere else.
"""
from django.conf import settings
from django.contrib.auth import get_user_model
from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver

from .models import StaffProfile


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
        profile = StaffProfile.objects.filter(user_id=instance.pk).first()
    if profile is not None:
        profile.session_version = (profile.session_version or 0) + 1
        profile.save(update_fields=["session_version"])


@receiver(post_save, sender=StaffProfile)
def sync_is_staff_with_profile(sender, instance, **kwargs):
    """The staff profile's role is what grants admin access, so is_staff
    follows it: an active profile means staff, anything else means not.
    Otherwise an account given a role but with "Staff status" left unticked
    passes the password check and is then refused by the admin site."""
    is_staff = instance.status == "active"
    # .update() rather than user.save(): no pre_save password check, and it
    # can't clobber other fields with a stale in-memory user.
    get_user_model().objects.filter(pk=instance.user_id).exclude(is_staff=is_staff).update(is_staff=is_staff)
