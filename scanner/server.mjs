import http from 'node:http';
import net from 'node:net';
import { timingSafeEqual } from 'node:crypto';

const port = Number(process.env.PORT || 8080);
const dailyHost = process.env.CLAMD_HOST;
const mainHost = process.env.CLAMD_MAIN_HOST || null;
const clamdPort = Number(process.env.CLAMD_PORT || 3310);
const mainClamdPort = Number(process.env.CLAMD_MAIN_PORT || clamdPort);
const token = process.env.MALWARE_SCAN_TOKEN;
const maxBytes = Number(process.env.MAX_SCAN_BYTES || 268435456);
const maxSignatureAgeMs = Number(process.env.MAX_SIGNATURE_AGE_MS || 172800000);
const constrainedSignatures = process.env.CLAMAV_CONSTRAINED_SIGNATURES !== 'false';

if (!dailyHost || !token || token.length < 32 || !Number.isInteger(port) || !Number.isInteger(clamdPort) || !Number.isInteger(mainClamdPort) || !Number.isSafeInteger(maxBytes) || maxBytes < 1) {
  throw new Error('CLAMD_HOST, strong MALWARE_SCAN_TOKEN, and valid ports/limit are required');
}

const shards = [
  { name: 'daily', host: dailyHost, port: clamdPort },
  ...(mainHost ? [{ name: 'main', host: mainHost, port: mainClamdPort }] : []),
];
const splitFullCoverage = shards.length === 2;

const equal = (a, b) => {
  const aa = Buffer.from(a || '');
  const bb = Buffer.from(b || '');
  return aa.length === bb.length && timingSafeEqual(aa, bb);
};

