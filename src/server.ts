import Fastify from 'fastify';
import helmet from '@fastify/helmet';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import fastifyStatic from '@fastify/static';
import { createHash, timingSafeEqual } from 'node:crypto';
import { resolve } from 'node:path';
import { z } from 'zod';
import { loadConfig } from './config.js';
import { createStore, type ApiIdentity, type ApiRole } from './db.js';
import { verifyMedia } from './verification/engine.js';
import { deleteStoredMedia, storeUpload } from './storage.js';
import { scanForMalware } from './security/malware.js';

const config = loadConfig();
const app = Fastify({ logger: { level: config.LOG_LEVEL, redact: ['req.headers.authorization', 'req.headers.x-api-key', 'headers.x-api-key'] }, bodyLimit: config.MAX_UPLOAD_BYTES, requestTimeout: config.REQUEST_TIMEOUT_MS, trustProxy: config.TRUST_PROXY });
const store = createStore(config.DATABASE_URL);
const idPattern = /^[A-Za-z0-9_-]{10,40}$/;
const roles: ApiRole[] = ['viewer','creator','reviewer','moderator','analyst','organization_admin','platform_admin','super_admin'];
const aiStatuses = ['NONE','AI_ASSISTED','AI_EDITED','AI_GENERATED','AI_SYNTHETIC_PERSON','AI_SYNTHETIC_VOICE','AI_DEEPFAKE','UNKNOWN'] as const;
await app.register(helmet, { global: true });
await app.register(rateLimit, { max: config.RATE_LIMIT_MAX, timeWindow: config.RATE_LIMIT_WINDOW_MS });
await app.register(multipart, { limits: { fileSize: config.MAX_UPLOAD_BYTES, files: 1, fields: 8 } });
await app.register(fastifyStatic, { root: resolve('public'), prefix: '/' });
await app.register(swagger, { openapi: { info: { title: 'Media Passport API', version: '1.0.0' }, servers: [{ url: '/' }], tags: [{ name: 'media' }, { name: 'passport' }, { name: 'trust' }, { name: 'cases' }, { name: 'admin' }] } });
await app.register(swaggerUi, { routePrefix: '/docs' });
const publicPath = (url: string) => url === '/health' || url === '/ready' || url === '/' || url.startsWith('/public/') || url.startsWith('/passport/') || url.startsWith('/app.') || url.startsWith('/styles.') || url.startsWith('/passport.') || url === '/docs' || url.startsWith('/docs/');
app.decorateRequest('mediaAuth', null);
app.addHook('onRequest', async (req, reply) => {
  if (publicPath(req.url) || !config.REQUIRE_API_KEY) return;
  const supplied = req.headers['x-api-key'];
  if (typeof supplied !== 'string') return reply.code(401).send({ error: 'UNAUTHORIZED' });
  const expected = config.API_KEY;
  if (expected) { const suppliedBuffer = Buffer.from(supplied); const expectedBuffer = Buffer.from(expected); if (suppliedBuffer.length === expectedBuffer.length && timingSafeEqual(suppliedBuffer, expectedBuffer)) { req.mediaAuth = { keyId: 'bootstrap', organizationId: null, role: 'super_admin' }; return; } }
  const identity = await store.authenticateApiKey(supplied);
  if (!identity) return reply.code(401).send({ error: 'UNAUTHORIZED' });
  req.mediaAuth = identity;
});
function auth(req: { mediaAuth: ApiIdentity | null }): ApiIdentity { if (!req.mediaAuth) throw new Error('UNAUTHORIZED'); return req.mediaAuth; }
function requireRole(req: { mediaAuth: ApiIdentity | null }, reply: any, allowed: ApiRole[]): boolean { const identity = auth(req); if (!allowed.includes(identity.role)) { void reply.code(403).send({ error: 'FORBIDDEN' }); return false; } return true; }
app.get('/health', async () => ({ status: 'ok', service: 'media-passport', version: '1.0.0' }));
app.get('/ready', async (_req, reply) => { const databaseOk = await store.ready(); if (!databaseOk) return reply.code(503).send({ status: 'not_ready', database: { ok: false } }); return { status: 'ready', database: { ok: true }, trustEngine: { ok: true }, security: { uploadQuarantine: true, malwareScanRequired: config.NODE_ENV === 'production' } }; });
app.post('/v1/api-keys', async (req, reply) => { if (!requireRole(req, reply, ['super_admin','platform_admin','organization_admin'])) return; const identity = auth(req); const body = z.object({ organizationId: z.string().min(1), name: z.string().min(1).max(100), role: z.enum(roles as [ApiRole, ...ApiRole[]]) }).parse(req.body); if (identity.organizationId && identity.organizationId !== body.organizationId && identity.role !== 'super_admin' && identity.role !== 'platform_admin') return reply.code(403).send({ error: 'TENANT_MISMATCH' }); const created = await store.createApiKey(body.organizationId, body.name, body.role); return reply.code(201).send({ ...created, warning: 'The secret is returned once. Store it securely.' }); });
app.post('/v1/media/verify', async (req, reply) => {
  if (!requireRole(req, reply, ['creator','analyst','organization_admin','platform_admin','super_admin'])) return;
  const identity = auth(req); const declaredHeader = String(req.headers['x-declared-ai-use'] ?? 'UNKNOWN').toUpperCase(); const declaredAiUse = (aiStatuses as readonly string[]).includes(declaredHeader) ? declaredHeader as typeof aiStatuses[number] : 'UNKNOWN';
  const creatorHeader = req.headers['x-creator-id']; const creatorId = typeof creatorHeader === 'string' && idPattern.test(creatorHeader) ? creatorHeader : undefined;
  const part = await req.file({ limits: { fileSize: config.MAX_UPLOAD_BYTES } }); if (!part) return reply.code(400).send({ error: 'FILE_REQUIRED' });
  const declared = (part.mimetype || 'application/octet-stream').split(';')[0]?.toLowerCase() || 'application/octet-stream';
  const upload = await storeUpload(part.file, part.filename, declared, config.UPLOAD_DIR, config.MAX_UPLOAD_BYTES);
  try {
    if (!config.MALWARE_SCAN_URL || !config.MALWARE_SCAN_TOKEN) throw new Error('MALWARE_SCANNER_NOT_CONFIGURED');
    await scanForMalware(upload.path, upload.sizeBytes, upload.mime, config.MALWARE_SCAN_URL, config.MALWARE_SCAN_TOKEN, config.MALWARE_SCAN_TIMEOUT_MS);
    const asset = { id: upload.id, sha256: upload.sha256, mime: upload.mime, kind: upload.kind, sizeBytes: upload.sizeBytes, originalFilename: upload.originalFilename, createdAt: new Date().toISOString(), ...(identity.organizationId ? { organizationId: identity.organizationId } : {}), ...(creatorId ? { creatorId } : {}), declaredAiUse };
    const record = await verifyMedia(asset, upload.path, { verifyTrust: config.C2PA_VERIFY_TRUST, requireVerification: true }); await store.save(record); if (config.DELETE_SOURCE_AFTER_VERIFICATION) await deleteStoredMedia(upload.path, config.UPLOAD_DIR);
    return reply.code(201).send({ passportId: asset.id, ...record, publicUrl: `/public/${asset.id}`, verificationUrl: `/passport/${asset.id}` });
  } catch (error) {
    await deleteStoredMedia(upload.path, config.UPLOAD_DIR).catch((cleanupError) => req.log.error({ err: cleanupError, assetId: upload.id }, 'failed to remove quarantined media'));
    const message = error instanceof Error ? error.message : String(error); req.log.error({ err: error, assetId: upload.id }, 'verification failed'); const malware = message === 'MALWARE_DETECTED';
    return reply.code(malware ? 422 : 503).send({ error: malware ? 'MALWARE_DETECTED' : 'VERIFICATION_UNAVAILABLE' });
  }
});
async function getRecord(id: string, reply: any) { if (!idPattern.test(id)) { void reply.code(400).send({ error: 'INVALID_ID' }); return null; } const record = await store.get(id); if (!record) { void reply.code(404).send({ error: 'NOT_FOUND' }); return null; } return record; }
app.get('/v1/media/:id', async (req, reply) => { const record = await getRecord((req.params as { id: string }).id, reply); if (!record) return; return record; });
app.get('/v1/media/:id/evidence', async (req, reply) => { const record = await getRecord((req.params as { id: string }).id, reply); if (!record) return; return { passportId: record.asset.id, evidence: record.observations, evidenceQuality: record.trustVector.evidenceQuality }; });
app.get('/v1/media/:id/provenance', async (req, reply) => { const record = await getRecord((req.params as { id: string }).id, reply); if (!record) return; return { passportId: record.asset.id, provenance: record.provenance }; });
app.get('/v1/media/:id/trust', async (req, reply) => { const record = await getRecord((req.params as { id: string }).id, reply); if (!record) return; return { passportId: record.asset.id, trustScore: record.trustScore, confidence: record.confidence, vector: record.trustVector, decision: record.decision, limitations: record.limitations }; });
app.get('/v1/media/:id/claims', async (req, reply) => { const record = await getRecord((req.params as { id: string }).id, reply); if (!record) return; return { passportId: record.asset.id, claims: [], status: 'NOT_ANALYZED', note: 'Claim extraction requires a configured source-analysis provider; no claims are fabricated.' }; });
app.post('/v1/media/:id/appeal', async (req, reply) => { if (!requireRole(req, reply, ['creator','organization_admin','platform_admin','super_admin'])) return; const record = await getRecord((req.params as { id: string }).id, reply); if (!record) return; const body = z.object({ reason: z.string().min(10).max(5000), evidence: z.array(z.string().max(2000)).max(20).default([]) }).parse(req.body); return reply.code(202).send({ status: 'accepted', passportId: record.asset.id, caseId: `APL-${createHash('sha256').update(record.asset.id + body.reason + Date.now()).digest('hex').slice(0, 16)}`, nextStep: 'human_review' }); });
app.post('/v1/media/:id/report', async (req, reply) => { const record = await getRecord((req.params as { id: string }).id, reply); if (!record) return; const body = z.object({ category: z.enum(['impersonation','copyright','privacy','deception','spam','other']), description: z.string().min(10).max(5000) }).parse(req.body); return reply.code(202).send({ status: 'accepted', passportId: record.asset.id, caseId: `RPT-${createHash('sha256').update(record.asset.id + body.category + Date.now()).digest('hex').slice(0, 16)}` }); });
app.post('/v1/recommendation/evaluate', async (req, reply) => { if (!requireRole(req, reply, ['analyst','moderator','organization_admin','platform_admin','super_admin'])) return; const body = z.object({ passportId: z.string().min(10).max(40), minTrust: z.number().min(0).max(100).default(70), requireProvenance: z.boolean().default(false), requireDisclosure: z.boolean().default(true) }).parse(req.body); const record = await getRecord(body.passportId, reply); if (!record) return; const eligible = (record.trustScore ?? 0) >= body.minTrust && (!body.requireProvenance || record.provenance.status === 'verified') && (!body.requireDisclosure || !record.limitations.some(x => /disclosure/i.test(x))); return { passportId: record.asset.id, eligible, decision: record.decision, trustScore: record.trustScore, confidence: record.confidence, reasons: eligible ? ['Trust threshold met', 'No blocking decision'] : ['Recommendation criteria not satisfied'], explainability: { trust: record.trustVector, provenance: record.provenance.status, aiStatus: record.aiStatus } }; });
app.get('/public/:id', async (req, reply) => { const record = await getRecord((req.params as { id: string }).id, reply); if (!record) return; return { passportId: record.asset.id, asset: { sha256: record.asset.sha256, mime: record.asset.mime, kind: record.asset.kind, sizeBytes: record.asset.sizeBytes }, decision: record.decision, trustScore: record.trustScore, confidence: record.confidence, aiStatus: record.aiStatus, provenance: { status: record.provenance.status, embedded: record.provenance.embedded, trusted: record.provenance.trusted }, evidence: record.observations, limitations: record.limitations }; });
app.get('/passport/:id', async (req, reply) => { const record = await getRecord((req.params as { id: string }).id, reply); if (!record) return; const esc = (v: unknown) => String(v).replace(/[&<>\"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;' }[c] ?? c)); const evidence = record.observations.map((o) => `<li><strong>${esc(o.signal)}</strong>: ${esc(o.result)} — ${esc(o.details ?? '')}</li>`).join(''); const vector = Object.entries(record.trustVector).map(([k,v]) => `<li><strong>${esc(k)}</strong>: ${esc(v)}</li>`).join(''); const limitations = record.limitations.map((x) => `<li>${esc(x)}</li>`).join(''); return reply.type('text/html').send(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><meta name="referrer" content="no-referrer"><link rel="stylesheet" href="/passport.css"><title>Media Passport ${esc(record.asset.id)}</title></head><body><main><h1>Media Passport</h1><section><h2>${esc(record.decision)}</h2><p>Trust score: <strong>${esc(record.trustScore ?? 'N/A')}</strong> · Confidence: <strong>${esc(Math.round(record.confidence * 100))}%</strong></p><p>AI status: ${esc(record.aiStatus)} · Provenance: ${esc(record.provenance.status)}</p><p>SHA-256: <code>${esc(record.asset.sha256)}</code></p></section><section><h2>Trust Vector</h2><ul>${vector}</ul></section><section><h2>Evidence Explorer</h2><ul>${evidence || '<li>No additional evidence.</li>'}</ul></section><section><h2>Limitations</h2><ul>${limitations}</ul></section></main></body></html>`); });
app.setErrorHandler((error, req, reply) => { if (error instanceof z.ZodError) return reply.code(400).send({ error: 'INVALID_REQUEST', issues: error.issues }); const message = error instanceof Error ? error.message : String(error); if ((error as { code?: string }).code === 'FST_REQ_FILE_TOO_LARGE' || message === 'UPLOAD_TOO_LARGE') return reply.code(413).send({ error: 'UPLOAD_TOO_LARGE' }); if (message === 'UNSUPPORTED_MEDIA_TYPE') return reply.code(415).send({ error: message }); if (message === 'MIME_MISMATCH') return reply.code(400).send({ error: message }); req.log.error({ err: error }, 'request failed'); return reply.code(500).send({ error: 'INTERNAL_ERROR' }); });
const shutdown = async (signal: string) => { app.log.info({ signal }, 'shutting down'); await app.close(); await store.close(); process.exit(0); };
process.once('SIGTERM', () => void shutdown('SIGTERM')); process.once('SIGINT', () => void shutdown('SIGINT')); await app.listen({ host: config.HOST, port: config.PORT });
