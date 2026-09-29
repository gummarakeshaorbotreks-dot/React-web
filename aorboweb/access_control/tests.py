from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.test import RequestFactory, TestCase, Client, override_settings
from django.urls import reverse
from django.utils import timezone

from . import audit, mfa
from .admin import RoleAdmin, StaffMfaAdmin, StaffPermissionAdmin, StaffUserAdmin, TrustedDeviceAdmin
from .models import AccessAuditLog, Role, StaffMfa, StaffProfile
from .rbac_guards import assert_can_act_on_rank, assert_can_grant

User = get_user_model()


class SeedRbacTests(TestCase):
    def test_seed_creates_roles_and_permissions_idempotently(self):
        call_command("seed_rbac")
        call_command("seed_rbac")  # must not error or duplicate on re-run

        self.assertEqual(Role.objects.count(), 4)
        super_admin = Role.objects.get(name="super_admin")
        self.assertEqual(super_admin.rank, 0)
        self.assertEqual(set(super_admin.permissions.values_list("key", flat=True)), {"*"})

        admin = Role.objects.get(name="admin")
        self.assertIn("staff:manage", admin.permissions.values_list("key", flat=True))
        self.assertNotIn("*", admin.permissions.values_list("key", flat=True))

    def test_seed_removes_stale_unused_system_role(self):
        call_command("seed_rbac")
        Role.objects.create(name="retired_role", rank=70, is_system=True)
        call_command("seed_rbac")
        self.assertFalse(Role.objects.filter(name="retired_role").exists())

    def test_seed_keeps_stale_role_if_staff_still_assigned(self):
        call_command("seed_rbac")
        stale = Role.objects.create(name="retired_role", rank=70, is_system=True)
        user = User.objects.create_user(username="legacy_worker", password="x", is_staff=True)
        StaffProfile.objects.create(user=user, role=stale)
        call_command("seed_rbac")
        self.assertTrue(Role.objects.filter(name="retired_role").exists())


class RankHierarchyTests(TestCase):
    def setUp(self):
        call_command("seed_rbac")
        self.super_admin_role = Role.objects.get(name="super_admin")
        self.admin_role = Role.objects.get(name="admin")
        self.agent_role = Role.objects.get(name="agent")

        self.super_admin = self._make_staff("boss", self.super_admin_role)
        self.admin = self._make_staff("manager", self.admin_role)
        self.other_admin = self._make_staff("manager2", self.admin_role)
        self.agent = self._make_staff("worker", self.agent_role)

    def _make_staff(self, username, role):
        user = User.objects.create_user(username=username, password="x", is_staff=True)
        StaffProfile.objects.create(user=user, role=role)
        return user

    def test_super_admin_can_act_on_anyone(self):
        self.assertIsNone(assert_can_act_on_rank(self.super_admin, self.admin_role.rank))
        self.assertIsNone(assert_can_act_on_rank(self.super_admin, self.super_admin_role.rank))

    def test_admin_can_act_on_junior_role(self):
        self.assertIsNone(assert_can_act_on_rank(self.admin, self.agent_role.rank))

    def test_admin_cannot_act_on_peer_admin(self):
        """Same-rank peers must be blocked, not just senior targets — this was
        a real bug in the ported source (BUGFIX 2026-09-05)."""
        self.assertIsNotNone(assert_can_act_on_rank(self.admin, self.admin_role.rank))

    def test_admin_cannot_act_on_super_admin(self):
        self.assertIsNotNone(assert_can_act_on_rank(self.admin, self.super_admin_role.rank))

    def test_agent_cannot_act_on_admin(self):
        self.assertIsNotNone(assert_can_act_on_rank(self.agent, self.admin_role.rank))

    def test_cannot_grant_permission_you_dont_hold(self):
        error = assert_can_grant(self.agent, ["staff:manage"])
        self.assertIsNotNone(error)

    def test_can_grant_permission_you_hold(self):
        error = assert_can_grant(self.admin, ["treks:edit"])
        self.assertIsNone(error)

    def test_only_super_admin_can_grant_wildcard(self):
        self.assertIsNotNone(assert_can_grant(self.admin, ["*"]))
        self.assertIsNone(assert_can_grant(self.super_admin, ["*"]))


