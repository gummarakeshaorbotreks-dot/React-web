from django.contrib import admin, messages
from django.contrib.auth import get_user_model
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin

from . import audit, mfa, permissions
from .models import (
    AccessAuditLog,
    Role,
    StaffMfa,
    StaffPermission,
    StaffProfile,
    TrustedDevice,
    UserPermissionOverride,
)
from .rbac_guards import assert_can_act_on_rank, assert_can_grant, actor_can

User = get_user_model()

if admin.site.is_registered(User):
    admin.site.unregister(User)


def _actor_rank(request):
    profile = getattr(request.user, "staff_profile", None)
    if request.user.is_superuser and profile is None:
        return -1  # legacy/plain superuser, above everything until they get a profile
    if profile is None:
        return None
    _keys, rank = permissions.resolve_permissions(request.user)
    return rank


class RolePermissionInline(admin.TabularInline):
    model = Role.permissions.through
    extra = 1
    autocomplete_fields = ("permission",)


@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    """Note: these has_*_permission checks deliberately do NOT call super()
    (which would check Django's own auth.Permission system) — nobody has
    been granted Django-native permissions under this design, so falling
    through to super() would lock out every non-superuser account,
    including a legitimate admin/super_admin role holder."""

    list_display = ("name", "rank", "is_system", "description")
    inlines = [RolePermissionInline]
    ordering = ("rank",)

    def has_module_permission(self, request):
        return request.user.is_superuser or actor_can(request.user, "roles:read") or actor_can(request.user, "roles:manage")

    def has_view_permission(self, request, obj=None):
        return self.has_module_permission(request)

    def has_add_permission(self, request):
        return request.user.is_superuser or actor_can(request.user, "roles:manage")

    def has_change_permission(self, request, obj=None):
        if not (request.user.is_superuser or actor_can(request.user, "roles:manage")):
            return False
        if obj is None:
            return True
        return assert_can_act_on_rank(request.user, obj.rank) is None

    def has_delete_permission(self, request, obj=None):
        if obj is not None and obj.is_system:
            return False
        return self.has_change_permission(request, obj)

    def save_model(self, request, obj, form, change):
        error = assert_can_act_on_rank(request.user, obj.rank)
        if error:
            messages.error(request, error)
            return
        if change and obj.is_system and "name" in form.changed_data:
            messages.error(request, "System roles cannot be renamed.")
            return
        super().save_model(request, obj, form, change)
        permissions.invalidate_all()
        audit.record(audit.from_request(
            request, action="role.updated" if change else "role.created",
            resource_type="role", resource_id=str(obj.id),
            after_json={"name": obj.name, "rank": obj.rank},
        ))

    def save_formset(self, request, form, formset, change):
        role = form.instance
        if formset.model is Role.permissions.through:
            existing_keys = set(role.permissions.values_list("key", flat=True)) if role.pk else set()
            new_keys = set()
            for f in formset.forms:
                if f.cleaned_data.get("DELETE"):
                    continue
                perm = f.cleaned_data.get("permission")
                if perm:
                    new_keys.add(perm.key)
            added_keys = new_keys - existing_keys
            if added_keys:
                error = assert_can_grant(request.user, list(added_keys))
                if error:
                    messages.error(request, error)
                    return
        super().save_formset(request, form, formset, change)
        permissions.invalidate_all()

    def delete_model(self, request, obj):
        audit.record(audit.from_request(
            request, action="role.deleted", resource_type="role", resource_id=str(obj.id),
            before_json={"name": obj.name, "rank": obj.rank},
        ))
        super().delete_model(request, obj)
        permissions.invalidate_all()


