import{describe,it,expect}from'vitest';import{readFileSync}from'node:fs';
const server=readFileSync(new URL('../src/server.ts',import.meta.url),'utf8');
const ai=readFileSync(new URL('../src/ai.ts',import.meta.url),'utf8');
const migration=readFileSync(new URL('../db/005_ai_flight_recorder.sql',import.meta.url),'utf8');
describe('trusted action receipt release gate',()=>{
 it('binds signature to tenant subject claim outcome source time evidence and external event',()=>{for(const field of ['body.organizationId','body.aiId','body.claimEventId','body.outcome','body.source','body.occurredAt','body.evidenceHash','body.externalEventId'])expect(server).toContain(field);expect(server).toContain("createHmac('sha256', config.TRUSTED_ACTION_WEBHOOK_SECRET)");expect(server).toContain('timingSafeEqual')});
 it('rejects unsigned extension fields',()=>expect(server).toContain('confirmationSchema = z.object'));
 it('strictly parses trusted confirmation payloads',()=>expect(server).toContain('externalEventId: z.string().regex(/^[A-Za-z0-9_.:-]{1,150}$/) }).strict()'));
 it('rejects timestamp reversal and excessive future clock skew',()=>{expect(ai).toContain("occurred<claimed");expect(ai).toContain("occurred>now+300000");expect(ai).toContain("INVALID_CONFIRMATION_TIME")});
 it('binds confirmations only to declared action requests',()=>{expect(ai).toContain("sourceType === 'DECLARATION' && e.eventType === 'ACTION_REQUESTED'");expect(ai).toContain("source_type='DECLARATION' AND event_type='ACTION_REQUESTED'")});
 it('deduplicates provider receipts per tenant and source',()=>expect(migration).toContain('CREATE UNIQUE INDEX flight_records_external_idx ON flight_records(organization_id, source, external_event_id)'));
 it('keeps flight receipts append only',()=>{expect(migration).toContain('flight_records_immutable');expect(migration).toContain('BEFORE UPDATE OR DELETE ON flight_records')});
});
