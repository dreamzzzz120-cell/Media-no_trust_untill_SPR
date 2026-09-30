import http from 'node:http';
import net from 'node:net';
import { timingSafeEqual } from 'node:crypto';

const port = Number(process.env.PORT || 8080);
const host = process.env.CLAMD_HOST;
const clamdPort = Number(process.env.CLAMD_PORT || 3310);
const token = process.env.MALWARE_SCAN_TOKEN;
const maxBytes = Number(process.env.MAX_SCAN_BYTES || 524288000);
if (!host || !token || token.length < 32 || !Number.isInteger(port) || !Number.isInteger(clamdPort) || !Number.isSafeInteger(maxBytes) || maxBytes < 1) {
  throw new Error('CLAMD_HOST, strong MALWARE_SCAN_TOKEN, and valid ports/limit are required');
}
const equal = (a, b) => {
  const aa = Buffer.from(a || '');
  const bb = Buffer.from(b || '');
  return aa.length === bb.length && timingSafeEqual(aa, bb);
};
function clamd(command, stream) {
  return new Promise((resolve, reject) => {
    const socket = net.connect({ host, port: clamdPort });
    socket.setTimeout(120000);
    let response = '';
    let finished = false;
    const fail = (err) => { if (!finished) { finished = true; socket.destroy(); reject(err); } };
    socket.on('error', fail);
    socket.on('timeout', () => fail(new Error('CLAMD_TIMEOUT')));
    socket.on('connect', async () => {
      try {
        socket.write(command);
        if (stream) {
          let total = 0;
          for await (const chunk of stream) {
            total += chunk.length;
            if (total > maxBytes) throw new Error('UPLOAD_TOO_LARGE');
            const frame = Buffer.allocUnsafe(4);
            frame.writeUInt32BE(chunk.length);
            if (!socket.write(frame)) await new Promise((ok) => socket.once('drain', ok));
            if (!socket.write(chunk)) await new Promise((ok) => socket.once('drain', ok));
          }
          socket.write(Buffer.alloc(4));
        }
      } catch (err) { fail(err); }
    });
    socket.on('data', (data) => {
      response += data.toString('utf8');
      if (response.length > 4096) return fail(new Error('CLAMD_RESPONSE_TOO_LARGE'));
      if (response.includes('\n') || response.includes('\0')) {
        if (!finished) { finished = true; socket.end(); resolve(response.split(String.fromCharCode(0)).join('').trim()); }
      }
    });
    socket.on('end', () => { if (!finished) fail(new Error('CLAMD_EMPTY_RESPONSE')); });
  });
}
const send = (res, status, body) => {
  res.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store' });
  res.end(JSON.stringify(body));
};
http.createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/health') {
    try {
      const pong = await clamd('zPING\0');
      return send(res, pong === 'PONG' ? 200 : 503, { ready: pong === 'PONG' });
    } catch {
      return send(res, 503, { ready: false });
    }
  }
  if (req.method === 'GET' && req.url === '/ready') {
    if (!equal(req.headers.authorization, 'Bearer ' + token)) return send(res, 401, { error: 'UNAUTHORIZED' });
    try { const pong = await clamd('zPING\0'); return send(res, pong === 'PONG' ? 200 : 503, { ready: pong === 'PONG' }); }
    catch { return send(res, 503, { ready: false }); }
  }
  if (req.method !== 'POST' || req.url !== '/scan') return send(res, 404, { error: 'NOT_FOUND' });
  if (!equal(req.headers.authorization, 'Bearer ' + token)) return send(res, 401, { error: 'UNAUTHORIZED' });
  const length = Number(req.headers['content-length']);
  if (!Number.isSafeInteger(length) || length < 1 || length > maxBytes) return send(res, 413, { error: 'INVALID_SIZE' });
  try {
    const result = await clamd('zINSTREAM\0', req);
    if (/FOUND\s*$/.test(result)) return send(res, 200, { clean: false });
    if (/OK\s*$/.test(result)) return send(res, 200, { clean: true });
    return send(res, 503, { error: 'SCAN_INDETERMINATE' });
  } catch {
    return send(res, 503, { error: 'SCAN_UNAVAILABLE' });
  }
}).listen(port, '0.0.0.0');
