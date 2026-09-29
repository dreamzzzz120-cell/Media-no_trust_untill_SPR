# Local scanner bridge for the 1 GB Railway limit

This runs the existing authenticated scanner adapter and ClamAV with the standard signatures on a computer with at least 3 GB of free memory. The tunnel makes **only the adapter** reachable over HTTPS; clamd has no published port. The adapter still rejects scans without the shared bearer token. The Media API continues to fail closed whenever the local scanner is unreachable.

## Start on Windows

1. Install and start Docker Desktop. Open a new PowerShell window after installation.
2. Clone this repository and change into its directory, or pull the latest `main` in an existing checkout.
3. In Railway, copy the existing `media-api` service's `MALWARE_SCAN_TOKEN` value. Do not post it in chat or commit it.
4. Run `powershell -ExecutionPolicy Bypass -File .\scripts\start-local-scanner.ps1`. The prompt hides the token while you paste it. The script uses the installed Docker executable directly, even when the current PowerShell `PATH` has not refreshed.
5. Run `& 'C:\Program Files\Docker\Docker\resources\bin\docker.exe' compose -f compose.local-scanner.yml logs tunnel` and copy the `https://...trycloudflare.com` URL. It may take a minute to appear.
6. Check readiness from PowerShell: `Invoke-WebRequest '<tunnel URL>/ready'`. Expect HTTP 200 and `"clamd":{"ok":true}`. Until then, do not change the Railway URL.
7. Set the Railway `media-api` service variable `MALWARE_SCAN_URL` to `<tunnel URL>/scan` and `MALWARE_SCAN_ALLOW_PRIVATE_HTTP` to `false`. Keep the existing `MALWARE_SCAN_TOKEN`. Redeploy the API if Railway does not redeploy automatically.
8. Confirm the public Media API `/ready` returns 200. An authorized test upload should then produce a real scan result; an unreachable scanner must return 503 without issuing a Passport.

The quick tunnel is temporary and its URL changes when the tunnel restarts. Keep the computer running and awake. For a durable installation, replace the quick tunnel with a named tunnel and controlled hostname, then repeat the same readiness checks. Never expose port 3310 or remove the adapter token. The public adapter readiness route says only whether clamd responds to PING; it does not attest to signature freshness or a completed sample scan.

Stop with `& 'C:\Program Files\Docker\Docker\resources\bin\docker.exe' compose -f compose.local-scanner.yml down`. The signature database remains in the Docker volume for the next start. After stopping, the Media API must return 503 on `/ready` and fail closed on uploads.
