import { createServer } from 'node:http';
import { Socket } from 'node:net';
import { randomBytes } from 'node:crypto';

const host = process.env.CLAMD_HOST ?? 'clamav';
const port = Number(process.env.CLAMD_PORT ?? '3310');
const listenPort = Number(process.env.PORT ?? '8080');
const maxBytes = Number(process.env.MAX_SCAN_BYTES ?? '524288000');
const token = process.env.SCANNER_TOKEN;
if (!token || token.length < 32) throw new Error('SCANNER_TOKEN must be configured');

async function scanBuffer(body: Buffer): Promise<boolean> {
  return await new Promise((resolve, reject) => {
    const socket = new Socket(); let response = Buffer.alloc(0); let settled = false;
    const finish = (fn: () => void) => { if (settled) return; settled = true; socket.destroy(); fn(); };
    socket.setTimeout(120_000, () => finish(() => reject(new Error('CLAMD_TIMEOUT'))));
    socket.on('error', (error) => finish(() => reject(error)));
    socket.on('data', (chunk) => { response = Buffer.concat([response, chunk]); if (response.includes(Buffer.from([0])) || response.toString('utf8').includes('FOUND') || response.toString('utf8').includes('OK')) { const text = response.toString('utf8').replace(/\0/g, '').trim(); finish(() => resolve(/: OK$/.test(text))); } });
    socket.on('close', () => { if (!settled) { const text = response.toString('utf8').replace(/\0/g, '').trim(); finish(() => resolve(/: OK$/.test(text))); } });
    socket.connect(port, host, () => {
      socket.write(Buffer.from('zINSTREAM\0'));
      let offset = 0;
      while (offset < body.length) { const end = Math.min(offset + 1024 * 1024, body.length); const chunk = body.subarray(offset, end); const size = Buffer.alloc(4); size.writeUInt32BE(chunk.length); socket.write(size); socket.write(chunk); offset = end; }
      socket.write(Buffer.alloc(4));
    });
  });
}

const server = createServer(async (req, res) => {
  if (req.method !== 'POST' || req.url !== '/scan') { res.writeHead(404).end(); return; }
  if (req.headers.authorization !== `Bearer ${token}`) { res.writeHead(401).end(JSON.stringify({ error: 'UNAUTHORIZED' })); return; }
  const chunks: Buffer[] = []; let total = 0;
  try {
    for await (const chunk of req) { const part = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk); total += part.length; if (total > maxBytes) { res.writeHead(413).end(JSON.stringify({ error: 'TOO_LARGE' })); return; } chunks.push(part); }
    const clean = await scanBuffer(Buffer.concat(chunks)); res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' }).end(JSON.stringify({ clean }));
  } catch (error) { res.writeHead(503, { 'content-type': 'application/json' }).end(JSON.stringify({ error: error instanceof Error ? error.message : 'SCANNER_UNAVAILABLE' })); }
});
server.listen(listenPort, '0.0.0.0', () => console.log(`scanner adapter listening on ${listenPort}`));
const shutdown = () => server.close(() => process.exit(0));
process.once('SIGTERM', shutdown); process.once('SIGINT', shutdown);
void randomBytes(1);
