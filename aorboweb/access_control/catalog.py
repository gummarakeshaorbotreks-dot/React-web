"""Permission catalog and role definitions for this site. Scaled down from
the Node backend's finance/booking-heavy catalog to what aorboweb actually
has: trek/blog content, contact-form leads, and staff management.

Each catalog entry: (key, label, category, is_dangerous).
"""

CATALOG = [
    ("dashboard:read", "View dashboard", "Dashboard", False),

    ("treks:read", "View treks", "Treks & Catalog", False),
    ("treks:edit", "Edit treks", "Treks & Catalog", False),
    ("treks:delete", "Delete treks", "Treks & Catalog", True),

    ("content:read", "View site content (blogs, FAQ, banners, etc.)", "Content", False),
    ("content:edit", "Edit site content", "Content", False),
    ("content:delete", "Delete site content", "Content", True),

    ("contacts:read", "View contact-form submissions", "Contacts", False),
    ("contacts:delete", "Delete contact-form submissions", "Contacts", True),

    ("analytics:read", "View visitor/search analytics", "Analytics", False),

    ("osm_drafts:read", "View OSM-imported draft treks", "OSM Drafts", False),
    ("osm_drafts:approve", "Approve/publish an OSM draft trek", "OSM Drafts", True),
    ("osm_drafts:delete", "Delete an OSM draft trek", "OSM Drafts", True),

    ("staff:read", "View staff accounts", "Access & Staff", False),
    ("staff:manage", "Create/edit/deactivate staff accounts", "Access & Staff", True),
    ("staff:manage_mfa", "Reset another staff member's 2FA", "Access & Staff", True),
    ("roles:read", "View roles and permissions", "Access & Staff", False),
    ("roles:manage", "Create/edit roles and permission grants", "Access & Staff", True),

    ("audit_logs:read", "View the staff action audit log", "Observability", False),
    ("crash_reports:read", "View frontend/backend crash reports", "Observability", False),
    ("crash_reports:resolve", "Mark a crash report resolved", "Observability", False),

    ("*", "Full access (super admin)", "System", True),
]

READ_ONLY_KEYS = [key for key, *_ in CATALOG if key.endswith(":read")]

ROLES = [
    {
        "name": "super_admin",
        "rank": 0,
        "is_system": True,
        "description": "Full access, including staff & role management. Every action still logged.",
        "keys": ["*"],
    },
    {
        "name": "admin",
        "rank": 10,
        "is_system": True,
        "description": (
            "Everything an agent can do, plus hiring/managing staff (agents and other "
            "non-admin staff) and role/permission management. Cannot touch another admin "
            "or super_admin."
        ),
        "keys": [
            "dashboard:read",
            "treks:read", "treks:edit", "treks:delete",
            "content:read", "content:edit", "content:delete",
            "contacts:read", "contacts:delete",
            "analytics:read",
            "osm_drafts:read", "osm_drafts:approve", "osm_drafts:delete",
            "staff:read", "staff:manage", "staff:manage_mfa",
            "roles:read", "roles:manage",
            "audit_logs:read",
            "crash_reports:read", "crash_reports:resolve",
        ],
    },
    {
        "name": "agent",
        "rank": 40,
        "is_system": True,
        "description": (
            "Day-to-day operations: add/edit/delete treks and site content, process and "
            "delete contact-form leads, approve or delete OSM draft treks. Hired/managed "
            "by admin or super_admin. No staff, role, or audit-log access."
        ),
        "keys": [
            "dashboard:read",
            "treks:read", "treks:edit", "treks:delete",
            "content:read", "content:edit", "content:delete",
            "contacts:read", "contacts:delete",
            "analytics:read",
            "osm_drafts:read", "osm_drafts:approve", "osm_drafts:delete",
        ],
    },
    {
        "name": "read_only",
        "rank": 90,
        "is_system": True,
        "description": "View-only across the panel — for auditors and observers. No mutations at all.",
        "keys": READ_ONLY_KEYS,
    },
]
