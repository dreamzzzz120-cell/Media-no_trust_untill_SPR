import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createServer, type Server } from 'node:http';
import { spawn, type ChildProcess } from 'node:child_process';
const token = 'scanner-test-secret-123456';
let app: ChildProcess;
let url: string;
const listen = (server: Server): Promise<number> => new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve((server.address() as { port: number }).port)));
beforeAll(async () => {
  const probe = createServer(); const port = await listen(probe); await new Promise<void>((resolve) => probe.close(() => resolve())); url = `http://127.0.0.1:${port}`;
  app = spawn(process.execPath, ['--import', 'tsx', 'src/scanner-adapter.ts'], { cwd: process.cwd(), env: { ...process.env, NODE_ENV: 'production', PORT: String(port), MALWARE_SCAN_TOKEN: token, CLAMD_PORT: '1' }, stdio: 'pipe' });
  for (let i = 0; i < 100; i++) { if (app.exitCode !== null) throw new Error('Scanner adapter exited'); try { if ((await fetch(url + '/health')).ok) return; } catch { /* wait */ } await new Promise((resolve) => setTimeout(resolve, 100)); }
  throw new Error('Scanner adapter did not start');
}, 30000);
afterAll(() => { app?.kill('SIGTERM'); });
describe('scanner adapter HTTP boundary', () => {
  it('rejects requests without the shared secret before contacting clamd', async () => {
    const missing = await fetch(url + '/scan', { method: 'POST', body: 'file' });
    const wrong = await fetch(url + '/scan', { method: 'POST', headers: { authorization: 'Bearer wrong' }, body: 'file' });
    expect(missing.status).toBe(401); expect(wrong.status).toBe(401);
  });
  it('accepts the secret and fails closed when clamd is unavailable', async () => {
    const response = await fetch(url + '/scan', { method: 'POST', headers: { authorization: `Bearer ${token}` }, body: 'file' });
    expect(response.status).toBe(503);
    expect((await fetch(url + '/ready')).status).toBe(503);
  });
});
