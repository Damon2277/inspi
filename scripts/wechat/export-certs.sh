#!/usr/bin/env bash

set -euo pipefail

CERT_DIR=${1:-}
OUTPUT_FILE=${2:-wechat-secrets.env}

if [[ -z "$CERT_DIR" ]]; then
  echo "Usage: $0 <cert-directory> [output-file]" >&2
  exit 1
fi

KEY_FILE="$CERT_DIR/apiclient_key.pem"
MCH_CERT_FILE="$CERT_DIR/apiclient_cert.pem"
PLATFORM_CERT_FILE="$CERT_DIR/platform_cert.pem"

encode_file() {
  local file="$1"
  if [[ ! -f "$file" ]]; then
    echo "File not found: $file" >&2
    exit 1
  fi
  openssl base64 -A < "$file"
}

cat > "$OUTPUT_FILE" <<EOF
WECHAT_PRIVATE_KEY_BASE64=$(encode_file "$KEY_FILE")
WECHAT_MCH_CERT_BASE64=$(encode_file "$MCH_CERT_FILE")
WECHAT_PLATFORM_CERT_BASE64=$(encode_file "$PLATFORM_CERT_FILE")
EOF

echo "Secrets exported to $OUTPUT_FILE"
