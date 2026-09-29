import postgres from 'postgres';
import { randomUUID } from 'node:crypto';

export type ObserverType = 'CONNECTOR'|'GATEWAY'|'AUDIT_LOG'|'SCANNER'|'PROVIDER'|'HUMAN'|'OTHER';
export type ObserverHealth = 'HEALTHY'|'DEGRADED'|'UNAVAILABLE'|'UNKNOWN';
export interface Observer { id:string; organizationId:string; name:string; observerType:ObserverType; version:string|null; collectionMethod:string; authorityScope:string; signingIdentity:string|null; healthState:ObserverHealth; lastVerifiedAt:string|null; createdAt:string }
export interface EvidenceTrace { eventId:string; evidenceHash:string; sourceType:string; capturedAt:string; observer:Observer|null; sourceLocator:string|null; collectionMethod:string|null; observedAt:string|null; verificationNote:string|null; limitation:string|null }
export interface ObserverStore {
 register(org:string,input:Omit<Observer,'id'|'organizationId'|'createdAt'>):Promise<Observer>;
 get(org:string,id:string):Promise<Observer|null>;
 trace(org:string,eventId:string):Promise<EvidenceTrace|null>;
 close():Promise<void>;
}
export function createObserverStore(url?:string):ObserverStore { return url ? new PgObserverStore(postgres(url,{prepare:false})) : new MemoryObserverStore(); }
class MemoryObserverStore implements ObserverStore {
 private observers=new Map<string,Observer>(); private traces=new Map<string,EvidenceTrace>();
 async register(organizationId:string,input:Omit<Observer,'id'|'organizationId'|'createdAt'>){const o={id:randomUUID(),organizationId,...input,createdAt:new Date().toISOString()};this.observers.set(o.id,o);return structuredClone(o);}
 async get(org:string,id:string){const o=this.observers.get(id);return o?.organizationId===org?structuredClone(o):null;}
 async trace(_org:string,eventId:string){return structuredClone(this.traces.get(eventId)??null);}
 async close(){this.observers.clear();this.traces.clear();}
}
type ObserverRow={id:string;organization_id:string;name:string;observer_type:ObserverType;version:string|null;collection_method:string;authority_scope:string;signing_identity:string|null;health_state:ObserverHealth;last_verified_at:Date|null;created_at:Date};
const fromRow=(r:ObserverRow):Observer=>({id:r.id,organizationId:r.organization_id,name:r.name,observerType:r.observer_type,version:r.version,collectionMethod:r.collection_method,authorityScope:r.authority_scope,signingIdentity:r.signing_identity,healthState:r.health_state,lastVerifiedAt:r.last_verified_at?.toISOString()??null,createdAt:r.created_at.toISOString()});
class PgObserverStore implements ObserverStore {
 constructor(private sql:postgres.Sql){}
 async register(org:string,input:Omit<Observer,'id'|'organizationId'|'createdAt'>){const rows=await this.sql<ObserverRow[]>`INSERT INTO observer_registry(id,organization_id,name,observer_type,version,collection_method,authority_scope,signing_identity,health_state,last_verified_at) VALUES (${randomUUID()},${org},${input.name},${input.observerType},${input.version},${input.collectionMethod},${input.authorityScope},${input.signingIdentity},${input.healthState},${input.lastVerifiedAt}) RETURNING *`;if(!rows[0])throw new Error('OBSERVER_REGISTRATION_FAILED');return fromRow(rows[0]);}
 async get(org:string,id:string){const rows=await this.sql<ObserverRow[]>`SELECT * FROM observer_registry WHERE organization_id=${org} AND id=${id}`;return rows[0]?fromRow(rows[0]):null;}
 async trace(org:string,eventId:string){const rows=await this.sql<any[]>`SELECT l.flight_record_id,l.cryptographic_hash,l.source_type,l.captured_at,l.source_locator,l.collection_method,l.observed_at,l.verification_note,o.id AS observer_id,o.organization_id AS observer_org,o.name AS observer_name,o.observer_type,o.version,o.collection_method AS observer_collection_method,o.authority_scope,o.signing_identity,o.health_state,o.last_verified_at,o.created_at AS observer_created_at FROM evidence_ledger l LEFT JOIN observer_registry o ON o.id=l.observer_id AND o.organization_id=l.organization_id WHERE l.organization_id=${org} AND l.flight_record_id=${eventId} ORDER BY l.captured_at DESC LIMIT 1`;const r=rows[0];if(!r)return null;const observer=r.observer_id?fromRow({id:r.observer_id,organization_id:r.observer_org,name:r.observer_name,observer_type:r.observer_type,version:r.version,collection_method:r.observer_collection_method,authority_scope:r.authority_scope,signing_identity:r.signing_identity,health_state:r.health_state,last_verified_at:r.last_verified_at,created_at:r.observer_created_at}):null;return {eventId:r.flight_record_id,evidenceHash:r.cryptographic_hash,sourceType:r.source_type,capturedAt:r.captured_at.toISOString(),observer,sourceLocator:r.source_locator,collectionMethod:r.collection_method,observedAt:r.observed_at?.toISOString()??null,verificationNote:r.verification_note,limitation:observer?null:'No registered observer is linked to this evidence record; provenance is incomplete.'};}
 async close(){await this.sql.end({timeout:5});}
}
