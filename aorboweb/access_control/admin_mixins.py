"""Mixin to gate an existing ModelAdmin by access_control's resource:action
permission keys, instead of Django's built-in auth.Permission system.

Usage: add as the FIRST base class and set `resource = "treks"` (etc.) —
looks up "{resource}:read" for view, "{resource}:edit" for add/change,
"{resource}:delete" for delete. A plain Django superuser with no
StaffProfile yet (e.g. one created via createsuperuser) is left on Django's
default permission behavior so existing access never regresses.
"""
from .rbac_guards import actor_can


class RBACAdminMixin:
    resource = None

    def _has_profile(self, request):
        return hasattr(request.user, "staff_profile")

    def has_module_permission(self, request):
        if not self._has_profile(request):
            return super().has_module_permission(request)
        return actor_can(request.user, f"{self.resource}:read") or actor_can(request.user, f"{self.resource}:edit")

    def has_view_permission(self, request, obj=None):
        if not self._has_profile(request):
            return super().has_view_permission(request, obj)
        return actor_can(request.user, f"{self.resource}:read") or actor_can(request.user, f"{self.resource}:edit")

    def has_add_permission(self, request):
        if not self._has_profile(request):
            return super().has_add_permission(request)
        return actor_can(request.user, f"{self.resource}:edit")

    def has_change_permission(self, request, obj=None):
        if not self._has_profile(request):
            return super().has_change_permission(request, obj)
        return actor_can(request.user, f"{self.resource}:edit")

    def has_delete_permission(self, request, obj=None):
        if not self._has_profile(request):
            return super().has_delete_permission(request, obj)
        return actor_can(request.user, f"{self.resource}:delete") or actor_can(request.user, f"{self.resource}:edit")
