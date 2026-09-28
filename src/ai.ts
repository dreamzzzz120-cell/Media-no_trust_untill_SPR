import postgres from 'postgres';
import { createHash } from 'node:crypto';
import { nanoid } from 'nanoid';

export type AiEventType = 'OUTPUT' | 'TOOL_REQUEST' | 'TOOL_RESULT' | 'ACTION_REQUESTED' | 'ACTION_CONFIRMED' | 'ACTION_FAILED' | 'APPROVAL_REQUESTED' | 'APPROVAL_GRANTED' | 'APPROVAL_DENIED' | 'CONFIG_CHANGED';
export type SourceType = 'DECLARATION' | 'DIRECT_OBSERVATION' | 'AUTHORITATIVE_SYSTEM' | 'SIGNED_ATTESTATION';
export interface AiSystem { id: string; organizationId: string; name: string; purpose: string; owner: string | null; provider: string | null; model: string | null; createdAt: string }
export interface AiEvent { id: string; aiId: string; eventType: AiEventType; sourceType: SourceType; source: string; summary: string; occurredAt: string; recordedAt: string; evidenceHash: string; previousHash: string | null; eventHash: string }
export interface AiStore { register(organizationId: string, input: Pick<AiSystem, 'name' | 'purpose' | 'owner' | 'provider' | 'model'>): Promise<AiSystem>; get(organizationId: string, id: string): Promise<AiSystem | null>; append(organizationId: string, aiId: string, input: Pick<AiEvent, 'eventType' | 'sourceType' | 'source' | 'summary' | 'occurredAt' | 'evidenceHash'>): Promise<AiEvent | null>; timeline(organizationId: string, aiId: string): Promise<AiEvent[]>; close(): Promise<void> }
const digest = (value: string) => createHash('sha256').update(value).digest('hex');
function makeEvent(aiId: string, input: Pick<AiEvent, 'eventType' | 'sourceType' | 'source' | 'summary' | 'occurredAt' | 'evidenceHash'>, previousHash: string | null): AiEvent {
 const event = { id: nanoid(21), aiId, ...input, recordedAt: new Date().toISOString(), previousHash };
 return { ...event, eventHash: digest(JSON.stringify(event)) };
}
export function createAiStore(url?: string): AiStore { return url ? new PgAiStore(postgres(url, { prepare: false })) : new MemoryAiStore(); }
class MemoryAiStore implements AiStore {
 private systems = new Map<string, AiSystem>(); private events = new Map<string, AiEvent[]>();
 async register(organizationId: string, input: Pick<AiSystem, 'name' | 'purpose' | 'owner' | 'provider' | 'model'>) { const system = { id: nanoid(21), organizationId, ...input, createdAt: new Date().toISOString() }; this.systems.set(system.id, system); return structuredClone(system); }
 async get(organizationId: string, id: string) { const system = this.systems.get(id); return system?.organizationId === organizationId ? structuredClone(system) : null; }
 async append(organizationId: string, aiId: string, input: Pick<AiEvent, 'eventType' | 'sourceType' | 'source' | 'summary' | 'occurredAt' | 'evidenceHash'>) { if (!await this.get(organizationId, aiId)) return null; const items = this.events.get(aiId) ?? []; const event = makeEvent(aiId, input, items.at(-1)?.eventHash ?? null); items.push(event); this.events.set(aiId, items); return structuredClone(event); }
 async timeline(organizationId: string, aiId: string) { if (!await this.get(organizationId, aiId)) return []; return structuredClone(this.events.get(aiId) ?? []).sort((a,b) => a.occurredAt.localeCompare(b.occurredAt) || a.id.localeCompare(b.id)); }
 async close() { this.systems.clear(); this.events.clear(); }
}
interface SystemRow { id: string; organization_id: string; name: string; purpose: string; owner: string | null; provider: string | null; model: string | null; created_at: Date }
interface EventRow { id: string; ai_id: string; event_type: AiEventType; source_type: SourceType; source: string; summary: string; occurred_at: Date; recorded_at: Date; evidence_hash: string; previous_hash: string | null; event_hash: string }
const systemFromRow = (r: SystemRow): AiSystem => ({ id: r.id, organizationId: r.organization_id, name: r.name, purpose: r.purpose, owner: r.owner, provider: r.provider, model: r.model, createdAt: r.created_at.toISOString() });
const eventFromRow = (r: EventRow): AiEvent => ({ id:r.id, aiId:r.ai_id, eventType:r.event_type, sourceType:r.source_type, source:r.source, summary:r.summary, occurredAt:r.occurred_at.toISOString(), recordedAt:r.recorded_at.toISOString(), evidenceHash:r.evidence_hash, previousHash:r.previous_hash, eventHash:r.event_hash });
class PgAiStore implements AiStore {
 constructor(private sql: postgres.Sql) {}
 async register(organizationId: string, input: Pick<AiSystem, 'name' | 'purpose' | 'owner' | 'provider' | 'model'>) { const rows = await this.sql<SystemRow[]>`INSERT INTO ai_systems(id, organization_id, name, purpose, owner, provider, model) VALUES (${nanoid(21)}, ${organizationId}, ${input.name}, ${input.purpose}, ${input.owner}, ${input.provider}, ${input.model}) RETURNING *`; if (!rows[0]) throw new Error("AI_REGISTRATION_FAILED"); return systemFromRow(rows[0]); }
 async get(organizationId: string, id: string) { const rows = await this.sql<SystemRow[]>`SELECT * FROM ai_systems WHERE organization_id=${organizationId} AND id=${id}`; return rows[0] ? systemFromRow(rows[0]) : null; }
 async append(organizationId: string, aiId: string, input: Pick<AiEvent, 'eventType' | 'sourceType' | 'source' | 'summary' | 'occurredAt' | 'evidenceHash'>) {
  return this.sql.begin(async tx => {
   const systems = await tx`SELECT id FROM ai_systems WHERE organization_id=${organizationId} AND id=${aiId} FOR UPDATE`; if (!systems.length) return null;
   const prior = await tx<{event_hash:string}[]>`SELECT event_hash FROM ai_events WHERE organization_id=${organizationId} AND ai_id=${aiId} ORDER BY sequence DESC LIMIT 1`;
   const event = makeEvent(aiId, input, prior[0]?.event_hash ?? null);
   const rows = await tx<EventRow[]>`INSERT INTO ai_events(id, organization_id, ai_id, event_type, source_type, source, summary, occurred_at, recorded_at, evidence_hash, previous_hash, event_hash) VALUES (${event.id}, ${organizationId}, ${aiId}, ${event.eventType}, ${event.sourceType}, ${event.source}, ${event.summary}, ${event.occurredAt}, ${event.recordedAt}, ${event.evidenceHash}, ${event.previousHash}, ${event.eventHash}) RETURNING *`; if (!rows[0]) throw new Error("AI_EVENT_INSERT_FAILED"); return eventFromRow(rows[0]);
  });
 }
 async timeline(organizationId: string, aiId: string) { const rows = await this.sql<EventRow[]>`SELECT * FROM ai_events WHERE organization_id=${organizationId} AND ai_id=${aiId} ORDER BY occurred_at ASC, id ASC LIMIT 1000`; return rows.map(eventFromRow); }
 async close() { await this.sql.end({ timeout: 5 }); }
}
