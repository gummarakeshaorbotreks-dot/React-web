"""Shared escalation guards — used by every view/admin action that mutates a
staff account, a role, or a permission override. Mirrors services/rbacGuards.js.

Keeping this logic in ONE place matters specifically because it's a
privilege-escalation guard: two independently-maintained copies is exactly
the failure mode where a future fix to the rule lands in one copy and not
the other, silently reopening the hole the guard exists to close.
"""
from .permissions import resolve_permissions, user_can


def actor_can(actor, key: str) -> bool:
    if actor is None or not hasattr(actor, "staff_profile"):
        return False
    keys, _rank = resolve_permissions(actor)
    return user_can(keys, key)


def actor_rank(actor):
    if actor is None or not hasattr(actor, "staff_profile"):
        return None
    _keys, rank = resolve_permissions(actor)
    return rank


def assert_can_grant(actor, keys):
    """Returns an error string, or None if the grant is allowed. An actor
    without '*' can only grant a permission key they themselves hold."""
    if actor_can(actor, "*"):
        return None
    not_held = [k for k in keys if k != "*" and not actor_can(actor, k)]
    if not_held:
        return f"You can only grant permissions you hold yourself. Missing: {', '.join(not_held)}"
    if "*" in keys:
        return 'Only a super admin can grant the "*" wildcard.'
    return None


def assert_can_act_on_rank(actor, target_rank):
    """Returns an error string, or None if allowed. An actor without '*' may
    only act on a staff member / role whose rank is STRICTLY more junior
    (numerically higher) than their own. A same-rank peer is blocked too, not
    just someone more senior. null/unresolved rank fails closed (blocked)."""
    if actor_can(actor, "*"):
        return None
    rank = actor_rank(actor)
    if rank is None or target_rank is None or target_rank <= rank:
        return (
            "You don't have authority over a staff member with that role — it's at or "
            "above your own rank. Ask someone senior to you (or a super admin) to do this instead."
        )
    return None
