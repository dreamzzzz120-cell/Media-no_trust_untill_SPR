import Fastify from 'fastify';
import helmet from '@fastify/helmet';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import fastifyStatic from '@fastify/static';
import { timingSafeEqual } from 'node:crypto';
import { loadConfig } from './config.js';
import { createStore } from './db.js';
import { verifyMedia } from './verification/engine.js';
import { deleteStoredMedia, storeUpload } from './storage.js';
import { scanForMalware } from './security/malware.js';
import { resolve } from 'node:path';

const config = loadConfig();
const app = Fastify({
  logger: { level: config.LOG_LEVEL, redact: ['req.headers.authorization', 'req.headers.x-api-key', 'headers.x-api-key'] },
  bodyLimit: config.MAX_UPLOAD_BYTES,
  requestTimeout: config.REQUEST_TIMEOUT_MS,
  trustProxy: config.TRUST_PROXY,
});
const store = createStore(config.DATABASE_URL);

await app.register(helmet, { global: true });
await app.register(rateLimit, { max: config.RATE_LIMIT_MAX, timeWindow: config.RATE_LIMIT_WINDOW_MS });
await app.register(multipart, { limits: { fileSize: config.MAX_UPLOAD_BYTES, files: 1, fields: 8 } });
await app.register(fastifyStatic, { root: resolve('public'), prefix: '/' });
await app.register(swagger, { openapi: { info: { title: 'SPR Media Passport API', version: '0.1.0' }, servers: [{ url: '/' }] } });
await app.register(swaggerUi, { routePrefix: '/docs' });

const publicPath = (url: string) => url === '/health' || url === '/ready' || url === '/' || url.startsWith('/public/') || url.startsWith('/passport/') || url.startsWith('/app.') || url.startsWith('/styles.') || url.startsWith('/passport.');

app.addHook('onRequest', async (req, reply) => {
  if (publicPath(req.url)) return;
  if (!config.REQUIRE_API_KEY) return;
  const supplied = req.headers['x-api-key'];
  const expected = config.API_KEY;
  if (typeof supplied !== 'string' || !expected) return reply.code(401).send({ error: 'UNAUTHORIZED' });
  const suppliedBuffer = Buffer.from(supplied);
  const expectedBuffer = Buffer.from(expected);
  if (suppliedBuffer.length !== expectedBuffer.length || !timingSafeEqual(suppliedBuffer, expectedBuffer)) return reply.code(401).send({ error: 'UNAUTHORIZED' });
});

app.get('/health', async () => ({ status: 'ok', service: 'spr-media-passport' }));
app.get('/ready', async (_req, reply) => {
  const databaseOk = await store.ready();
  if (!databaseOk) return reply.code(503).send({ status: 'not_ready', database: { ok: false } });
  return { status: 'ready', database: { ok: true } };
});

app.post('/v1/media/verify', async (req, reply) => {
  const part = await req.file({ limits: { fileSize: config.MAX_UPLOAD_BYTES } });
  if (!part) return reply.code(400).send({ error: 'FILE_REQUIRED' });
  const declared = (part.mimetype || 'application/octet-stream').split(';')[0].toLowerCase();
  const upload = await storeUpload(part.file, part.filename, declared, config.UPLOAD_DIR, config.MAX_UPLOAD_BYTES);
  try {
    if (!config.MALWARE_SCAN_URL || !config.MALWARE_SCAN_TOKEN) throw new Error('MALWARE_SCANNER_NOT_CONFIGURED');
    await scanForMalware(upload.path, upload.sizeBytes, upload.mime, config.MALWARE_SCAN_URL, config.MALWARE_SCAN_TOKEN, config.MALWARE_SCAN_TIMEOUT_MS);
    const asset = { id: upload.id, sha256: upload.sha256, mime: upload.mime, kind: upload.kind, sizeBytes: upload.sizeBytes, originalFilename: upload.originalFilename, createdAt: new Date().toISOString() } as const;
    const record = await verifyMedia(asset, upload.path, { verifyTrust: config.C2PA_VERIFY_TRUST, requireVerification: true });
    await store.save(record);
    return reply.code(201).send({ passportId: asset.id, ...record, publicUrl: `/public/${asset.id}`, verificationUrl: `/passport/${asset.id}` });
  } catch (error) {
    await deleteStoredMedia(upload.path, config.UPLOAD_DIR).catch((cleanupError) => req.log.error({ err: cleanupError, assetId: upload.id }, 'failed to remove quarantined media'));
    req.log.error({ err: error, assetId: upload.id }, 'verification failed');
    const malware = error instanceof Error && error.message === 'MALWARE_DETECTED';
    return reply.code(malware ? 422 : 503).send({ error: malware ? 'MALWARE_DETECTED' : 'VERIFICATION_UNAVAILABLE' });
  }
});

