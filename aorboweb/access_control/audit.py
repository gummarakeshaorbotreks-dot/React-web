"""Append-only, hash-chained audit log. Mirrors services/auditService.js.

record() never raises — an audit-write failure must never fail the
underlying staff action it's describing.
"""
import hashlib
import json
import logging
import uuid

from django.db import transaction
from django.utils import timezone

logger = logging.getLogger(__name__)

HASHED_FIELDS = [
    "event_id", "actor_type", "actor_id", "actor_name", "actor_role",
    "actor_ip", "actor_ua", "action", "resource_type", "resource_id",
    "summary", "before_json", "after_json", "request_id", "http_method",
    "route", "status_code", "created_at",
]


def _stable(value):
    """Deterministic JSON-able form: dict keys sorted recursively, datetimes
    normalized to ISO strings, so the hash is stable across DB round-trips."""
    if isinstance(value, dict):
        return {k: _stable(value[k]) for k in sorted(value.keys())}
    if isinstance(value, (list, tuple)):
        return [_stable(v) for v in value]
    if hasattr(value, "isoformat"):
        return value.isoformat()
    if isinstance(value, uuid.UUID):
        return str(value)
    return value


def _canonical(record: dict) -> str:
    payload = {field: _stable(record.get(field)) for field in HASHED_FIELDS}
    return json.dumps(payload, sort_keys=True, separators=(",", ":"))


def compute_hash(record: dict, prev_hash) -> str:
    canonical = _canonical(record)
    return hashlib.sha256(f"{canonical}|{prev_hash or ''}".encode()).hexdigest()


def _trunc(value, length):
    if value is None:
        return None
    s = str(value)
    return s[:length]


def record(entry: dict):
    """entry keys: actor_type, actor_id, actor_name, actor_role, actor_ip,
    actor_ua, action, resource_type, resource_id, summary, before_json,
    after_json, request_id, http_method, route, status_code."""
    from .models import AccessAuditLog, AuditChainLock

    try:
        with transaction.atomic():
            # Mutex: SELECT ... FOR UPDATE on a singleton row, so even the
            # very first audit row (nothing else to lock) is race-safe.
            AuditChainLock.objects.select_for_update().get_or_create(id=1)
            last = AccessAuditLog.objects.select_for_update().order_by("-id").first()
            prev_hash = last.hash if last else None

            now = timezone.now()
            row = {
                "event_id": str(uuid.uuid4()),
                "actor_type": entry.get("actor_type", "staff"),
                "actor_id": entry.get("actor_id"),
                "actor_name": _trunc(entry.get("actor_name"), 120),
                "actor_role": _trunc(entry.get("actor_role"), 40),
                "actor_ip": _trunc(entry.get("actor_ip"), 45),
                "actor_ua": _trunc(entry.get("actor_ua"), 255),
                "action": _trunc(entry.get("action"), 50),
                "resource_type": _trunc(entry.get("resource_type"), 50),
                "resource_id": _trunc(entry.get("resource_id"), 64),
                "summary": _trunc(entry.get("summary"), 500),
                "before_json": entry.get("before_json"),
                "after_json": entry.get("after_json"),
                "request_id": _trunc(entry.get("request_id"), 64),
                "http_method": entry.get("http_method"),
                "route": _trunc(entry.get("route"), 255),
                "status_code": entry.get("status_code"),
                "created_at": now,
            }
            row["prev_hash"] = prev_hash
            # Hash from the round-tripped, DB-normalized row (re-fetched),
            # not the in-memory dict — some backends (sqlite in particular)
            # don't preserve datetime precision exactly on write, which would
            # otherwise make verify_chain()'s later recomputation mismatch.
            created = AccessAuditLog.objects.create(hash="pending", **row)
            created.refresh_from_db()
            record_dict = {f: getattr(created, f) for f in HASHED_FIELDS}
            created.hash = compute_hash(record_dict, prev_hash)
            created.save(update_fields=["hash"])
            return created
    except Exception:
        logger.exception("access_control.audit.record failed (action=%s)", entry.get("action"))
        return None


def from_request(request, staff_profile=None, **extra):
    user = getattr(request, "user", None)
    xff = request.META.get("HTTP_X_FORWARDED_FOR", "") if request else ""
    ip = xff.split(",")[0].strip() if xff else (request.META.get("REMOTE_ADDR") if request else None)
    role_name = None
    if staff_profile is not None:
        role_name = staff_profile.role.name
    elif user is not None and hasattr(user, "staff_profile"):
        role_name = user.staff_profile.role.name

    base = {
        "actor_type": "staff",
        "actor_id": getattr(user, "id", None) if user else None,
        "actor_name": (getattr(user, "get_full_name", lambda: "")() or getattr(user, "username", None)) if user else None,
        "actor_role": role_name,
        "actor_ip": ip,
        "actor_ua": request.META.get("HTTP_USER_AGENT") if request else None,
        "request_id": request.META.get("HTTP_X_REQUEST_ID") if request else None,
        "http_method": request.method if request else None,
        "route": request.path if request else None,
    }
    base.update(extra)
    return base


def verify_chain(limit: int = 5000):
    """Walk the chain oldest->newest and recompute hashes. Returns
    {ok, checked, broken_at, reason} — surface this from a 'Verify Audit Log'
    admin action or a scheduled job."""
    from .models import AccessAuditLog

    prev_hash = None
    checked = 0
    for row in AccessAuditLog.objects.order_by("id")[:limit]:
        record_dict = {f: getattr(row, f) for f in HASHED_FIELDS}
        if row.prev_hash != prev_hash:
            return {"ok": False, "checked": checked, "broken_at": row.id, "reason": "prev_hash mismatch"}
        expected = compute_hash(record_dict, prev_hash)
        if expected != row.hash:
            return {"ok": False, "checked": checked, "broken_at": row.id, "reason": "hash mismatch"}
        prev_hash = row.hash
        checked += 1
    return {"ok": True, "checked": checked, "broken_at": None, "reason": None}
