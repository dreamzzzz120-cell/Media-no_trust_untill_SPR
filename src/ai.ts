import postgres from 'postgres';
import { createHash, randomUUID } from 'node:crypto';
import type { EvidenceState, ExternalOutcome } from './reconciliation.js';
import { reconcileAction } from './reconciliation.js';

export type AiEventType = 'OUTPUT' | 'TOOL_REQUEST' | 'TOOL_RESULT' | 'ACTION_REQUESTED' | 'ACTION_CONFIRMED' | 'ACTION_FAILED' | 'ACTION_UNAVAILABLE' | 'APPROVAL_REQUESTED' | 'APPROVAL_GRANTED' | 'APPROVAL_DENIED' | 'CONFIG_CHANGED';
export type SourceType = 'DECLARATION' | 'DIRECT_OBSERVATION' | 'AUTHORITATIVE_SYSTEM' | 'SIGNED_ATTESTATION';
export interface AiSystem { id: string; organizationId: string; name: string; purpose: string; owner: string | null; provider: string | null; model: string | null; createdAt: string }
export interface AiEvent { id: string; aiId: string; eventType: AiEventType; sourceType: SourceType; source: string; summary: string; occurredAt: string; recordedAt: string; evidenceHash: string; previousHash: string | null; eventHash: string; state: EvidenceState; relatedEventId: string | null }
export interface AiAlert { id: string; aiId: string; claimEventId: string; resultEventId: string; severity: 'CRITICAL'; summary: string; createdAt: string }
export type EventInput = Pick<AiEvent, 'eventType' | 'sourceType' | 'source' | 'summary' | 'occurredAt' | 'evidenceHash'>;
export interface ConfirmationInput { claimEventId: string; outcome: ExternalOutcome; source: string; occurredAt: string; evidenceHash: string; externalEventId: string }
export interface AiStore {
 register(org: string, input: Pick<AiSystem, 'name' | 'purpose' | 'owner' | 'provider' | 'model'>): Promise<AiSystem>;
 get(org: string, id: string): Promise<AiSystem | null>;
 append(org: string, aiId: string, input: EventInput): Promise<AiEvent | null>;
 confirm(org: string, aiId: string, input: ConfirmationInput): Promise<{ event: AiEvent; alert: AiAlert | null } | null>;
 timeline(org: string, aiId: string): Promise<AiEvent[]>;
 alerts(org: string, aiId: string): Promise<AiAlert[]>;
 close(): Promise<void>;
}
const digest = (value: string) => createHash('sha256').update(value).digest('hex');
function makeEvent(aiId: string, input: EventInput, previousHash: string | null, state: EvidenceState = 'DECLARED', relatedEventId: string | null = null): AiEvent {
 const event = { id: randomUUID(), aiId, ...input, recordedAt: new Date().toISOString(), previousHash, state, relatedEventId };
 return { ...event, eventHash: digest(JSON.stringify(event)) };
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
 async register(organizationId: string, input: Pick<AiSystem, 'name' | 'purpose' | 'owner' | 'provider' | 'model'>) { const system = { id: randomUUID(), organizationId, ...input, createdAt: new Date().toISOString() }; this.systems.set(system.id, system); return structuredClone(system); }
 async get(org: string, id: string) { const system = this.systems.get(id); return system?.organizationId === org ? structuredClone(system) : null; }
 async append(org: string, aiId: string, input: EventInput) { if (!await this.get(org, aiId)) return null; const events = this.events.get(aiId) ?? []; const event = makeEvent(aiId, input, events.at(-1)?.eventHash ?? null); events.push(event); this.events.set(aiId, events); return structuredClone(event); }
 async confirm(org: string, aiId: string, input: ConfirmationInput) {
  if (!await this.get(org, aiId)) return null;
  const events = this.events.get(aiId) ?? []; const claim = events.find(e => e.id === input.claimEventId && e.sourceType === 'DECLARATION');
  if (!claim) return null;
  const key = `${org}:${input.source}:${input.externalEventId}`;
  if (this.confirmations.has(key)) throw new Error('DUPLICATE_CONFIRMATION');
  const result = confirmation(aiId, claim, input, events.at(-1)?.eventHash ?? null);
  events.push(result.event); this.events.set(aiId, events); this.confirmations.add(key);
  if (result.alert) this.incidents.set(aiId, [...(this.incidents.get(aiId) ?? []), result.alert]);
  return structuredClone(result);
 }
 async timeline(org: string, aiId: string) { if (!await this.get(org, aiId)) return []; return structuredClone(this.events.get(aiId) ?? []).sort((a,b) => a.occurredAt.localeCompare(b.occurredAt) || a.id.localeCompare(b.id)); }
 async alerts(org: string, aiId: string) { return await this.get(org, aiId) ? structuredClone(this.incidents.get(aiId) ?? []) : []; }
 async close() { this.systems.clear(); this.events.clear(); this.incidents.clear(); this.confirmations.clear(); }
}
interface SystemRow { id: string; organization_id: string; name: string; purpose: string; owner: string | null; provider: string | null; model: string | null; created_at: Date }
interface EventRow { id: string; ai_identity_id: string; event_type: AiEventType; source_type: SourceType; source: string; summary: string; occurred_at: Date; recorded_at: Date; evidence_hash: string; previous_hash: string | null; event_hash: string; state_evaluation: EvidenceState; related_event_id: string | null }
interface AlertRow { id: string; ai_identity_id: string; claim_event_id: string; result_event_id: string; severity: 'CRITICAL'; summary: string; created_at: Date }
const systemFromRow = (r: SystemRow): AiSystem => ({ id: r.id, organizationId: r.organization_id, name: r.name, purpose: r.purpose, owner: r.owner, provider: r.provider, model: r.model, createdAt: r.created_at.toISOString() });
const eventFromRow = (r: EventRow): AiEvent => ({ id:r.id, aiId:r.ai_identity_id, eventType:r.event_type, sourceType:r.source_type, source:r.source, summary:r.summary, occurredAt:r.occurred_at.toISOString(), recordedAt:r.recorded_at.toISOString(), evidenceHash:r.evidence_hash, previousHash:r.previous_hash, eventHash:r.event_hash, state:r.state_evaluation, relatedEventId:r.related_event_id });
const alertFromRow = (r: AlertRow): AiAlert => ({ id:r.id, aiId:r.ai_identity_id, claimEventId:r.claim_event_id, resultEventId:r.result_event_id, severity:r.severity, summary:r.summary, createdAt:r.created_at.toISOString() });
class PgAiStore implements AiStore {
 constructor(private sql: postgres.Sql) {}
 async register(org: string, input: Pick<AiSystem, 'name' | 'purpose' | 'owner' | 'provider' | 'model'>) {
  const rows = await this.sql<SystemRow[]>`INSERT INTO ai_identities(id, organization_id, name, purpose, owner, provider, model) VALUES (${randomUUID()}, ${org}, ${input.name}, ${input.purpose}, ${input.owner}, ${input.provider}, ${input.model}) RETURNING *`;
  if (!rows[0]) throw new Error('AI_REGISTRATION_FAILED'); return systemFromRow(rows[0]);
 }
 async get(org: string, id: string) { const rows = await this.sql<SystemRow[]>`SELECT * FROM ai_identities WHERE organization_id=${org} AND id=${id}`; return rows[0] ? systemFromRow(rows[0]) : null; }
 async append(org: string, aiId: string, input: EventInput) {
  return this.sql.begin(async tx => {
   const systems = await tx`SELECT id FROM ai_identities WHERE organization_id=${org} AND id=${aiId} FOR UPDATE`; if (!systems.length) return null;
   const prior = await tx<{ event_hash: string }[]>`SELECT event_hash FROM flight_records WHERE organization_id=${org} AND ai_identity_id=${aiId} ORDER BY sequence DESC LIMIT 1`;
   const event = makeEvent(aiId, input, prior[0]?.event_hash ?? null);
   await insertEvent(tx, org, event); return event;
  });
 }
 async confirm(org: string, aiId: string, input: ConfirmationInput) {
  return this.sql.begin(async tx => {
   const systems = await tx`SELECT id FROM ai_identities WHERE organization_id=${org} AND id=${aiId} FOR UPDATE`; if (!systems.length) return null;
   const rows = await tx<EventRow[]>`SELECT * FROM flight_records WHERE organization_id=${org} AND ai_identity_id=${aiId} AND id=${input.claimEventId} AND source_type='DECLARATION'`;
   if (!rows[0]) return null;
   const prior = await tx<{ event_hash: string }[]>`SELECT event_hash FROM flight_records WHERE organization_id=${org} AND ai_identity_id=${aiId} ORDER BY sequence DESC LIMIT 1`;
   const result = confirmation(aiId, eventFromRow(rows[0]), input, prior[0]?.event_hash ?? null);
   await insertEvent(tx, org, result.event, input.externalEventId);
   if (result.alert) await tx`INSERT INTO ai_alerts(id, organization_id, ai_identity_id, claim_event_id, result_event_id, severity, summary, created_at) VALUES (${result.alert.id}, ${org}, ${aiId}, ${result.alert.claimEventId}, ${result.alert.resultEventId}, ${result.alert.severity}, ${result.alert.summary}, ${result.alert.createdAt})`;
   return result;
  });
 }
 async timeline(org: string, aiId: string) { const rows = await this.sql<EventRow[]>`SELECT * FROM flight_records WHERE organization_id=${org} AND ai_identity_id=${aiId} ORDER BY occurred_at ASC, sequence ASC LIMIT 1000`; return rows.map(eventFromRow); }
 async alerts(org: string, aiId: string) { const rows = await this.sql<AlertRow[]>`SELECT * FROM ai_alerts WHERE organization_id=${org} AND ai_identity_id=${aiId} ORDER BY created_at DESC LIMIT 100`; return rows.map(alertFromRow); }
 async close() { await this.sql.end({ timeout: 5 }); }
}
async function insertEvent(tx: postgres.TransactionSql, org: string, event: AiEvent, externalEventId: string | null = null) {
 await tx`INSERT INTO flight_records(id, organization_id, ai_identity_id, event_type, source_type, source, summary, occurred_at, recorded_at, evidence_hash, previous_hash, event_hash, state_evaluation, related_event_id, external_event_id) VALUES (${event.id}, ${org}, ${event.aiId}, ${event.eventType}, ${event.sourceType}, ${event.source}, ${event.summary}, ${event.occurredAt}, ${event.recordedAt}, ${event.evidenceHash}, ${event.previousHash}, ${event.eventHash}, ${event.state}, ${event.relatedEventId}, ${externalEventId})`;
 await tx`INSERT INTO evidence_ledger(id, organization_id, flight_record_id, source_type, cryptographic_hash) VALUES (${randomUUID()}, ${org}, ${event.id}, ${event.sourceType}, ${event.evidenceHash})`;
}
