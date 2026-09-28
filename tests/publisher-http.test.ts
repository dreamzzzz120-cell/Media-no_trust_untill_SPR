import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createServer, type Server } from 'node:http';
import { spawn, type ChildProcess } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const bootstrap = 'a'.repeat(40);
let scanner: Server;
let app: ChildProcess;
let root: string;
let url: string;
let keyA: string;
let keyB: string;
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+X2ioAAAAASUVORK5CYII=', 'base64');
const listen = (server: Server): Promise<number> => new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve((server.address() as { port: number }).port)));
async function json(path: string, key: string, options?: RequestInit) {
  const res = await fetch(url + path, { ...options, headers: { 'x-api-key': key, ...options?.headers } });
  return { status: res.status, body: await res.json() as Record<string, unknown> };
}
beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), 'media-publisher-test-'));
  scanner = createServer((_req, res) => { res.setHeader('content-type', 'application/json'); res.end('{"clean":true}'); });
  const scannerPort = await listen(scanner);
  const probe = createServer(); const appPort = await listen(probe); await new Promise<void>((resolve) => probe.close(() => resolve()));
  url = `http://127.0.0.1:${appPort}`;
  app = spawn(process.execPath, ['--import', 'tsx', 'src/server.ts'], { cwd: process.cwd(), env: { ...process.env, NODE_ENV: 'test', PORT: String(appPort), HOST: '127.0.0.1', API_KEY: bootstrap, REQUIRE_API_KEY: 'true', UPLOAD_DIR: root, MALWARE_SCAN_URL: `http://127.0.0.1:${scannerPort}`, MALWARE_SCAN_TOKEN: 'test-scanner-token-1234', C2PA_VERIFY_TRUST: 'false' }, stdio: 'pipe' });
  for (let i = 0; i < 100; i++) { if (app.exitCode !== null) throw new Error('Media server exited during startup'); try { if ((await fetch(url + '/health')).ok) break; } catch { /* waiting for startup */ } await new Promise((resolve) => setTimeout(resolve, 100)); if (i === 99) throw new Error('Media server did not start'); }
  const a = await json('/v1/api-keys', bootstrap, { method: 'POST', body: JSON.stringify({ organizationId: 'publisher-a', name: 'publisher a', role: 'organization_admin' }), headers: { 'content-type': 'application/json' } });
  const b = await json('/v1/api-keys', bootstrap, { method: 'POST', body: JSON.stringify({ organizationId: 'publisher-b', name: 'publisher b', role: 'analyst' }), headers: { 'content-type': 'application/json' } });
  expect(a.status).toBe(201); expect(b.status).toBe(201);
  keyA = (a.body.key as string); keyB = (b.body.key as string);
}, 30000);
afterAll(async () => { app?.kill('SIGTERM'); await new Promise<void>((resolve) => scanner?.close(() => resolve())); if (root) await rm(root, { recursive: true, force: true }); });
describe('publisher HTTP flow', () => {
  it('rejects organization admin privilege escalation', async () => {
    const r = await json('/v1/api-keys', keyA, { method: 'POST', body: JSON.stringify({ organizationId: 'publisher-a', name: 'elevated', role: 'super_admin' }), headers: { 'content-type': 'application/json' } });
    expect(r.status).toBe(403);
  });
  it('scans, persists, returns evidence, and restricts private retrieval', async () => {
    const form = new FormData(); form.append('file', new Blob([png], { type: 'image/png' }), 'sample.png');
    const result = await json('/v1/publisher/verify', keyA, { method: 'POST', body: form });
    expect(result.status).toBe(201); expect(result.body.passportId).toBeTruthy();
    expect(result.body.assetSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(Array.isArray(result.body.evidence)).toBe(true);
    const id = result.body.passportId;
    expect((await json(`/v1/media/${id}`, keyA)).status).toBe(200);
    expect((await json(`/v1/media/${id}`, keyB)).status).toBe(404);
    expect((await json(`/v1/media/${id}/evidence`, keyB)).status).toBe(404);
    expect((await json('/v1/recommendation/evaluate', keyB, { method: 'POST', body: JSON.stringify({ passportId: id }), headers: { 'content-type': 'application/json' } })).status).toBe(404);
  });
});