app.get('/public/:id', async (req, reply) => {
  const { id } = req.params as { id: string };
  if (!/^[A-Za-z0-9_-]{10,40}$/.test(id)) return reply.code(400).send({ error: 'INVALID_ID' });
  const record = await store.get(id);
  if (!record) return reply.code(404).send({ error: 'NOT_FOUND' });
  return { passportId: record.asset.id, asset: { sha256: record.asset.sha256, mime: record.asset.mime, kind: record.asset.kind, sizeBytes: record.asset.sizeBytes }, verdict: record.verdict, distribution: record.distribution, provenance: { status: record.provenance.status, embedded: record.provenance.embedded, trusted: record.provenance.trusted }, evidence: record.observations, limitations: record.limitations };
});

app.get('/passport/:id', async (req, reply) => {
  const { id } = req.params as { id: string };
  if (!/^[A-Za-z0-9_-]{10,40}$/.test(id)) return reply.code(400).type('text/plain').send('Invalid passport ID');
  const record = await store.get(id);
  if (!record) return reply.code(404).type('text/plain').send('Passport not found');
  const esc = (v: unknown) => String(v).replace(/[&<>\"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;' }[c] ?? c));
  const evidence = record.observations.map((o) => `<li><strong>${esc(o.signal)}</strong>: ${esc(o.result)} — ${esc(o.details ?? '')}</li>`).join('');
  const limitations = record.limitations.map((x) => `<li>${esc(x)}</li>`).join('');
  return reply.type('text/html').send(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><meta name="referrer" content="no-referrer"><link rel="stylesheet" href="/passport.css"><title>SPR Media Passport ${esc(id)}</title></head><body><main><h1>SPR Media Passport</h1><section><h2>${esc(record.verdict)}</h2><p>Distribution policy: <strong>${esc(record.distribution)}</strong></p><p>Provenance: ${esc(record.provenance.status)}</p><p>SHA-256: <code>${esc(record.asset.sha256)}</code></p></section><section><h2>Evidence</h2><ul>${evidence || '<li>No additional evidence.</li>'}</ul></section><section><h2>Limitations</h2><ul>${limitations}</ul></section></main></body></html>`);
});

app.setErrorHandler((error, req, reply) => {
  if ((error as { code?: string }).code === 'FST_REQ_FILE_TOO_LARGE' || error.message === 'UPLOAD_TOO_LARGE') return reply.code(413).send({ error: 'UPLOAD_TOO_LARGE' });
  if (error.message === 'UNSUPPORTED_MEDIA_TYPE') return reply.code(415).send({ error: error.message });
  if (error.message === 'MIME_MISMATCH') return reply.code(400).send({ error: error.message });
  req.log.error({ err: error }, 'request failed');
  return reply.code(500).send({ error: 'INTERNAL_ERROR' });
});

const shutdown = async (signal: string) => {
  app.log.info({ signal }, 'shutting down');
  await app.close();
  await store.close();
  process.exit(0);
};
process.once('SIGTERM', () => void shutdown('SIGTERM'));
process.once('SIGINT', () => void shutdown('SIGINT'));
await app.listen({ host: config.HOST, port: config.PORT });
