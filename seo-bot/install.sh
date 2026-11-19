#!/usr/bin/env bash
# Install the SEO / vendor bot on its server (freescout-vps) from a tarball of this folder
# (bot/, n8n/, README.md, requirements.txt, install.sh) - ONLY if its tests pass there first.
# GitHub's hosted test runners are off (billing), so this is the gate before anything goes live.
#
#   tar -cf bot.tar bot n8n README.md requirements.txt install.sh     (on the laptop, in seo-bot/)
#   bash install.sh /root/bot.tar                                       (on the server, as root)
#
# Keeps a backup of what it replaces: /root/aorbo-bot-before-<time>.tar. n8n workflows are NOT
# re-imported here (that needs n8n stopped: see README "Workflows").
set -euo pipefail
TAR=${1:?usage: install.sh /path/to/bot.tar}
HOME_DIR=/opt/aorbo-bot
NEW=$(mktemp -d /tmp/aorbo-bot-new.XXXXXX)
trap 'rm -rf "$NEW"' EXIT
tar -xf "$TAR" -C "$NEW"
find "$NEW" -type f \( -name '*.py' -o -name '*.sh' \) -exec sed -i 's/\r$//' {} +

echo "== tests (on this server's Python)"
( cd "$NEW/bot" && AORBO_BOT_DATA="$NEW/test-data" "$HOME_DIR/venv/bin/python" -m unittest discover -p 'test_*.py' )

echo "== backup + install"
STAMP=$(date +%Y%m%d-%H%M%S)
tar -cf "/root/aorbo-bot-before-$STAMP.tar" -C "$HOME_DIR" bot n8n README.md requirements.txt 2>/dev/null || true
rm -rf "$NEW/test-data" "$NEW"/bot/__pycache__
cp -r "$NEW/bot/." "$HOME_DIR/bot/"
cp -r "$NEW/n8n/." "$HOME_DIR/n8n/"
cp "$NEW/README.md" "$NEW/requirements.txt" "$NEW/install.sh" "$HOME_DIR/"
chown -R n8n:n8n "$HOME_DIR/bot" "$HOME_DIR/n8n" "$HOME_DIR/README.md" "$HOME_DIR/requirements.txt" "$HOME_DIR/install.sh"
"$HOME_DIR/venv/bin/python" -m py_compile "$HOME_DIR"/bot/*.py
echo "installed (backup /root/aorbo-bot-before-$STAMP.tar)"
