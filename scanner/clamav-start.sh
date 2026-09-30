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
MaxQueue 1
MaxConnectionQueueLength 1
ReadTimeout 120
CommandReadTimeout 30
SendBufTimeout 120
StreamMaxLength 256M
MaxScanSize 256M
MaxFileSize 256M
MaxRecursion 12
MaxFiles 5000
ConcurrentDatabaseReload no
Bytecode no
AlertBrokenExecutables yes
EOF

# Railway production scanner is memory constrained. Updating and loading the
# databases concurrently can push ClamAV over the service limit, so update
# first, then start clamd with the bounded configuration above.
freshclam --stdout || true

# Keep clamd as PID 1 so Railway sees the real daemon lifecycle.
exec clamd --config-file="$CONF"
