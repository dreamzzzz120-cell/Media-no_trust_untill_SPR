param([string]$ScanToken)
$ErrorActionPreference = 'Stop'
Set-Location (Resolve-Path (Join-Path $PSScriptRoot '..'))
$docker = 'C:\Program Files\Docker\Docker\resources\bin\docker.exe'
if (-not (Test-Path $docker)) { throw 'Docker Desktop is not installed at the expected path.' }
& $docker info *> $null
if ($LASTEXITCODE -ne 0) { throw 'Start Docker Desktop, wait for the engine, then run this script again.' }
if ([string]::IsNullOrWhiteSpace($ScanToken)) {
  $secure = Read-Host 'Paste the existing Railway media-api MALWARE_SCAN_TOKEN' -AsSecureString
  $ScanToken = [System.Net.NetworkCredential]::new('', $secure).Password
}
if ($ScanToken.Length -lt 16 -or $ScanToken.Contains("`n") -or $ScanToken.Contains("`r")) {
  throw 'Use the existing Railway token (at least 16 characters, on one line).'
}
$env:MALWARE_SCAN_TOKEN = $ScanToken
try {
  & $docker compose -f compose.local-scanner.yml up -d --build
  if ($LASTEXITCODE -ne 0) { throw 'Docker Compose failed. Inspect: docker compose -f compose.local-scanner.yml logs' }
  Write-Host 'ClamAV can take several minutes to load its signatures. Watch: docker compose -f compose.local-scanner.yml logs -f clamav'
  Write-Host 'Find the temporary HTTPS tunnel URL: docker compose -f compose.local-scanner.yml logs tunnel'
  Write-Host 'Send only that URL back for the Railway MALWARE_SCAN_URL change. Never send the scanner token.'
} finally {
  Remove-Item Env:MALWARE_SCAN_TOKEN -ErrorAction SilentlyContinue
  $ScanToken = $null
}
