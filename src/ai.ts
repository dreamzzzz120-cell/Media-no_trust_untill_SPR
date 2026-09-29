import postgres from 'postgres';
import { createHash, randomUUID } from 'node:crypto';
import type { EvidenceState, ExternalOutcome } from './reconciliation.js';
import { reconcileAction } from './reconciliation.js';

export type AiEventType = 'OUTPUT' | 'TOOL_REQUEST' | 'TOOL_RESULT' | 'ACTION_REQUESTED' | 'ACTION_CONFIRMED' | 'ACTION_FAILED' | 'ACTION_UNAVAILABLE' | 'APPROVAL_REQUESTED' | 'APPROVAL_GRANTED' | 'APPROVAL_DENIED' | 'CONFIG_CHANGED';
export type SourceType = 'DECLARATION' | 'DIRECT_OBSERVATION' | 'AUTHORITATIVE_SYSTEM' | 'SIGNED_ATTESTATION';
export interface AiSystem { id: string; organizationId: string; name: string; purpose: string; owner: string | null; provider: string | null; model: string | null; createdAt: string }
export interface AiEvent { id: string; aiId: string; eventType: AiEventType; sourceType: SourceType; source: string; summary: string; occurredAt: string; recordedAt: string; evidenceHash: string; previousHash: string | null; eventHash: string; state: EvidenceState; relatedEventId: string | null; sequence?: number }
export interface AiAlert { id: string; aiId: string; claimEventId: string; resultEventId: string; severity: 'CRITICAL'; summary: string; createdAt: string }
export interface AiIntegrity { state: 'VALID_INTERNAL_CHAIN' | 'BROKEN' | 'EMPTY' | 'INCOMPLETE'; checkedEvents: number; failures: string[]; externalAnchor: 'NOT_CONFIGURED' }
export type EventInput = Pick<AiEvent, 'eventType' | 'sourceType' | 'source' | 'summary' | 'occurredAt' | 'evidenceHash'>;
export interface ConfirmationInput { claimEventId: string; outcome: ExternalOutcome; source: string; occurredAt: string; evidenceHash: string; externalEventId: string }
export interface AiStore {
 ready(): Promise<boolean>;
 register(org: string, input: Pick<AiSystem, 'name' | 'purpose' | 'owner' | 'provider' | 'model'>): Promise<AiSystem>;
 get(org: string, id: string): Promise<AiSystem | null>;
 append(org: string, aiId: string, input: EventInput): Promise<AiEvent | null>;
 confirm(org: string, aiId: string, input: ConfirmationInput): Promise<{ event: AiEvent; alert: AiAlert | null } | null>;
 timeline(org: string, aiId: string, afterSequence?: number, limit?: number): Promise<AiEvent[]>;
 alerts(org: string, aiId: string): Promise<AiAlert[]>;
 integrity(org: string, aiId: string): Promise<AiIntegrity>;
 close(): Promise<void>;
}
const digest = (value: string) => createHash('sha256').update(value).digest('hex');
const isUuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
function makeEvent(aiId: string, input: EventInput, previousHash: string | null, state: EvidenceState = 'DECLARED', relatedEventId: string | null = null): AiEvent {
 const event = { id: randomUUID(), aiId, ...input, occurredAt: new Date(input.occurredAt).toISOString(), recordedAt: new Date().toISOString(), previousHash, state, relatedEventId };
 return { ...event, eventHash: digest(JSON.stringify(event)) };
}
function eventDigest(e: AiEvent) { return digest(JSON.stringify({ id:e.id, aiId:e.aiId, eventType:e.eventType, sourceType:e.sourceType, source:e.source, summary:e.summary, occurredAt:e.occurredAt, evidenceHash:e.evidenceHash, recordedAt:e.recordedAt, previousHash:e.previousHash, state:e.state, relatedEventId:e.relatedEventId })); }
function checkChain(events: AiEvent[], ledgerHashes?: Map<string, string>): AiIntegrity {
 const failures: string[] = []; let previous: string | null = null;
 for (const e of events) { if (e.previousHash !== previous || e.eventHash !== eventDigest(e) || ledgerHashes && ledgerHashes.get(e.id) !== e.evidenceHash) failures.push(e.id); previous = e.eventHash; }
 return { state: failures.length ? 'BROKEN' : events.length ? 'VALID_INTERNAL_CHAIN' : 'EMPTY', checkedEvents: events.length, failures, externalAnchor: 'NOT_CONFIGURED' };
}
function confirmation(aiId: string, claim: AiEvent, input: ConfirmationInput, previousHash: string | null) {
 const decision = reconcileAction(claim.summary, input.outcome, true);
 const event = makeEvent(aiId, { eventType: input.outcome === 'CONFIRMED' ? 'ACTION_CONFIRMED' : input.outcome === 'UNREACHABLE' ? 'ACTION_UNAVAILABLE' : 'ACTION_FAILED', sourceType: 'AUTHORITATIVE_SYSTEM', source: input.source, summary: decision.explanation, occurredAt: input.occurredAt, evidenceHash: input.evidenceHash }, previousHash, decision.state, claim.id);
 const alert: AiAlert | null = decision.alert ? { id: randomUUID(), aiId, claimEventId: claim.id, resultEventId: event.id, severity: decision.alert, summary: decision.explanation, createdAt: event.recordedAt } : null;
 return { event, alert };
}
export function createAiStore(url?: string): AiStore { return url ? new PgAiStore(postgres(url, { prepare: false })) : new MemoryAiStore(); }
class MemoryAiStore implements AiStore {
 private systems = new Map<string, AiSystem>(); private events = new Map<string, AiEvent[]>(); private incidents = new Map<string, AiAlert[]>(); private confirmations = new Set<string>();
 async ready() { return true; }
 async register(organizationId: string, input: Pick<AiSystem, 'name' | 'purpose' | 'owner' | 'provider' | 'model'>) { const system = { id: randomUUID(), organizationId, ...input, createdAt: new Date().toISOString() }; this.systems.set(system.id, system); return structuredClone(system); }
 async get(org: string, id: string) { const system = this.systems.get(id); return system?.organizationId === org ? structuredClone(system) : null; }
 async append(org: string, aiId: string, input: EventInput) { if (!await this.get(org, aiId)) return null; const events = this.events.get(aiId) ?? []; const event = { ...makeEvent(aiId, input, events.at(-1)?.eventHash ?? null), sequence: events.length + 1 }; events.push(event); this.events.set(aiId, events); return structuredClone(event); }
 async confirm(org: string, aiId: string, input: ConfirmationInput) {
  if (!await this.get(org, aiId)) return null;
  const events = this.events.get(aiId) ?? []; const claim = events.find(e => e.id === input.claimEventId && e.sourceType === 'DECLARATION');
  if (!claim) return null;
  const key = `${org}:${input.source}:${input.externalEventId}`;
  if (this.confirmations.has(key)) throw new Error('DUPLICATE_CONFIRMATION');
  const result = confirmation(aiId, claim, input, events.at(-1)?.eventHash ?? null); result.event.sequence = events.length + 1;
  events.push(result.event); this.events.set(aiId, events); this.confirmations.add(key);
  if (result.alert) this.incidents.set(aiId, [...(this.incidents.get(aiId) ?? []), result.alert]);
  return structuredClone(result);
 }
 async timeline(org: string, aiId: string, afterSequence = 0, limit = 1000) { if (!await this.get(org, aiId)) return []; return structuredClone((this.events.get(aiId) ?? []).filter(e => (e.sequence ?? 0) > afterSequence).slice(0, limit)); }
 async alerts(org: string, aiId: string) { return await this.get(org, aiId) ? structuredClone(this.incidents.get(aiId) ?? []) : []; }
 async integrity(org: string, aiId: string) { return await this.get(org, aiId) ? checkChain(this.events.get(aiId) ?? []) : { state:'EMPTY' as const, checkedEvents:0, failures:[], externalAnchor:'NOT_CONFIGURED' as const }; }
 async close() { this.systems.clear(); this.events.clear(); this.incidents.clear(); this.confirmations.clear(); }
}
interface SystemRow { id: string; organization_id: string; name: string; purpose: string; owner: string | null; provider: string | null; model: string | null; created_at: Date }
interface EventRow { id: string; sequence: string | number; ai_identity_id: string; event_type: AiEventType; source_type: SourceType; source: string; summary: string; occurred_at: Date; recorded_at: Date; evidence_hash: string; previous_hash: string | null; event_hash: string; state_evaluation: EvidenceState; related_event_id: string | null }
interface AlertRow { id: string; ai_identity_id: string; claim_event_id: string; result_event_id: string; severity: 'CRITICAL'; summary: string; created_at: Date }
const systemFromRow = (r: SystemRow): AiSystem => ({ id: r.id, organizationId: r.organization_id, name: r.name, purpose: r.purpose, owner: r.owner, provider: r.provider, model: r.model, createdAt: r.created_at.toISOString() });
const eventFromRow = (r: EventRow): AiEvent => ({ id:r.id, aiId:r.ai_identity_id, eventType:r.event_type, sourceType:r.source_type, source:r.source, summary:r.summary, occurredAt:r.occurred_at.toISOString(), recordedAt:r.recorded_at.toISOString(), evidenceHash:r.evidence_hash, previousHash:r.previous_hash, eventHash:r.event_hash, state:r.state_evaluation, relatedEventId:r.related_event_id, sequence:Number(r.sequence) });
const alertFromRow = (r: AlertRow): AiAlert => ({ id:r.id, aiId:r.ai_identity_id, claimEventId:r.claim_event_id, resultEventId:r.result_event_id, severity:r.severity, summary:r.summary, createdAt:r.created_at.toISOString() });
class PgAiStore implements AiStore {
 constructor(private sql: postgres.Sql) {}
 async ready() { try { await this.sql`SELECT 1 FROM ai_identities LIMIT 0`; await this.sql`SELECT 1 FROM flight_records LIMIT 0`; await this.sql`SELECT 1 FROM evidence_ledger LIMIT 0`; await this.sql`SELECT 1 FROM ai_alerts LIMIT 0`; return true; } catch { return false; } }
 async register(org: string, input: Pick<AiSystem, 'name' | 'purpose' | 'owner' | 'provider' | 'model'>) {
  const rows = await this.sql<SystemRow[]>`INSERT INTO ai_identities(id, organization_id, name, purpose, owner, provider, model) VALUES (${randomUUID()}, ${org}, ${input.name}, ${input.purpose}, ${input.owner}, ${input.provider}, ${input.model}) RETURNING *`;
  if (!rows[0]) throw new Error('AI_REGISTRATION_FAILED'); return systemFromRow(rows[0]);
 }
 async get(org: string, id: string) { if (!isUuid(id)) return null; const rows = await this.sql<SystemRow[]>`SELECT * FROM ai_identities WHERE organization_id=${org} AND id=${id}`; return rows[0] ? systemFromRow(rows[0]) : null; }
 async append(org: string, aiId: string, input: EventInput) {
  if (!isUuid(aiId)) return null;
  return this.sql.begin(async tx => {
   const systems = await tx`SELECT id FROM ai_identities WHERE organization_id=${org} AND id=${aiId} FOR UPDATE`; if (!systems.length) return null;
   const prior = await tx<{ event_hash: string }[]>`SELECT event_hash FROM flight_records WHERE organization_id=${org} AND ai_identity_id=${aiId} ORDER BY sequence DESC LIMIT 1`;
   const event = makeEvent(aiId, input, prior[0]?.event_hash ?? null);
   event.sequence = await insertEvent(tx, org, event); return event;
  });
 }
 async confirm(org: string, aiId: string, input: ConfirmationInput) {
  return this.sql.begin(async tx => {
   const systems = await tx`SELECT id FROM ai_identities WHERE organization_id=${org} AND id=${aiId} FOR UPDATE`; if (!systems.length) return null;
   const rows = await tx<EventRow[]>`SELECT * FROM flight_records WHERE organization_id=${org} AND ai_identity_id=${aiId} AND id=${input.claimEventId} AND source_type='DECLARATION'`;
   if (!rows[0]) return null;
   const prior = await tx<{ event_hash: string }[]>`SELECT event_hash FROM flight_records WHERE organization_id=${org} AND ai_identity_id=${aiId} ORDER BY sequence DESC LIMIT 1`;
   const result = confirmation(aiId, eventFromRow(rows[0]), input, prior[0]?.event_hash ?? null);
   result.event.sequence = await insertEvent(tx, org, result.event, input.externalEventId);
   if (result.alert) await tx`INSERT INTO ai_alerts(id, organization_id, ai_identity_id, claim_event_id, result_event_id, severity, summary, created_at) VALUES (${result.alert.id}, ${org}, ${aiId}, ${result.alert.claimEventId}, ${result.alert.resultEventId}, ${result.alert.severity}, ${result.alert.summary}, ${result.alert.createdAt})`;
   return result;
  });
 }
 async timeline(org: string, aiId: string, afterSequence = 0, limit = 1000) { const rows = await this.sql<EventRow[]>`SELECT * FROM flight_records WHERE organization_id=${org} AND ai_identity_id=${aiId} AND sequence > ${afterSequence} ORDER BY sequence ASC LIMIT ${limit}`; return rows.map(eventFromRow); }
 async alerts(org: string, aiId: string) { const rows = await this.sql<AlertRow[]>`SELECT * FROM ai_alerts WHERE organization_id=${org} AND ai_identity_id=${aiId} ORDER BY created_at DESC LIMIT 100`; return rows.map(alertFromRow); }
 async integrity(org: string, aiId: string) {
  const rows = await this.sql<(EventRow & { ledger_hash: string | null })[]>`SELECT f.*, l.cryptographic_hash AS ledger_hash FROM flight_records f LEFT JOIN evidence_ledger l ON l.flight_record_id=f.id AND l.organization_id=f.organization_id WHERE f.organization_id=${org} AND f.ai_identity_id=${aiId} ORDER BY f.sequence ASC LIMIT 10001`;
  const incomplete = rows.length > 10000; const checked = rows.slice(0, 10000);
  const result = checkChain(checked.map(eventFromRow), new Map(checked.map(r => [r.id, r.ledger_hash ?? 'MISSING'])));
  return incomplete && result.state === 'VALID_INTERNAL_CHAIN' ? { ...result, state:'INCOMPLETE' as const } : result;
 }
 async close() { await this.sql.end({ timeout: 5 }); }
}
async function insertEvent(tx: postgres.TransactionSql, org: string, event: AiEvent, externalEventId: string | null = null) {
 const rows = await tx<{ sequence: string | number }[]>`INSERT INTO flight_records(id, organization_id, ai_identity_id, event_type, source_type, source, summary, occurred_at, recorded_at, evidence_hash, previous_hash, event_hash, state_evaluation, related_event_id, external_event_id) VALUES (${event.id}, ${org}, ${event.aiId}, ${event.eventType}, ${event.sourceType}, ${event.source}, ${event.summary}, ${event.occurredAt}, ${event.recordedAt}, ${event.evidenceHash}, ${event.previousHash}, ${event.eventHash}, ${event.state}, ${event.relatedEventId}, ${externalEventId}) RETURNING sequence`;
 await tx`INSERT INTO evidence_ledger(id, organization_id, flight_record_id, source_type, cryptographic_hash) VALUES (${randomUUID()}, ${org}, ${event.id}, ${event.sourceType}, ${event.evidenceHash})`;
 if (!rows[0]) throw new Error('AI_EVENT_INSERT_FAILED'); return Number(rows[0].sequence);
}
