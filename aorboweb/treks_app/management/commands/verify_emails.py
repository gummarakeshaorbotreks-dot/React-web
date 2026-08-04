"""
Django management command to verify all 5 email flows render correctly
through the React/Node path.

Usage: python manage.py verify_emails
"""

import os
import sys
from django.conf import settings
from django.core.management.base import BaseCommand
from django.test.utils import override_settings


class Command(BaseCommand):
    help = "Verifies all 5 email types render correctly via the React/Node path"

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS("=" * 70))
        self.stdout.write(self.style.SUCCESS("EMAIL VERIFICATION - React/Node Render Test"))
        self.stdout.write(self.style.SUCCESS("=" * 70))

        # Temporarily set email backend to console so we see output
        # without actually sending via SMTP
        console_backend = "django.core.mail.backends.console.EmailBackend"
        original_backend = settings.EMAIL_BACKEND
        settings.EMAIL_BACKEND = console_backend

        results = []

        # 1. TREKKER EMAIL
        self.stdout.write("\n" + self.style.WARNING("-" * 70))
        self.stdout.write(self.style.WARNING("[1/5] TrekkerEmail"))
        self.stdout.write(self.style.WARNING("-" * 70))
        try:
            from treks_app.email_renderer import render_react_email
            html = render_react_email("TrekkerEmail", {
                "name": "Test Trekker",
                "email": "trekker@example.com",
                "message": "I want to go on an adventure trek in Himachal!",
                "displayCategory": "Adventure",
                "exploreLink": "https://www.aorbotreks.com/treks?tag=adventure",
                "currentYear": 2025,
            })
            self.stdout.write(f"[PASS] SUCCESS - HTML length: {len(html)} chars")
            # Show a preview of the rendered HTML
            preview = html[:500] + "..." if len(html) > 500 else html
            self.stdout.write(f"\nPreview:\n{preview}\n")
            results.append(("TrekkerEmail", True, html))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"[FAIL] {e}"))
            results.append(("TrekkerEmail", False, str(e)))

        # 2. ORGANIZER EMAIL
        self.stdout.write("\n" + self.style.WARNING("-" * 70))
        self.stdout.write(self.style.WARNING("[2/5] OrganizerEmail"))
        self.stdout.write(self.style.WARNING("-" * 70))
        try:
            from treks_app.email_renderer import render_react_email
            html = render_react_email("OrganizerEmail", {
                "name": "Test Organizer",
                "email": "organizer@example.com",
                "message": "I run a trekking company in Uttarakhand and want to partner.",
                "currentYear": 2025,
            })
            self.stdout.write(f"[PASS] SUCCESS - HTML length: {len(html)} chars")
            preview = html[:500] + "..." if len(html) > 500 else html
            self.stdout.write(f"\nPreview:\n{preview}\n")
            results.append(("OrganizerEmail", True, html))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"[FAIL] {e}"))
            results.append(("OrganizerEmail", False, str(e)))

        # 3. OTHER INQUIRY EMAIL
        self.stdout.write("\n" + self.style.WARNING("-" * 70))
        self.stdout.write(self.style.WARNING("[3/5] OtherInquiryEmail"))
        self.stdout.write(self.style.WARNING("-" * 70))
        try:
            from treks_app.email_renderer import render_react_email
            html = render_react_email("OtherInquiryEmail", {
                "name": "Test Other",
                "email": "other@example.com",
                "message": "I have a general inquiry about Aorbo Treks.",
                "currentYear": 2025,
            })
            self.stdout.write(f"[PASS] SUCCESS - HTML length: {len(html)} chars")
            preview = html[:500] + "..." if len(html) > 500 else html
            self.stdout.write(f"\nPreview:\n{preview}\n")
            results.append(("OtherInquiryEmail", True, html))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"[FAIL] {e}"))
            results.append(("OtherInquiryEmail", False, str(e)))

        # 4. OSM DRAFT NOTIFICATION EMAIL
        self.stdout.write("\n" + self.style.WARNING("-" * 70))
        self.stdout.write(self.style.WARNING("[4/5] OsmDraftNotificationEmail"))
        self.stdout.write(self.style.WARNING("-" * 70))
        try:
            from treks_app.email_renderer import render_react_email
            html = render_react_email("OsmDraftNotificationEmail", {
                "trekName": "Kedarkantha Trek",
                "state": "Uttarakhand",
                "imageUrl": "https://example.com/kedarkantha.jpg",
                "shortDesc": "A beautiful winter trek in the Garhwal Himalayas with stunning views of snow-capped peaks.",
                "adminUrl": "https://admin.aorbotreks.com/admin/treks_app/osmdrafttrek/1/change/",
            })
            self.stdout.write(f"[PASS] SUCCESS - HTML length: {len(html)} chars")
            preview = html[:500] + "..." if len(html) > 500 else html
            self.stdout.write(f"\nPreview:\n{preview}\n")
            results.append(("OsmDraftNotificationEmail", True, html))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"[FAIL] {e}"))
            results.append(("OsmDraftNotificationEmail", False, str(e)))

        # 5. PASSWORD RESET EMAIL
        self.stdout.write("\n" + self.style.WARNING("-" * 70))
        self.stdout.write(self.style.WARNING("[5/5] PasswordResetEmail"))
        self.stdout.write(self.style.WARNING("-" * 70))
        try:
            from treks_app.email_renderer import render_react_email
            html = render_react_email("PasswordResetEmail", {
                "email": "user@example.com",
                "protocol": "https",
                "domain": "www.aorbotreks.com",
                "uidb64": "MQ",
                "token": "abc123def456",
            })
            self.stdout.write(f"[PASS] SUCCESS - HTML length: {len(html)} chars")
            preview = html[:500] + "..." if len(html) > 500 else html
            self.stdout.write(f"\nPreview:\n{preview}\n")
            results.append(("PasswordResetEmail", True, html))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"[FAIL] {e}"))
            results.append(("PasswordResetEmail", False, str(e)))

        # Restore email backend
        settings.EMAIL_BACKEND = original_backend

        # Summary
        self.stdout.write("\n" + self.style.SUCCESS("=" * 70))
        self.stdout.write(self.style.SUCCESS("SUMMARY"))
        self.stdout.write(self.style.SUCCESS("=" * 70))
        all_passed = True
        for name, success, _ in results:
            if success:
                self.stdout.write(f"  [PASS] {name}")
            else:
                self.stdout.write(self.style.ERROR(f"  [FAIL] {name}"))
                all_passed = False

        if all_passed:
            self.stdout.write("\n" + self.style.SUCCESS("All 5 email types rendered successfully!"))
        else:
            self.stdout.write("\n" + self.style.ERROR("Some email types failed!"))
            sys.exit(1)