@admin.register(StaffPermission)
class StaffPermissionAdmin(admin.ModelAdmin):
    """Read-only view of the permission catalog. Permissions are defined in
    code (access_control/catalog.py) and synced via `manage.py seed_rbac` -
    not created ad hoc here. A hand-typed key only has any effect if some
    ModelAdmin's `resource` attribute or an explicit actor_can() check
    actually references it, so a freeform "Add" form here would just invite
    dead or typo'd permissions that silently do nothing."""

    list_display = ("key", "category", "label", "is_dangerous")
    list_filter = ("category", "is_dangerous")
    search_fields = ("key", "label", "description")

    def has_module_permission(self, request):
        return actor_can(request.user, "roles:read") or actor_can(request.user, "roles:manage") or request.user.is_superuser

    def has_view_permission(self, request, obj=None):
        return self.has_module_permission(request)

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

    def has_change_permission(self, request, obj=None):
        return False


class StaffProfileInline(admin.StackedInline):
    model = StaffProfile
    can_delete = False
    fields = ("staff_serial", "role", "status", "mfa_enabled", "session_version", "failed_login_attempts", "account_locked_until")
    readonly_fields = ("staff_serial", "session_version", "failed_login_attempts", "mfa_enabled")


class UserPermissionOverrideInline(admin.TabularInline):
    model = UserPermissionOverride
    extra = 0
    fk_name = "user"
    fields = ("permission", "effect", "reason", "expires_at", "granted_by")
    readonly_fields = ("granted_by",)


@admin.register(User)
class StaffUserAdmin(DjangoUserAdmin):
    inlines = [StaffProfileInline, UserPermissionOverrideInline]
    list_display = ("get_serial", "username", "email", "get_role", "get_status", "is_active", "is_superuser")

    @admin.display(description="Serial")
    def get_serial(self, obj):
        return getattr(getattr(obj, "staff_profile", None), "staff_serial", None)

    @admin.display(description="Role")
    def get_role(self, obj):
        return getattr(getattr(obj, "staff_profile", None), "role", None)

    @admin.display(description="Status")
    def get_status(self, obj):
        return getattr(getattr(obj, "staff_profile", None), "status", None)

    def _target_rank(self, obj):
        profile = getattr(obj, "staff_profile", None)
        return profile.role.rank if profile else None

    def has_module_permission(self, request):
        return request.user.is_superuser or actor_can(request.user, "staff:read") or actor_can(request.user, "staff:manage")

    def has_view_permission(self, request, obj=None):
        return self.has_module_permission(request)

    def has_add_permission(self, request):
        return request.user.is_superuser or actor_can(request.user, "staff:manage")

    def has_change_permission(self, request, obj=None):
        if obj is not None and obj.pk == request.user.pk:
            return True  # can always edit your own account (e.g. change your own password)
        if not (request.user.is_superuser or actor_can(request.user, "staff:manage")):
            return False
        if obj is None:
            return True
        return assert_can_act_on_rank(request.user, self._target_rank(obj)) is None

    def has_delete_permission(self, request, obj=None):
        if obj is not None and obj.pk == request.user.pk:
            return False
        return self.has_change_permission(request, obj)

    def save_model(self, request, obj, form, change):
        is_new = not change
        super().save_model(request, obj, form, change)
        audit.record(audit.from_request(
            request, action="staff.created" if is_new else "staff.updated",
            resource_type="staff", resource_id=str(obj.id),
            after_json={"username": obj.username, "is_active": obj.is_active},
        ))

    def save_formset(self, request, form, formset, change):
        instances = formset.save(commit=False)
        for instance in instances:
            if isinstance(instance, UserPermissionOverride) and not instance.pk:
                instance.granted_by = request.user
            if isinstance(instance, UserPermissionOverride) and instance.effect == "grant":
                error = assert_can_grant(request.user, [instance.permission.key])
                if error:
                    messages.error(request, error)
                    continue
            instance.save()
        formset.save_m2m()
        permissions.invalidate_all()

    def delete_model(self, request, obj):
        audit.record(audit.from_request(
            request, action="staff.deleted", resource_type="staff", resource_id=str(obj.id),
            before_json={"username": obj.username},
        ))
        super().delete_model(request, obj)
        permissions.invalidate(obj.id)


