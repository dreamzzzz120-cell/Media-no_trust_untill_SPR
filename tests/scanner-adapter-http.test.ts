import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createServer, type Server } from 'node:http';
import { createServer as createTcpServer, type Server as TcpServer } from 'node:net';
import { spawn, type ChildProcess } from 'node:child_process';
const token = 'scanner-test-secret-123456';
let app: ChildProcess;
let clamd: TcpServer;
let url: string;
const listen = (server: Server): Promise<number> => new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve((server.address() as { port: number }).port)));
beforeAll(async () => {
  const probe = createServer(); const port = await listen(probe); await new Promise<void>((resolve) => probe.close(() => resolve())); url = `http://127.0.0.1:${port}`;
  clamd = createTcpServer((socket) => { let bytes = Buffer.alloc(0); socket.on('data', (chunk) => { bytes = Buffer.concat([bytes, chunk]); if (bytes.includes(Buffer.from('zPING\0'))) { socket.end('PONG\0'); return; } if (bytes.includes(Buffer.from('zINSTREAM\0')) && bytes.subarray(-4).equals(Buffer.alloc(4))) socket.end('stream: OK\0'); }); });
  const clamdPort = await new Promise<number>((resolve) => clamd.listen(0, '127.0.0.1', () => resolve((clamd.address() as { port: number }).port)));
  app = spawn(process.execPath, ['--import', 'tsx', 'src/scanner-adapter.ts'], { cwd: process.cwd(), env: { ...process.env, NODE_ENV: 'production', PORT: String(port), MALWARE_SCAN_TOKEN: token, CLAMD_HOST: '127.0.0.1', CLAMD_PORT: String(clamdPort) }, stdio: 'pipe' });
  for (let i = 0; i < 100; i++) { if (app.exitCode !== null) throw new Error('Scanner adapter exited'); try { if ((await fetch(url + '/health')).ok) return; } catch { /* wait */ } await new Promise((resolve) => setTimeout(resolve, 100)); }
  throw new Error('Scanner adapter did not start');
}, 30000);
afterAll(async () => { app?.kill('SIGTERM'); await new Promise<void>((resolve) => clamd?.close(() => resolve())); });
describe('scanner adapter HTTP boundary', () => {
  it('rejects requests without the shared secret before contacting clamd', async () => {
    const missing = await fetch(url + '/scan', { method: 'POST', body: 'file' });
    const wrong = await fetch(url + '/scan', { method: 'POST', headers: { authorization: 'Bearer wrong' }, body: 'file' });
    expect(missing.status).toBe(401); expect(wrong.status).toBe(401);
  });
  it('streams to clamd and reports ready when clamd responds', async () => {
    const response = await fetch(url + '/scan', { method: 'POST', headers: { authorization: `Bearer ${token}` }, body: 'file' });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ clean: true });
    expect((await fetch(url + '/ready')).status).toBe(200);
  });
});
