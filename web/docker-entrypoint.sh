#!/bin/sh
# Render runtime config from container env vars into /config.js so the SPA
# can read it via window.__APP_CONFIG__ at boot. This keeps the image truly
# environment-agnostic (12-factor) and avoids rebuilding to change the API URL.
set -eu

CONFIG_FILE="/usr/share/nginx/html/config.js"

json_field() {
  key="$1"
  val="$2"
  if [ -z "$val" ]; then
    printf '  "%s": null' "$key"
  else
    escaped=$(printf '%s' "$val" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g')
    printf '  "%s": "%s"' "$key" "$escaped"
  fi
}

{
  printf 'window.__APP_CONFIG__ = {\n'
  json_field "apiBaseUrl" "${API_BASE_URL:-}"
  printf '\n};\n'
} > "$CONFIG_FILE"

echo "[entrypoint] wrote $CONFIG_FILE:" >&2
cat "$CONFIG_FILE" >&2

exec "$@"
