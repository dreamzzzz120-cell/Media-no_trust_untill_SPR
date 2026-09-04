import Fastify from 'fastify';
import helmet from '@fastify/helmet';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import fastifyStatic from '@fastify/static';
import { loadConfig } from './config.js';
import { createStore } from './db.js';
import { verifyMedia } from './verification/engine.js';
import { storeUpload } from './storage.js';
import { resolve } from 'node:path';

const config = loadConfig();
const app = Fastify({
  logger: { level: config.LOG_LEVEL, redact: ['req.headers.authorization', 'req.headers.x-api-key'] },
  bodyLimit: config.MAX_UPLOAD_BYTES,
  trustProxy: false,
});
const store = createStore(process.env.DATABASE_URL);

await app.register(helmet, { global: true });
await app.register(rateLimit, { max: config.RATE_LIMIT_MAX, timeWindow: config.RATE_LIMIT_WINDOW_MS });
await app.register(multipart, { limits: { fileSize: config.MAX_UPLOAD_BYTES, files: 1, fields: 8 } });
await app.register(fastifyStatic, { root: resolve('public'), prefix: '/' });
await app.register(swagger, { openapi: { info: { title: 'SPR Media Passport API', version: '0.1.0' }, servers: [{ url: '/' }] } });
await app.register(swaggerUi, { routePrefix: '/docs' });

app.addHook('onRequest', async (req, reply) => {
  if (req.url === '/health' || req.url === '/ready' || req.url.startsWith('/public/') || req.url === '/') return;
  if (!config.REQUIRE_API_KEY) return;
  const supplied = req.headers['x-api-key'];
  if (!supplied || supplied !== config.API_KEY) return reply.code(401).send({ error: 'UNAUTHORIZED' });
});

app.get('/health', async () => ({ status: 'ok', service: 'spr-media-passport' }));
app.get('/ready', async (_req, reply) => {
  if (process.env.NODE_ENV === 'production' && !process.env.DATABASE_URL) return reply.code(503).send({ status: 'not_ready', reason: 'DATABASE_URL_REQUIRED' });
  return { status: 'ready' };
});

app.post('/v1/media/verify', async (req, reply) => {
  const part = await req.file({ limits: { fileSize: config.MAX_UPLOAD_BYTES } });
  if (!part) return reply.code(400).send({ error: 'FILE_REQUIRED' });
  const declared = (part.mimetype || 'application/octet-stream').split(';')[0].toLowerCase();
  const upload = await storeUpload(part.file, part.filename, declared, config.UPLOAD_DIR, config.MAX_UPLOAD_BYTES);
  const asset = { id: upload.id, sha256: upload.sha256, mime: upload.mime, kind: upload.kind, sizeBytes: upload.sizeBytes, originalFilename: upload.originalFilename, createdAt: new Date().toISOString() } as const;
  const record = await verifyMedia(asset, upload.path, { verifyTrust: config.C2PA_VERIFY_TRUST, requireVerification: true });
  await store.save(record);
  return reply.code(201).send({ passportId: asset.id, ...record, publicUrl: `/public/${asset.id}` });
});

app.get('/public/:id', async (req, reply) => {
  const { id } = req.params as { id: string };
  if (!/^[A-Za-z0-9_-]{10,40}$/.test(id)) return reply.code(400).send({ error: 'INVALID_ID' });
  const record = await store.get(id);
  if (!record) return reply.code(404).send({ error: 'NOT_FOUND' });
  return { passportId: record.asset.id, asset: { sha256: record.asset.sha256, mime: record.asset.mime, kind: record.asset.kind, sizeBytes: record.asset.sizeBytes }, verdict: record.verdict, distribution: record.distribution, provenance: { status: record.provenance.status, embedded: record.provenance.embedded, trusted: record.provenance.trusted }, evidence: record.observations, limitations: record.limitations };
});

app.setErrorHandler((error, req, reply) => {
  req.log.error({ err: error }, 'request failed');
  if ((error as { code?: string }).code === 'FST_REQ_FILE_TOO_LARGE' || error.message === 'UPLOAD_TOO_LARGE') return reply.code(413).send({ error: 'UPLOAD_TOO_LARGE' });
  if (error.message === 'UNSUPPORTED_MEDIA_TYPE') return reply.code(415).send({ error: error.message });
  if (error.message === 'MIME_MISMATCH') return reply.code(400).send({ error: error.message });
  return reply.code(500).send({ error: 'INTERNAL_ERROR' });
});

const shutdown = async (signal: string) => { app.log.info({ signal }, 'shutting down'); await app.close(); process.exit(0); };
process.once('SIGTERM', () => void shutdown('SIGTERM'));
process.once('SIGINT', () => void shutdown('SIGINT'));
await app.listen({ host: config.HOST, port: config.PORT });
