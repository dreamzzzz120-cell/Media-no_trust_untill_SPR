#!/bin/sh
set -eu

CONF=/tmp/media-clamd.conf

cat > "$CONF" <<'EOF'
Foreground yes
LogTime yes
LogClean no
LogVerbose no
DatabaseDirectory /var/lib/clamav
TCPSocket 3310
TCPAddr 0.0.0.0
MaxThreads 1
MaxQueue 2
MaxConnectionQueueLength 2
ReadTimeout 120
CommandReadTimeout 30
SendBufTimeout 120
StreamMaxLength 512M
MaxScanSize 512M
MaxFileSize 512M
MaxRecursion 16
MaxFiles 10000
ConcurrentDatabaseReload no
Bytecode yes
AlertBrokenExecutables yes
EOF

# Update signatures before accepting scans. If the update service is temporarily
# unavailable but a valid bundled database exists, clamd can still start with it.
freshclam --stdout || true

exec clamd --config-file="$CONF"
