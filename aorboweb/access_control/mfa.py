"""TOTP 2FA: secret encryption, code verification, backup codes, trusted
devices. Mirrors the Node backend's services/mfaService.js +
trustedDeviceService.js so an enrolled QR/backup-code UX behaves identically.
"""
import base64
import hashlib
import secrets
from datetime import timedelta

import pyotp
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from decouple import config
from django.conf import settings
from django.utils import timezone

MFA_ISSUER = config("MFA_ISSUER", default="Aorbo Treks Admin")
BACKUP_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"  # excludes 0/O/1/I/L


def _load_key() -> bytes:
    raw = config("MFA_ENCRYPTION_KEY", default="")
    if len(raw) == 64:
        try:
            return bytes.fromhex(raw)
        except ValueError:
            pass
    # Dev-only fallback so a missing key doesn't crash local work; never rely
    # on this in production — set a real MFA_ENCRYPTION_KEY there.
    seed = ("mfa-secret-v1:" + settings.SECRET_KEY).encode()
    return hashlib.sha256(seed).digest()


_KEY = None


def _key() -> bytes:
    global _KEY
    if _KEY is None:
        _KEY = _load_key()
    return _KEY


def encrypt(plain: str) -> str:
    iv = secrets.token_bytes(12)
    aesgcm = AESGCM(_key())
    ct = aesgcm.encrypt(iv, plain.encode(), None)  # ct already includes the 16-byte tag appended
    return base64.b64encode(iv + ct).decode()


def decrypt(blob: str) -> str:
    raw = base64.b64decode(blob)
    iv, ct = raw[:12], raw[12:]
    aesgcm = AESGCM(_key())
    return aesgcm.decrypt(iv, ct, None).decode()


def generate_secret() -> str:
    return pyotp.random_base32()


def provisioning_uri(secret: str, email: str) -> str:
    return pyotp.totp.TOTP(secret).provisioning_uri(name=email, issuer_name=MFA_ISSUER)


def verify_totp(secret: str, code: str) -> bool:
    if not code:
        return False
    totp = pyotp.TOTP(secret)
    return totp.verify(code.strip(), valid_window=1)  # ~90s drift tolerance, matches otplib window:1


def hash_totp_code(code: str) -> str:
    return hashlib.sha256("".join(code.split()).encode()).hexdigest()


def generate_backup_codes(n: int = 10):
    """Returns (plaintext_codes, stored_records). Plaintext is shown to the
    admin exactly once and never persisted."""
    plaintext = []
    stored = []
    for _ in range(n):
        raw = "".join(secrets.choice(BACKUP_CODE_ALPHABET) for _ in range(10))
        code = f"{raw[:5]}-{raw[5:]}"
        plaintext.append(code)
        stored.append({"hash": hashlib.sha256(raw.encode()).hexdigest(), "used_at": None})
    return plaintext, stored


def _normalize_backup_code(code: str) -> str:
    return "".join(ch for ch in code.upper() if ch.isalnum())


def verify_backup_code(stored_codes, code: str):
    """Returns (ok, updated_stored_codes). Marks the matched code used (single-use)."""
    if not stored_codes or not code:
        return False, stored_codes
    normalized = _normalize_backup_code(code)
    target_hash = hashlib.sha256(normalized.encode()).hexdigest()
    updated = list(stored_codes)
    for entry in updated:
        if entry["hash"] == target_hash and not entry.get("used_at"):
            entry["used_at"] = timezone.now().isoformat()
            return True, updated
    return False, stored_codes


def remaining_backup_codes(stored_codes) -> int:
    if not stored_codes:
        return 0
    return sum(1 for c in stored_codes if not c.get("used_at"))


def mfa_required_for_role(role_name: str) -> bool:
    required = config("MFA_REQUIRED_ROLES", default="")
    roles = {r.strip() for r in required.split(",") if r.strip()}
    return role_name in roles


# ---- Trusted devices ------------------------------------------------------

TRUSTED_DEVICE_DAYS = config("MFA_TRUSTED_DEVICE_DAYS", default=30, cast=int)


def issue_trusted_device(user, request, label: str = ""):
    from .models import TrustedDevice

    raw_token = secrets.token_hex(32)
    token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
    TrustedDevice.objects.create(
        user=user,
        token_hash=token_hash,
        label=label,
        user_agent=(request.META.get("HTTP_USER_AGENT", "") if request else "")[:255],
        ip=(request.META.get("REMOTE_ADDR", "") if request else "")[:45],
        expires_at=timezone.now() + timedelta(days=TRUSTED_DEVICE_DAYS),
    )
    return raw_token


def check_trusted_device(user, raw_token: str) -> bool:
    from .models import TrustedDevice

    if not raw_token:
        return False
    token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
    try:
        device = TrustedDevice.objects.get(user=user, token_hash=token_hash)
    except TrustedDevice.DoesNotExist:
        return False
    if device.expires_at < timezone.now():
        device.delete()
        return False
    device.last_used_at = timezone.now()
    device.save(update_fields=["last_used_at"])
    return True


def revoke_all_trusted_devices(user):
    from .models import TrustedDevice

    TrustedDevice.objects.filter(user=user).delete()