class LoginFlowTests(TestCase):
    def setUp(self):
        call_command("seed_rbac")
        self.agent_role = Role.objects.get(name="agent")
        self.user = User.objects.create_user(username="alice", password="correct-horse", is_staff=True)
        StaffProfile.objects.create(user=self.user, role=self.agent_role)
        self.client = Client()

    def test_login_without_mfa_succeeds_directly(self):
        response = self.client.post(reverse("access_control:staff_login"), {
            "username": "alice", "password": "correct-horse",
        })
        self.assertEqual(response.status_code, 302)
        self.assertIn("_auth_user_id", self.client.session)

    def test_wrong_password_shows_error_not_redirect(self):
        response = self.client.post(reverse("access_control:staff_login"), {
            "username": "alice", "password": "wrong",
        })
        self.assertEqual(response.status_code, 200)
        self.assertNotIn("_auth_user_id", self.client.session)

    @override_settings(AXES_ENABLED=False)
    def test_account_lockout_after_repeated_failures(self):
        # axes' own IP-based lockout (limit 5) would otherwise intercept
        # before our per-account counter (limit 10) ever gets there — this
        # test isolates the per-account mechanism, which is what's new here.
        for _ in range(10):
            self.client.post(reverse("access_control:staff_login"), {
                "username": "alice", "password": "wrong",
            })
        profile = StaffProfile.objects.get(user=self.user)
        self.assertIsNotNone(profile.account_locked_until)
        self.assertGreater(profile.account_locked_until, timezone.now())

        # Even the CORRECT password must now be rejected while locked.
        response = self.client.post(reverse("access_control:staff_login"), {
            "username": "alice", "password": "correct-horse",
        })
        self.assertNotIn("_auth_user_id", self.client.session)
        self.assertContains(response, "correct username and password")


class MfaFlowTests(TestCase):
    def setUp(self):
        call_command("seed_rbac")
        self.agent_role = Role.objects.get(name="agent")
        self.user = User.objects.create_user(username="bob", password="pw12345", is_staff=True)
        self.profile = StaffProfile.objects.create(user=self.user, role=self.agent_role, mfa_enabled=True)
        self.secret = mfa.generate_secret()
        self.staff_mfa = StaffMfa.objects.create(
            user=self.user, totp_secret=mfa.encrypt(self.secret), enabled_at=timezone.now()
        )
        self.client = Client()

    def _current_code(self):
        import pyotp
        return pyotp.TOTP(self.secret).now()

    def test_login_with_mfa_enabled_requires_second_step(self):
        response = self.client.post(reverse("access_control:staff_login"), {
            "username": "bob", "password": "pw12345",
        })
        self.assertEqual(response.status_code, 302)
        self.assertIn("mfa/verify", response.url)
        self.assertNotIn("_auth_user_id", self.client.session)

    def test_correct_totp_completes_login(self):
        self.client.post(reverse("access_control:staff_login"), {"username": "bob", "password": "pw12345"})
        response = self.client.post(reverse("access_control:mfa_verify"), {"code": self._current_code()})
        self.assertEqual(response.status_code, 302)
        self.assertIn("_auth_user_id", self.client.session)

    def test_wrong_totp_rejected(self):
        self.client.post(reverse("access_control:staff_login"), {"username": "bob", "password": "pw12345"})
        response = self.client.post(reverse("access_control:mfa_verify"), {"code": "000000"})
        self.assertNotIn("_auth_user_id", self.client.session)
        self.assertContains(response, "Invalid code")

    def test_totp_replay_is_rejected(self):
        code = self._current_code()
        self.client.post(reverse("access_control:staff_login"), {"username": "bob", "password": "pw12345"})
        first = self.client.post(reverse("access_control:mfa_verify"), {"code": code})
        self.assertIn("_auth_user_id", self.client.session)

        self.client.logout()
        self.client.post(reverse("access_control:staff_login"), {"username": "bob", "password": "pw12345"})
        replay = self.client.post(reverse("access_control:mfa_verify"), {"code": code})
        self.assertNotIn("_auth_user_id", self.client.session)
        self.assertContains(replay, "already used")

    def test_backup_code_login_is_single_use(self):
        plaintext_codes, stored = mfa.generate_backup_codes(n=2)
        self.staff_mfa.backup_codes = stored
        self.staff_mfa.save()

        self.client.post(reverse("access_control:staff_login"), {"username": "bob", "password": "pw12345"})
        response = self.client.post(reverse("access_control:mfa_verify"), {"code": plaintext_codes[0]})
        self.assertIn("_auth_user_id", self.client.session)

        self.client.logout()
        self.client.post(reverse("access_control:staff_login"), {"username": "bob", "password": "pw12345"})
        reuse = self.client.post(reverse("access_control:mfa_verify"), {"code": plaintext_codes[0]})
        self.assertNotIn("_auth_user_id", self.client.session)

    def test_trusted_device_skips_mfa(self):
        raw_token = mfa.issue_trusted_device(self.user, request=None)
        self.client.cookies["staff_td"] = raw_token
        response = self.client.post(reverse("access_control:staff_login"), {
            "username": "bob", "password": "pw12345",
        })
        self.assertEqual(response.status_code, 302)
        self.assertIn("_auth_user_id", self.client.session)


