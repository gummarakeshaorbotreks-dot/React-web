#!/usr/bin/env bash
# Build aorbotreks.com from /opt/aorbo-site/src and deploy it safely, on the web server.
#
#   1. build (npm ci only when package-lock.json changed)
#   2. gate: the new build must be complete (pages, sitemap, robots, verification files)
#   3. swap into /var/www/aorbo-frontend, keeping old hashed assets for cached visitors
#   4. post-check through nginx; on failure, roll back to the previous site at once
#   5. keep the 2 newest backups; tell IndexNow which pages changed
#
# Run by root, or by the SEO bot through bot-entry.sh. Exit codes: 0 deployed,
# 3 another deploy running, 10 build failed, 11 gate failed (nothing changed),
# 12 post-check failed (rolled back).
set -euo pipefail
HERE=/opt/aorbo-site
SRC=$HERE/src
W=/var/www
LIVE=$W/aorbo-frontend
ts=$(date +%Y%m%d-%H%M%S)
LOG=$HERE/logs/deploy-$ts.log
mkdir -p $HERE/logs
exec > >(tee -a "$LOG") 2>&1

exec 9>/run/aorbo-site-deploy.lock
flock -n 9 || { echo "another deploy is running"; exit 3; }

echo "== deploy $ts"
cd "$SRC"
sum=$(sha256sum package-lock.json | cut -d' ' -f1)
if [ ! -d node_modules ] || [ "$(cat node_modules/.lock-sum 2>/dev/null)" != "$sum" ]; then
  echo "installing dependencies"
  nice -n 10 npm ci --no-audit --no-fund --loglevel=error
  echo "$sum" > node_modules/.lock-sum
fi
if ! nice -n 10 npm run build > "$HERE/logs/build-$ts.log" 2>&1; then
  tail -20 "$HERE/logs/build-$ts.log"; echo "BUILD FAILED - site unchanged"; exit 10
fi
grep -E "^(seo-pages|prerender):" "$HERE/logs/build-$ts.log" || true

if ! python3 $HERE/gate.py "$SRC/dist" "$LIVE"; then
  echo "GATE FAILED - site unchanged"; exit 11
fi
python3 $HERE/changed_pages.py "$LIVE" "$SRC/dist" > "$HERE/logs/changed-$ts.txt"

NEW=$W/aorbo-frontend.new
rm -rf "$NEW"
cp -a "$SRC/dist" "$NEW"
cp -r --update=none "$LIVE/assets/." "$NEW/assets/"   # old chunks for visitors on a cached page
chown -R www-data:www-data "$NEW"
mv "$LIVE" "$W/aorbo-frontend.bak-$ts"
mv "$NEW" "$LIVE"

if ! python3 $HERE/post_check.py; then
  rm -rf "$LIVE"
  mv "$W/aorbo-frontend.bak-$ts" "$LIVE"
  echo "POST-CHECK FAILED - ROLLED BACK to the previous site"; exit 12
fi

ls -d $W/aorbo-frontend.bak-* | sort | head -n -2 | xargs -r rm -rf
find $HERE/logs -type f -mtime +30 -delete

changed=$(wc -l < "$HERE/logs/changed-$ts.txt")
if [ "$changed" -gt 0 ]; then
  xargs -a "$HERE/logs/changed-$ts.txt" node scripts/indexnow.mjs || echo "indexnow ping failed (site is deployed)"
fi
echo "DEPLOYED $ts, $changed page(s) changed"
