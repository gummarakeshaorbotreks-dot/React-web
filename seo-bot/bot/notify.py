"""Send a Telegram alert from the command line (used by n8n when a bot workflow fails).

    python notify.py "Daily health check failed: <error>"
"""
import sys

from common import esc, telegram

if __name__ == "__main__":
    text = " ".join(sys.argv[1:]) or "Unknown bot error"
    ok = telegram(f"⚠️ <b>SEO bot problem</b>\n\n{esc(text)}\n\nThe site itself may be fine; the bot needs a look.")
    sys.exit(0 if ok else 1)