class MfaEncryptionTests(TestCase):
    def test_encrypt_decrypt_roundtrip(self):
        secret = mfa.generate_secret()
        blob = mfa.encrypt(secret)
        self.assertNotEqual(blob, secret)
        self.assertEqual(mfa.decrypt(blob), secret)

    def test_backup_code_hash_never_stores_plaintext(self):
        plaintext, stored = mfa.generate_backup_codes(n=3)
        for code, record in zip(plaintext, stored):
            self.assertNotEqual(record["hash"], code)
        ok, updated = mfa.verify_backup_code(stored, plaintext[0])
        self.assertTrue(ok)
        self.assertIsNotNone(updated[0]["used_at"])
        # single-use: verifying the same code again must fail
        ok2, _ = mfa.verify_backup_code(updated, plaintext[0])
        self.assertFalse(ok2)


class StaffSerialTests(TestCase):
    def setUp(self):
        call_command("seed_rbac")
        self.role = Role.objects.get(name="agent")

    def _make_staff(self, username):
        user = User.objects.create_user(username=username, password="x", is_staff=True)
        return StaffProfile.objects.create(user=user, role=self.role)

    def test_serial_auto_assigned_sequentially(self):
        first = self._make_staff("one")
        second = self._make_staff("two")
        third = self._make_staff("three")
        self.assertEqual(first.staff_serial, "AORBO00001")
        self.assertEqual(second.staff_serial, "AORBO00002")
        self.assertEqual(third.staff_serial, "AORBO00003")

    def test_serial_not_reused_after_deletion(self):
        first = self._make_staff("one")
        first.user.delete()
        second = self._make_staff("two")
        self.assertEqual(second.staff_serial, "AORBO00002")

    def test_serial_is_unique(self):
        self._make_staff("one")
        second = self._make_staff("two")
        self.assertNotEqual(StaffProfile.objects.first().staff_serial, second.staff_serial)


class SessionInvalidationTests(TestCase):
    def setUp(self):
        call_command("seed_rbac")
        self.role = Role.objects.get(name="agent")
        self.user = User.objects.create_user(username="carol", password="pw12345", is_staff=True)
        self.profile = StaffProfile.objects.create(user=self.user, role=self.role)
        self.client = Client()

    def _login(self):
        return self.client.post(reverse("access_control:staff_login"), {
            "username": "carol", "password": "pw12345",
        })

    def test_deactivating_account_kills_open_session_on_next_request(self):
        self._login()
        self.assertIn("_auth_user_id", self.client.session)

        self.profile.status = "inactive"
        self.profile.save(update_fields=["status"])

        response = self.client.get(reverse("admin:index"))
        self.assertNotIn("_auth_user_id", self.client.session)
        self.assertEqual(response.status_code, 302)

    def test_session_version_bump_kills_other_open_sessions(self):
        self._login()
        self.assertIn("_auth_user_id", self.client.session)

        # Simulate a second, separate login elsewhere bumping the counter.
        # (self.profile is a stale in-memory copy from setUp() - the login
        # view above bumped a separately-fetched DB row - so refresh first,
        # or this "bump" just re-saves the same value already in the session.)
        self.profile.refresh_from_db()
        self.profile.session_version += 1
        self.profile.save(update_fields=["session_version"])

        response = self.client.get(reverse("admin:index"))
        self.assertNotIn("_auth_user_id", self.client.session)
        self.assertEqual(response.status_code, 302)

    def test_password_change_bumps_session_version(self):
        original = self.profile.session_version
        self.user.set_password("new-password")
        self.user.save()
        self.profile.refresh_from_db()
        self.assertGreater(self.profile.session_version, original)

    def test_active_session_survives_unrelated_field_changes(self):
        self._login()
        self.user.first_name = "Carol"
        self.user.save()
        response = self.client.get(reverse("admin:index"))
        self.assertIn("_auth_user_id", self.client.session)


