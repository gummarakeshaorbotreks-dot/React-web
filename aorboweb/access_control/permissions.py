"""Effective-permission resolution: (role's grants) + (user grant overrides)
- (user revoke overrides), with a short in-process cache. Mirrors
services/permissionService.js.
"""
import time

from django.utils import timezone

_CACHE = {}
CACHE_TTL_SECONDS = 30


def invalidate(user_id):
    _CACHE.pop(user_id, None)


def invalidate_all():
    _CACHE.clear()


def resolve_permissions(user, fresh: bool = False):
    """Returns (permission_keys: set[str], role_rank: int|None)."""
    if not hasattr(user, "staff_profile"):
        return set(), None

    now = time.monotonic()
    if not fresh and user.id in _CACHE:
        keys, rank, expires_at = _CACHE[user.id]
        if expires_at > now:
            return keys, rank

    profile = user.staff_profile
    role = profile.role

    from .models import RolePermission, UserPermissionOverride

    role_keys = set(
        RolePermission.objects.filter(role=role).values_list("permission__key", flat=True)
    )

    overrides = UserPermissionOverride.objects.filter(user=user).select_related("permission")
    active_now = timezone.now()
    for override in overrides:
        if override.expires_at and override.expires_at < active_now:
            continue
        if override.effect == "grant":
            role_keys.add(override.permission.key)
        else:
            role_keys.discard(override.permission.key)

    _CACHE[user.id] = (role_keys, role.rank, now + CACHE_TTL_SECONDS)
    return role_keys, role.rank


def user_can(permission_keys, key: str) -> bool:
    return "*" in permission_keys or key in permission_keys
