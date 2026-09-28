import { createServer, type IncomingMessage } from 'node:http';
import { Socket } from 'node:net';
import { timingSafeEqual } from 'node:crypto';
import { once } from 'node:events';
const host = process.env.CLAMD_HOST ?? 'clamav';
const port = Number(process.env.CLAMD_PORT ?? '3310');
const listenPort = Number(process.env.PORT ?? '8080');
const maxBytes = Number(process.env.MAX_SCAN_BYTES ?? '524288000');
const scanToken = process.env.MALWARE_SCAN_TOKEN;
if (process.env.NODE_ENV === 'production' && (!scanToken || scanToken.length < 16)) throw new Error('MALWARE_SCAN_TOKEN must contain at least 16 characters');
if (!Number.isSafeInteger(maxBytes) || maxBytes < 1 || maxBytes > 5_000_000_000) throw new Error('Invalid MAX_SCAN_BYTES');
function authorized(header: string | undefined): boolean {
  if (!scanToken) return process.env.NODE_ENV !== 'production';
  const supplied = Buffer.from(header ?? ''); const expected = Buffer.from(`Bearer ${scanToken}`);
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}
async function scanStream(req: IncomingMessage): Promise<boolean> {
  const socket = new Socket(); let response = ''; let settled = false;
  const result = new Promise<boolean>((resolve, reject) => {
    const finish = (error?: Error) => {
      if (settled) return; settled = true; socket.destroy();
      if (error) reject(error);
      else if (/: OK$/.test(response)) resolve(true);
      else if (/: .+ FOUND$/.test(response)) resolve(false);
      else reject(new Error('CLAMD_INVALID_RESPONSE'));
    };
    socket.setTimeout(120_000, () => finish(new Error('CLAMD_TIMEOUT')));
    socket.on('error', (error) => finish(error));
    socket.on('data', (chunk: Buffer) => {
      response += chunk.toString('utf8').replace(/\0/g, '').trim();
      if (response.length > 4096) finish(new Error('CLAMD_RESPONSE_TOO_LARGE'));
      else if (response.endsWith(' FOUND') || response.endsWith(': OK')) finish();
    });
    socket.on('close', () => finish(new Error('CLAMD_CONNECTION_CLOSED')));
  });
  let total = 0;
  try {
    await new Promise<void>((resolve, reject) => { socket.connect(port, host, resolve); socket.once('error', reject); });
    socket.write('zINSTREAM\0');
    for await (const part of req) {
      const chunk = Buffer.isBuffer(part) ? part : Buffer.from(part); total += chunk.length;
      if (total > maxBytes) throw new Error('SCAN_TOO_LARGE');
      const size = Buffer.alloc(4); size.writeUInt32BE(chunk.length);
      if (!socket.write(size)) await once(socket, 'drain');
      if (!socket.write(chunk)) await once(socket, 'drain');
    }
    socket.write(Buffer.alloc(4));
    return await result;
  } catch (error) {
    socket.destroy(); void result.catch(() => undefined);
    throw error;
  }
}
async function clamdReady(): Promise<boolean> {
  return await new Promise((resolve) => {
    const socket = new Socket(); let finished = false;
    const done = (ready: boolean) => { if (finished) return; finished = true; socket.destroy(); resolve(ready); };
    socket.setTimeout(2000, () => done(false));
    socket.on('error', () => done(false));
    socket.on('data', (chunk) => done(chunk.toString('utf8').includes('PONG')));
    socket.on('close', () => done(false));
    socket.connect(port, host, () => socket.write('zPING\0'));
  });
}
const server = createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/health') { res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({ status: 'ok' })); return; }
  if (req.method === 'GET' && req.url === '/ready') { const ready = await clamdReady(); res.writeHead(ready ? 200 : 503, { 'content-type': 'application/json' }).end(JSON.stringify({ status: ready ? 'ready' : 'not_ready', clamd: { ok: ready } })); return; }
  if (req.method !== 'POST' || req.url !== '/scan') { res.writeHead(404).end(); return; }
  if (!authorized(req.headers.authorization)) { res.writeHead(401, { 'content-type': 'application/json' }).end(JSON.stringify({ error: 'UNAUTHORIZED' })); req.resume(); return; }
  try { const clean = await scanStream(req); res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' }).end(JSON.stringify({ clean })); }
  catch (error) { const tooLarge = error instanceof Error && error.message === 'SCAN_TOO_LARGE'; res.writeHead(tooLarge ? 413 : 503, { 'content-type': 'application/json' }).end(JSON.stringify({ error: tooLarge ? 'TOO_LARGE' : 'SCANNER_UNAVAILABLE' })); }
});
server.listen(listenPort, '0.0.0.0', () => console.log(`scanner adapter listening on ${listenPort}`));
const shutdown = () => server.close(() => process.exit(0)); process.once('SIGTERM', shutdown); process.once('SIGINT', shutdown);