@admin.register(StaffMfa)
class StaffMfaAdmin(admin.ModelAdmin):
    list_display = ("user", "enabled_at", "last_used_at")
    readonly_fields = ("user", "enabled_at", "last_used_at", "recovery_reset_by", "recovery_reset_at")
    exclude = ("totp_secret", "pending_secret", "backup_codes", "last_used_code_hash")
    actions = ["reset_mfa"]

    def has_module_permission(self, request):
        return request.user.is_superuser or actor_can(request.user, "staff:read") or actor_can(request.user, "staff:manage_mfa")

    def has_view_permission(self, request, obj=None):
        return self.has_module_permission(request)

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        # Gates whether the "reset 2FA" action is even offered; the action
        # body still re-checks rank per-target via assert_can_act_on_rank.
        return request.user.is_superuser or actor_can(request.user, "staff:manage_mfa")

    @admin.action(description="Reset 2FA for selected staff (they'll be prompted to re-enroll)")
    def reset_mfa(self, request, queryset):
        for staff_mfa in queryset.select_related("user__staff_profile__role"):
            target_rank = staff_mfa.user.staff_profile.role.rank if hasattr(staff_mfa.user, "staff_profile") else None
            error = assert_can_act_on_rank(request.user, target_rank)
            if error:
                messages.error(request, f"{staff_mfa.user}: {error}")
                continue
            staff_mfa.totp_secret = None
            staff_mfa.pending_secret = None
            staff_mfa.enabled_at = None
            staff_mfa.backup_codes = None
            staff_mfa.last_used_code_hash = None
            staff_mfa.recovery_reset_by = request.user
            from django.utils import timezone
            staff_mfa.recovery_reset_at = timezone.now()
            staff_mfa.save()

            profile = staff_mfa.user.staff_profile
            profile.mfa_enabled = False
            profile.save(update_fields=["mfa_enabled"])
            mfa.revoke_all_trusted_devices(staff_mfa.user)

            audit.record(audit.from_request(
                request, action="staff.mfa_reset", resource_type="staff", resource_id=str(staff_mfa.user_id),
            ))
            messages.success(request, f"2FA reset for {staff_mfa.user}.")


@admin.register(TrustedDevice)
class TrustedDeviceAdmin(admin.ModelAdmin):
    list_display = ("user", "label", "ip", "last_used_at", "expires_at")
    readonly_fields = [f.name for f in TrustedDevice._meta.fields]

    def has_module_permission(self, request):
        return request.user.is_superuser or actor_can(request.user, "staff:read") or actor_can(request.user, "staff:manage_mfa")

    def has_view_permission(self, request, obj=None):
        return self.has_module_permission(request)

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False


@admin.register(AccessAuditLog)
class AccessAuditLogAdmin(admin.ModelAdmin):
    list_display = ("created_at", "actor_name", "actor_role", "action", "resource_type", "resource_id", "status_code")
    list_filter = ("action", "resource_type", "actor_role")
    search_fields = ("actor_name", "resource_id", "summary")
    readonly_fields = [f.name for f in AccessAuditLog._meta.fields]
    actions = ["verify_chain_integrity"]

    def has_module_permission(self, request):
        return actor_can(request.user, "audit_logs:read") or request.user.is_superuser

    def has_view_permission(self, request, obj=None):
        return self.has_module_permission(request)

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

    @admin.action(description="Verify audit log chain integrity")
    def verify_chain_integrity(self, request, queryset):
        result = audit.verify_chain()
        if result["ok"]:
            messages.success(request, f"Chain intact — {result['checked']} entries verified.")
        else:
            messages.error(
                request,
                f"CHAIN BROKEN at row {result['broken_at']} ({result['reason']}). "
                f"{result['checked']} entries verified before the break.",
            )