class AdminPermissionGateTests(TestCase):
    """Directly answers: can a non-admin (agent/read_only) account create
    staff accounts or modify permissions/roles through the Django admin?
    These check the actual has_*_permission methods the admin UI calls -
    not just the underlying rbac_guards functions - since a gap here
    (forgetting to override one) would silently fall back to Django's
    unrelated built-in permission system."""

    def setUp(self):
        call_command("seed_rbac")
        self.factory = RequestFactory()
        self.super_admin = self._make_staff("root", Role.objects.get(name="super_admin"))
        self.admin = self._make_staff("chief", Role.objects.get(name="admin"))
        self.agent = self._make_staff("worker", Role.objects.get(name="agent"))
        self.read_only = self._make_staff("auditor", Role.objects.get(name="read_only"))

    def _make_staff(self, username, role):
        user = User.objects.create_user(username=username, password="x", is_staff=True)
        StaffProfile.objects.create(user=user, role=role)
        return user

    def _request_as(self, user):
        request = self.factory.get("/supersecretadmin/")
        request.user = user
        return request

    def test_agent_cannot_see_or_add_staff_accounts(self):
        admin_instance = StaffUserAdmin(User, None)
        req = self._request_as(self.agent)
        self.assertFalse(admin_instance.has_module_permission(req))
        self.assertFalse(admin_instance.has_add_permission(req))

    def test_read_only_can_view_but_not_add_staff_accounts(self):
        admin_instance = StaffUserAdmin(User, None)
        req = self._request_as(self.read_only)
        self.assertTrue(admin_instance.has_module_permission(req))
        self.assertFalse(admin_instance.has_add_permission(req))

    def test_admin_can_add_staff_accounts(self):
        admin_instance = StaffUserAdmin(User, None)
        req = self._request_as(self.admin)
        self.assertTrue(admin_instance.has_module_permission(req))
        self.assertTrue(admin_instance.has_add_permission(req))

    def test_agent_cannot_see_or_modify_roles(self):
        admin_instance = RoleAdmin(Role, None)
        req = self._request_as(self.agent)
        self.assertFalse(admin_instance.has_module_permission(req))
        self.assertFalse(admin_instance.has_add_permission(req))
        self.assertFalse(admin_instance.has_change_permission(req, Role.objects.get(name="agent")))

    def test_read_only_can_view_but_not_modify_roles(self):
        admin_instance = RoleAdmin(Role, None)
        req = self._request_as(self.read_only)
        self.assertTrue(admin_instance.has_module_permission(req))
        self.assertFalse(admin_instance.has_add_permission(req))
        self.assertFalse(admin_instance.has_change_permission(req, Role.objects.get(name="agent")))

    def test_admin_can_modify_roles_below_its_own_rank(self):
        admin_instance = RoleAdmin(Role, None)
        req = self._request_as(self.admin)
        self.assertTrue(admin_instance.has_add_permission(req))
        self.assertTrue(admin_instance.has_change_permission(req, Role.objects.get(name="agent")))
        self.assertFalse(admin_instance.has_change_permission(req, Role.objects.get(name="admin")))

    def test_nobody_can_freely_add_permissions_via_admin_not_even_super_admin(self):
        """Permissions come from access_control/catalog.py + seed_rbac only -
        never hand-typed through a form (see StaffPermissionAdmin docstring)."""
        admin_instance = StaffPermissionAdmin(StaffMfa, None)  # model arg unused by these checks
        for user in (self.agent, self.read_only, self.admin, self.super_admin):
            req = self._request_as(user)
            self.assertFalse(admin_instance.has_add_permission(req))
            self.assertFalse(admin_instance.has_change_permission(req))
            self.assertFalse(admin_instance.has_delete_permission(req))

    def test_agent_cannot_reset_others_mfa_or_see_trusted_devices(self):
        mfa_admin = StaffMfaAdmin(StaffMfa, None)
        device_admin = TrustedDeviceAdmin(StaffMfa, None)
        req = self._request_as(self.agent)
        self.assertFalse(mfa_admin.has_module_permission(req))
        self.assertFalse(mfa_admin.has_change_permission(req))
        self.assertFalse(device_admin.has_module_permission(req))


class AuditChainTests(TestCase):
    def test_chain_links_and_verifies(self):
        for i in range(5):
            audit.record({"action": f"test.event.{i}", "resource_type": "test", "resource_id": str(i)})

        rows = list(AccessAuditLog.objects.order_by("id"))
        self.assertEqual(len(rows), 5)
        self.assertIsNone(rows[0].prev_hash)
        for prev, current in zip(rows, rows[1:]):
            self.assertEqual(current.prev_hash, prev.hash)

        result = audit.verify_chain()
        self.assertTrue(result["ok"])
        self.assertEqual(result["checked"], 5)

    def test_tampering_is_detected(self):
        audit.record({"action": "test.a"})
        audit.record({"action": "test.b"})
        row = AccessAuditLog.objects.order_by("id").first()
        row.summary = "tampered"
        row.save(update_fields=["summary"])

        result = audit.verify_chain()
        self.assertFalse(result["ok"])

    def test_record_never_raises_on_bad_input(self):
        # Oversized fields should be truncated, not raise.
        result = audit.record({"action": "x" * 500, "summary": "y" * 10000})
        self.assertIsNotNone(result)
