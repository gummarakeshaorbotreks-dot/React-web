#!/usr/bin/env bash
# Forced command for the SEO bot's SSH key (authorized_keys: restrict,command="...").
# The bot can only ask for these actions; anything else is refused.
case "${SSH_ORIGINAL_COMMAND:-}" in
  deploy)       exec /opt/aorbo-site/deploy.sh ;;
  geo)          exec python3 /opt/aorbo-site/put_geo.py ;;   # trek positions (JSON on stdin) for city pages
  last-deploy)  ls -t /opt/aorbo-site/logs/deploy-*.log 2>/dev/null | head -1 | xargs -r tail -n 30 ;;
  status)       systemctl is-active nginx gunicorn-aorboweb postgresql@16-main; df -h / | tail -1; free -h | sed -n 2p ;;
  *)            echo "not allowed: ${SSH_ORIGINAL_COMMAND:-<none>}"; exit 1 ;;
esac