function command(host, targetPort, payload) {
  return new Promise((resolve, reject) => {
    const socket = net.connect({ host, port: targetPort });
    socket.setTimeout(120000);
    let response = '';
    let finished = false;
    const fail = (err) => { if (!finished) { finished = true; socket.destroy(); reject(err); } };
    socket.on('error', fail);
    socket.on('timeout', () => fail(new Error('CLAMD_TIMEOUT')));
    socket.on('connect', () => socket.write(payload));
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

async function signatureFresh(shard) {
  try {
    const version = await command(shard.host, shard.port, 'zVERSION\0');
    const parts = version.split('/');
    if (parts.length < 3) return false;
    const signatureVersion = Number(parts[1]);
    const signatureDate = Date.parse(parts.slice(2).join('/'));
    if (!Number.isInteger(signatureVersion) || signatureVersion < 1 || !Number.isFinite(signatureDate)) return false;
    const age = Date.now() - signatureDate;
    return age >= 0 && age <= maxSignatureAgeMs;
  } catch { return false; }
}

const write = (socket, data) => new Promise((resolve, reject) => {
  if (socket.destroyed) return reject(new Error('CLAMD_SOCKET_CLOSED'));
  const onError = (err) => { cleanup(); reject(err); };
  const cleanup = () => socket.off('error', onError);
  socket.once('error', onError);
  if (socket.write(data)) { cleanup(); resolve(); }
  else socket.once('drain', () => { cleanup(); resolve(); });
});

function openScanSession(shard) {
  const socket = net.connect({ host: shard.host, port: shard.port });
  socket.setTimeout(120000);
  let response = '';
  let settled = false;
  let readyResolve, readyReject, resultResolve, resultReject;
  const ready = new Promise((resolve, reject) => { readyResolve = resolve; readyReject = reject; });
  const result = new Promise((resolve, reject) => { resultResolve = resolve; resultReject = reject; });
  const fail = (err) => {
    if (!settled) {
      settled = true;
      readyReject(err);
      resultReject(err);
      socket.destroy();
    }
  };
  socket.on('error', fail);
  socket.on('timeout', () => fail(new Error('CLAMD_TIMEOUT')));
  socket.on('connect', () => readyResolve());
  socket.on('data', (data) => {
    response += data.toString('utf8');
    if (response.length > 4096) return fail(new Error('CLAMD_RESPONSE_TOO_LARGE'));
    if (response.includes('\n') || response.includes('\0')) {
      if (!settled) {
        settled = true;
        resultResolve(response.split(String.fromCharCode(0)).join('').trim());
        socket.end();
      }
    }
  });
  socket.on('end', () => { if (!settled) fail(new Error('CLAMD_EMPTY_RESPONSE')); });
  return { socket, ready, result };
}

async function scanAll(stream) {
  const sessions = shards.map(openScanSession);
  try {
    await Promise.all(sessions.map((s) => s.ready));
    await Promise.all(sessions.map((s) => write(s.socket, Buffer.from('zINSTREAM\0'))));
    let total = 0;
    for await (const raw of stream) {
      const chunk = Buffer.isBuffer(raw) ? raw : Buffer.from(raw);
      total += chunk.length;
      if (total > maxBytes) throw new Error('UPLOAD_TOO_LARGE');
      const frame = Buffer.allocUnsafe(4);
      frame.writeUInt32BE(chunk.length);
      for (const s of sessions) {
        await write(s.socket, frame);
        await write(s.socket, chunk);
      }
    }
    const end = Buffer.alloc(4);
    await Promise.all(sessions.map((s) => write(s.socket, end)));
    return await Promise.all(sessions.map((s) => s.result));
  } catch (err) {
    for (const s of sessions) s.socket.destroy();
    throw err;
  }
}

const send = (res, status, body) => {
  res.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store' });
  res.end(JSON.stringify(body));
};

http.createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/health') {
    return send(res, 200, { status: 'ok', service: 'malware-adapter' });
  }
  if (req.method === 'GET' && req.url === '/ready') {
    if (!equal(req.headers.authorization, 'Bearer ' + token)) return send(res, 401, { error: 'UNAUTHORIZED' });
    try {
      const pongs = await Promise.all(shards.map((s) => command(s.host, s.port, 'zPING\0')));
      const freshness = await Promise.all(shards.map(signatureFresh));
      const daemon = pongs.every((x) => x === 'PONG');
      const signaturesFresh = freshness.every(Boolean);
      const fullCoverage = splitFullCoverage || !constrainedSignatures;
      const ready = daemon && signaturesFresh && fullCoverage;
      return send(res, ready ? 200 : 503, {
        ready,
        daemon,
        signaturesFresh,
        signatureCoverage: fullCoverage ? 'FULL' : 'CONSTRAINED',
        signatureShards: shards.length,
      });
    } catch { return send(res, 503, { ready: false }); }
  }
  if (req.method !== 'POST' || req.url !== '/scan') return send(res, 404, { error: 'NOT_FOUND' });
  if (!equal(req.headers.authorization, 'Bearer ' + token)) return send(res, 401, { error: 'UNAUTHORIZED' });

  const freshness = await Promise.all(shards.map(signatureFresh));
  if (!freshness.every(Boolean)) return send(res, 503, { error: 'SIGNATURES_STALE_OR_UNKNOWN' });
  if (!(splitFullCoverage || !constrainedSignatures)) return send(res, 503, { error: 'SIGNATURE_COVERAGE_CONSTRAINED' });

  const length = Number(req.headers['content-length']);
  if (!Number.isSafeInteger(length) || length < 1 || length > maxBytes) return send(res, 413, { error: 'INVALID_SIZE' });

  try {
    const results = await scanAll(req);
    if (results.some((x) => /FOUND\s*$/.test(x))) return send(res, 200, { clean: false });
    if (results.length === shards.length && results.every((x) => /OK\s*$/.test(x))) return send(res, 200, { clean: true });
    return send(res, 503, { error: 'SCAN_INDETERMINATE' });
  } catch {
    return send(res, 503, { error: 'SCAN_UNAVAILABLE' });
  }
}).listen(port, '0.0.0.0');
