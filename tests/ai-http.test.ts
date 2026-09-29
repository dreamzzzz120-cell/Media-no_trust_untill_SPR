import { afterAll, beforeAll, expect, it } from 'vitest';
import { createHash, createHmac } from 'node:crypto';
import { createServer } from 'node:http';
import { spawn, type ChildProcess } from 'node:child_process';

const bootstrap = 'b'.repeat(40);
const webhookSecret = 'connector-test-secret-with-32-plus-bytes';
let app: ChildProcess;
let url: string;
let keyA: string;
let keyB: string;
let orgA: string;
async function request(path: string, key: string | null = null, body?: object, signature?: string) {
 const response = await fetch(url + path, { method: body ? 'POST' : 'GET', headers: { ...(key ? { 'x-api-key': key } : {}), ...(signature ? { 'x-media-signature': signature } : {}), ...(body ? { 'content-type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
 return { status: response.status, body: await response.json() as Record<string, any> };
}
beforeAll(async () => {
 const probe = createServer(); await new Promise<void>(resolve => probe.listen(0, '127.0.0.1', resolve)); const port = (probe.address() as { port: number }).port; await new Promise<void>(resolve => probe.close(() => resolve()));
 url = `http://127.0.0.1:${port}`;
 app = spawn(process.execPath, ['--import', 'tsx', 'src/server.ts'], { cwd: process.cwd(), env: { ...process.env, NODE_ENV:'test', PORT:String(port), HOST:'127.0.0.1', API_KEY:bootstrap, REQUIRE_API_KEY:'true', TRUSTED_ACTION_WEBHOOK_SECRET:webhookSecret, TRUSTED_ACTION_SOURCE:'payment-gateway' }, stdio:'pipe' });
 for (let i=0;i<100;i++) { if (app.exitCode !== null) throw new Error('Server exited'); try { if ((await fetch(url+'/health')).ok) break; } catch { /* starting */ } await new Promise(resolve => setTimeout(resolve,100)); if(i===99) throw new Error('Server startup timeout'); }
 const a = await request('/v1/organizations', bootstrap, { name:'Tenant A' }); const b = await request('/v1/organizations', bootstrap, { name:'Tenant B' }); orgA = a.body.id;
 const ka = await request('/v1/api-keys', bootstrap, { organizationId:a.body.id, name:'a', role:'organization_admin' });
 const kb = await request('/v1/api-keys', bootstrap, { organizationId:b.body.id, name:'b', role:'analyst' }); keyA=ka.body.key; keyB=kb.body.key;
}, 30000);
afterAll(() => { app?.kill('SIGTERM'); });
it('registers, records, rejects forgery and cross-tenant access, then shows a verified contradiction', async () => {
 const page = await fetch(url + '/ai.html'); expect(page.status).toBe(200); expect(await page.text()).toContain('AI flight recorder');
 expect((await fetch(url + '/?utm_source=review')).status).toBe(200);
 const aiReady = await fetch(url + '/ready/ai'); expect(aiReady.status).toBe(200); expect((await aiReady.json()).scope).toBe('ai_registry_and_event_api');
 const system = await request('/v1/ai', keyA, { name:'Refund agent', purpose:'Customer support' }); expect(system.status).toBe(201);
 const id=system.body.id as string;
 expect((await request('/v1/ai/not-a-uuid',keyA)).status).toBe(404);
 expect((await request(`/v1/ai/${id}`, keyB)).status).toBe(404);
 expect((await request(`/v1/ai/${id}/timeline`, keyB)).status).toBe(404);
 const claim = await request(`/v1/ai/${id}/events`, keyA, { eventType:'OUTPUT', sourceType:'DECLARATION', source:'agent wrapper', summary:'Refund completed', occurredAt:'2026-09-28T20:00:00Z', evidenceHash:createHash('sha256').update('Refund completed').digest('hex') });
 expect(claim.status).toBe(201); expect(claim.body.state).toBe('DECLARED');
 const spoofed = await request(`/v1/ai/${id}/events`, keyA, { eventType:'ACTION_CONFIRMED', sourceType:'AUTHORITATIVE_SYSTEM', source:'fake', summary:'confirmed', occurredAt:'2026-09-28T20:00:01Z', evidenceHash:'a'.repeat(64) }); expect(spoofed.status).toBe(400);
 const declaredConfirmation = await request(`/v1/ai/${id}/events`, keyA, { eventType:'ACTION_CONFIRMED', sourceType:'DECLARATION', source:'agent wrapper', summary:'confirmed', occurredAt:'2026-09-28T20:00:01Z', evidenceHash:'a'.repeat(64) }); expect(declaredConfirmation.status).toBe(400);
 const body = { organizationId:orgA, aiId:id, claimEventId:claim.body.id, outcome:'FAILED', source:'payment-gateway', occurredAt:'2026-09-28T20:00:02Z', evidenceHash:'f'.repeat(64), externalEventId:'failure-1' };
 const endpoint='/v1/integrations/action-confirmations';
 expect((await request(endpoint, null, body)).status).toBe(401);
 const canonical=[body.organizationId, body.aiId, body.claimEventId, body.outcome, body.source, body.occurredAt, body.evidenceHash, body.externalEventId].join('\n');
 const sig=createHmac('sha256', webhookSecret).update(canonical).digest('hex');
 const result=await request(endpoint, null, body, sig);
 expect(result.status).toBe(201); expect(result.body.event.state).toBe('CONFLICTING'); expect(result.body.alert.severity).toBe('CRITICAL');
 expect((await request(endpoint,null,body,sig)).status).toBe(409);
 const unreachable = { ...body, outcome:'UNREACHABLE', externalEventId:'unreachable-2', occurredAt:'2026-09-28T20:00:03Z' };
 const unreachableCanonical=[unreachable.organizationId, unreachable.aiId, unreachable.claimEventId, unreachable.outcome, unreachable.source, unreachable.occurredAt, unreachable.evidenceHash, unreachable.externalEventId].join('\n');
 const unreachableSignature=createHmac('sha256', webhookSecret).update(unreachableCanonical).digest('hex');
 const unavailable=await request(endpoint,null,unreachable,unreachableSignature);
 expect(unavailable.status).toBe(201); expect(unavailable.body.event.state).toBe('UNAVAILABLE'); expect(unavailable.body.alert).toBeNull();
 const history=await request(`/v1/ai/${id}/timeline`,keyA); expect(history.body.events).toHaveLength(3); expect(history.body.events[1].relatedEventId).toBe(claim.body.id);
 const firstPage=await request(`/v1/ai/${id}/timeline?limit=1`,keyA); expect(firstPage.body.hasMore).toBe(true); expect(firstPage.body.events).toHaveLength(1);
 const nextPage=await request(`/v1/ai/${id}/timeline?limit=1&afterSequence=${firstPage.body.nextCursor}`,keyA); expect(nextPage.body.events[0].id).toBe(history.body.events[1].id);
 const integrity=await request(`/v1/ai/${id}/integrity`,keyA); expect(integrity.body.state).toBe('VALID_INTERNAL_CHAIN'); expect(integrity.body.externalAnchor).toBe('NOT_CONFIGURED');
 const alerts=await request(`/v1/ai/${id}/alerts`,keyA); expect(alerts.body.alerts).toHaveLength(1);
 const coverage=await request(`/v1/ai/${id}/coverage`,keyA); expect(coverage.body.sources.some((s: {state:string})=>s.state==='UNAVAILABLE')).toBe(true);
 expect((await request(`/v1/ai/${id}/alerts`,keyB)).status).toBe(404);
}, 30000);
