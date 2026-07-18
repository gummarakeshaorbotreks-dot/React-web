import os

ROOT = "aorboweb"

TEMPLATE_FILES = [
    "admin/base_site.html",
    "admin/visitor_changelist.html",
    "admin/searchlog_changelist.html",
    "admin/contact_submissions_filter.html",
    "admin/contact_filter.html",
    "emails/base.html",
    "emails/footer.html",
    "emails/organizer.html",
    "emails/other.html",
    "emails/trekker.html",
    "emails/osm_draft_notification.html",
    "treks_app/mail.html",
    "treks_app/templates/treks_app/mail.html",
    "registration/password_reset_email.html",
]

# Look for these function names / keyword patterns (string containment)
KEYWORDS = [
    "send_mail",
    "EmailMultiAlternatives",
    "render(",
    "render_to_string",
    "get_template",
    "template_name",
]

KEYWORD_FILENAME_FRAGMENTS = [
    "base_site.html",
    "visitor_changelist.html",
    "searchlog_changelist.html",
    "contact_submissions_filter.html",
    "contact_filter.html",
    "base.html",
    "footer.html",
    "organizer.html",
    "other.html",
    "trekker.html",
    "osm_draft_notification.html",
    "mail.html",
    "password_reset_email.html",
]


def read_text(path: str) -> str:
    try:
        with open(path, "r", encoding="utf-8") as f:
            return f.read()
    except UnicodeDecodeError:
        with open(path, "r", encoding="latin1") as f:
            return f.read()


def main():
    matches = []
    keyword_hits = []

    # 1) keyword/function hits in .py files
    for dirpath, _, filenames in os.walk(ROOT):
        for fn in filenames:
            if not fn.endswith(".py"):
                continue
            path = os.path.join(dirpath, fn)
            txt = read_text(path)
            for i, line in enumerate(txt.splitlines(), 1):
                for kw in KEYWORDS:
                    if kw in line:
                        matches.append((path, i, line.strip(), "kw"))
                        break

    # 2) direct mentions of template filenames in .py files
    for dirpath, _, filenames in os.walk(ROOT):
        for fn in filenames:
            if not fn.endswith(".py"):
                continue
            path = os.path.join(dirpath, fn)
            txt = read_text(path)
            for i, line in enumerate(txt.splitlines(), 1):
                for t in TEMPLATE_FILES:
                    if t in line:
                        keyword_hits.append((path, i, line.strip(), "template"))
                        break

    # 3) fallback: filename fragments
    fragment_hits = []
    for dirpath, _, filenames in os.walk(ROOT):
        for fn in filenames:
            if not fn.endswith(".py"):
                continue
            path = os.path.join(dirpath, fn)
            txt = read_text(path)
            for i, line in enumerate(txt.splitlines(), 1):
                for frag in KEYWORD_FILENAME_FRAGMENTS:
                    if frag in line:
                        fragment_hits.append((path, i, line.strip(), "frag"))
                        break

    # De-dup by (path,i,line,kind)
    all_hits = matches + keyword_hits + fragment_hits
    seen = set()
    out = []
    for item in all_hits:
        k = (item[0], item[1], item[2], item[3])
        if k in seen:
            continue
        seen.add(k)
        out.append(item)

    out.sort(key=lambda x: (x[0], x[1]))

    print(f"Found {len(out)} hits (py files only).\n")
    for path, i, line, kind in out:
        print(f"{path}:{i} [{kind}] {line}")


if __name__ == "__main__":
    main()

