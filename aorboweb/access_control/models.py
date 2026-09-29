from django.conf import settings
from django.db import models


class Role(models.Model):
    """A staff role. Lower rank = more authority; super_admin = 0."""

    name = models.CharField(max_length=50, unique=True)
    description = models.CharField(max_length=255, blank=True)
    rank = models.SmallIntegerField(
        default=100,
        help_text="Lower = more powerful. super_admin = 0.",
    )
    is_system = models.BooleanField(
        default=False,
        help_text="Seeded roles that must not be deleted/renamed via the UI.",
    )
    permissions = models.ManyToManyField(
        "StaffPermission", through="RolePermission", related_name="roles", blank=True
    )

    class Meta:
        ordering = ["rank"]

    def __str__(self):
        return self.name


class StaffPermission(models.Model):
    """One resource:action key (e.g. 'treks:edit'). Roles hold sets of these;
    individual staff can override per-permission via UserPermissionOverride."""

    key = models.CharField(max_length=80, unique=True, help_text="resource:action, e.g. treks:edit")
    resource = models.CharField(max_length=50)
    action = models.CharField(max_length=30)
    category = models.CharField(max_length=40, help_text="UI grouping")
    label = models.CharField(max_length=120)
    description = models.CharField(max_length=255, blank=True)
    is_dangerous = models.BooleanField(default=False)

    class Meta:
        ordering = ["category", "key"]

    def __str__(self):
        return self.key


class RolePermission(models.Model):
    role = models.ForeignKey(Role, on_delete=models.CASCADE, related_name="permission_grants")
    permission = models.ForeignKey(StaffPermission, on_delete=models.CASCADE, related_name="role_grants")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [("role", "permission")]


class StaffProfile(models.Model):
    """Extends auth.User with the RBAC/lockout/MFA fields staff accounts need.
    Only staff (is_staff=True) accounts should have one of these."""

    STATUS_CHOICES = [
        ("active", "Active"),
        ("inactive", "Inactive"),
        ("locked", "Locked"),
    ]

    SERIAL_PREFIX = "AORBO"
    SERIAL_DIGITS = 5

    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="staff_profile")
    role = models.ForeignKey(Role, on_delete=models.PROTECT, related_name="staff")
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default="active")
    staff_serial = models.CharField(
        max_length=20, unique=True, editable=False, default="",
        help_text="Auto-assigned sequential ID, e.g. AORBO00001. Never reused, even if the account is later deleted.",
    )
    session_version = models.PositiveIntegerField(default=1)
    failed_login_attempts = models.PositiveIntegerField(default=0)
    account_locked_until = models.DateTimeField(null=True, blank=True)
    mfa_enabled = models.BooleanField(default=False)

    def _generate_serial(self):
        counter, _ = StaffSerialCounter.objects.select_for_update().get_or_create(id=1)
        counter.last_number += 1
        counter.save(update_fields=["last_number"])
        return f"{self.SERIAL_PREFIX}{counter.last_number:0{self.SERIAL_DIGITS}d}"

    def save(self, *args, **kwargs):
        if not self.staff_serial:
            from django.db import transaction
            with transaction.atomic():
                self.staff_serial = self._generate_serial()
                super().save(*args, **kwargs)
            return
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.staff_serial} - {self.user.username} ({self.role.name})"


class UserPermissionOverride(models.Model):
    EFFECT_CHOICES = [("grant", "Grant"), ("revoke", "Revoke")]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="permission_overrides")
    permission = models.ForeignKey(StaffPermission, on_delete=models.CASCADE, related_name="user_overrides")
    effect = models.CharField(max_length=6, choices=EFFECT_CHOICES, default="grant")
    granted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )
    reason = models.CharField(max_length=255, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [("user", "permission")]


class StaffMfa(models.Model):
    """TOTP 2FA state for one staff user. Secrets are stored AES-256-GCM
    encrypted (see access_control/mfa.py); never stored or logged in plaintext."""

    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="mfa")
    totp_secret = models.TextField(null=True, blank=True, help_text="AES-GCM encrypted")
    pending_secret = models.TextField(null=True, blank=True, help_text="encrypted; set during enrollment, before verify")
    enabled_at = models.DateTimeField(null=True, blank=True)
    backup_codes = models.JSONField(null=True, blank=True, help_text="[{hash, used_at}]")
    last_used_at = models.DateTimeField(null=True, blank=True)
    last_used_code_hash = models.CharField(max_length=64, null=True, blank=True)
    recovery_reset_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )
    recovery_reset_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


class TrustedDevice(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="trusted_devices")
    token_hash = models.CharField(max_length=64, unique=True, help_text="sha256")
    label = models.CharField(max_length=120, blank=True)
    user_agent = models.CharField(max_length=255, blank=True)
    ip = models.CharField(max_length=45, blank=True)
    last_used_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)


class AuditChainLock(models.Model):
    """Single row (id=1) used purely as a SELECT ... FOR UPDATE mutex so the
    very first audit-log row (nothing else to lock yet) is still race-safe."""

    id = models.PositiveSmallIntegerField(primary_key=True, default=1)


class StaffSerialCounter(models.Model):
    """Single row (id=1) tracking the last-issued staff serial number. A
    persistent counter, not derived from MAX(staff_serial) - deleting a
    StaffProfile must never free up its number for reuse."""

    id = models.PositiveSmallIntegerField(primary_key=True, default=1)
    last_number = models.PositiveIntegerField(default=0)


class AccessAuditLog(models.Model):
    """Append-only, hash-chained record of every staff action. Never update
    or delete rows here — see access_control/audit.py for the writer."""

    event_id = models.UUIDField(unique=True)
    actor_type = models.CharField(max_length=20, default="staff")
    actor_id = models.IntegerField(null=True, blank=True)
    actor_name = models.CharField(max_length=120, null=True, blank=True)
    actor_role = models.CharField(max_length=40, null=True, blank=True)
    actor_ip = models.CharField(max_length=45, null=True, blank=True)
    actor_ua = models.CharField(max_length=255, null=True, blank=True)
    action = models.CharField(max_length=50)
    resource_type = models.CharField(max_length=50, null=True, blank=True)
    resource_id = models.CharField(max_length=64, null=True, blank=True)
    summary = models.CharField(max_length=500, null=True, blank=True)
    before_json = models.JSONField(null=True, blank=True)
    after_json = models.JSONField(null=True, blank=True)
    request_id = models.CharField(max_length=64, null=True, blank=True)
    http_method = models.CharField(max_length=8, null=True, blank=True)
    route = models.CharField(max_length=255, null=True, blank=True)
    status_code = models.SmallIntegerField(null=True, blank=True)
    prev_hash = models.CharField(max_length=64, null=True, blank=True)
    hash = models.CharField(max_length=64, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=["actor_id"]),
            models.Index(fields=["resource_type", "resource_id"]),
            models.Index(fields=["action"]),
            models.Index(fields=["created_at"]),
        ]
        ordering = ["id"]
