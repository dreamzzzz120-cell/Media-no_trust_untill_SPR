import postgres from 'postgres';
import { randomUUID } from 'node:crypto';
import { withTenant } from './db-tenant.js';
import { evaluateAuthority, type AuthorityInput } from './authority.js';

export type RegistryState='OBSERVED'|'VERIFIED'|'DECLARED'|'UNKNOWN'|'STALE'|'CONFLICTING'|'UNAVAILABLE';
export type RegistryKind='REPOSITORY'|'AI_AGENT'|'MCP_SERVER'|'PACKAGE'|'SERVICE'|'MODEL'|'OTHER';
export interface RegistryItem {
 registryId:string; kind:RegistryKind; name:string; repositoryUrl:string|null; version:string|null;
 evidenceState:RegistryState; evidenceHash:string; observedAt:string; provenance:Record<string,unknown>;
 capabilities:string[]; dependencies:string[];
}
const hash=(x:string)=>/^[a-f0-9]{64}$/.test(x);
const clean=(x:string)=>x.trim().slice(0,200);

function sortValue(v:unknown):unknown {
 if(Array.isArray(v)) return v.map(sortValue);
 if(v&&typeof v==='object') return Object.fromEntries(Object.entries(v as Record<string,unknown>).sort(([a],[b])=>a.localeCompare(b)).map(([k,x])=>[k,sortValue(x)]));
 return v;
}
export function canonicalRegistryJson(v:unknown):string { return JSON.stringify(sortValue(v)); }

export function assertRegistryItem(i:RegistryItem){
 if(!/^[A-Za-z0-9][A-Za-z0-9._:/@-]{0,199}$/.test(i.registryId)) throw Error('INVALID_REGISTRY_ID');
 if(!hash(i.evidenceHash)) throw Error('INVALID_REGISTRY_EVIDENCE_HASH');
 if(!Number.isFinite(Date.parse(i.observedAt))) throw Error('INVALID_REGISTRY_OBSERVED_AT');
 const forbidden=canonicalRegistryJson(i).toLowerCase();
 if(/"trusted"|"safe"|"approved"|"authorized"|"compliant"|"trustscore"/.test(forbidden)) throw Error('REGISTRY_CANNOT_PORT_AUTHORITY');
}

export function simulateRegistryAuthority(input:AuthorityInput){
 return {...evaluateAuthority(input),simulation:true,sideEffects:false as const,note:'Simulation only. SPR evidence never grants Constellation authority.'};
}

export class GalaxyRegistryStore{
 private sql:postgres.Sql;
 constructor(url:string){this.sql=postgres(url,{prepare:false})}

 async acceptIngress(org:string,signatureHash:string,expiresAt:string){
  return withTenant(this.sql,org,async tx=>{
   await tx`DELETE FROM galaxy_registry_ingress_replay WHERE organization_id=${org} AND expires_at < now()`;
   const rows=await tx<any[]>`INSERT INTO galaxy_registry_ingress_replay(id,organization_id,signature_hash,expires_at)
     VALUES(${randomUUID()},${org},${signatureHash},${expiresAt})
     ON CONFLICT(organization_id,signature_hash) DO NOTHING RETURNING id`;
   return rows.length===1;
  });
 }

 async ingest(org:string,i:RegistryItem){
  assertRegistryItem(i);
  return withTenant(this.sql,org,async tx=>{
   const rows=await tx<any[]>`INSERT INTO galaxy_registry_catalog(id,organization_id,spr_registry_id,kind,name,repository_url,version,evidence_state,evidence_hash,observed_at,provenance,capabilities,dependencies)
   VALUES(${randomUUID()},${org},${i.registryId},${i.kind},${clean(i.name)},${i.repositoryUrl},${i.version},${i.evidenceState},${i.evidenceHash},${i.observedAt},${JSON.stringify(i.provenance)},${i.capabilities},${i.dependencies})
   ON CONFLICT(organization_id,spr_registry_id,evidence_hash) DO UPDATE SET observed_at=GREATEST(galaxy_registry_catalog.observed_at,EXCLUDED.observed_at)
   RETURNING *`;
   return rows[0];
  });
 }

 async search(org:string,q:string,limit=50){
  return withTenant(this.sql,org,tx=>tx<any[]>`SELECT * FROM galaxy_registry_catalog
   WHERE organization_id=${org}
   AND (name ILIKE ${'%'+q+'%'} OR spr_registry_id ILIKE ${'%'+q+'%'} OR COALESCE(repository_url,'') ILIKE ${'%'+q+'%'})
   ORDER BY observed_at DESC,id LIMIT ${limit}`);
 }

 async importStar(org:string,registryId:string){
  return withTenant(this.sql,org,async tx=>{
   const src=(await tx<any[]>`SELECT * FROM galaxy_registry_catalog WHERE organization_id=${org} AND spr_registry_id=${registryId} ORDER BY observed_at DESC LIMIT 1`)[0];
   if(!src)return null;
   const identity='spr:'+registryId;
   const rows=await tx<any[]>`INSERT INTO constellation_entities(id,organization_id,identity_key,entity_type,name,evidence_state,evidence_hash,source,first_observed_at,last_observed_at,metadata)
   VALUES(${randomUUID()},${org},${identity},'ARTIFACT',${src.name},'UNKNOWN',${src.evidence_hash},'SPR_REGISTRY',${src.observed_at},${src.observed_at},${JSON.stringify({sprRegistryId:registryId,discoveryState:'DISCOVERED',authorityState:'UNAUTHORIZED',registryEvidenceState:src.evidence_state,repositoryUrl:src.repository_url})})
   ON CONFLICT(organization_id,entity_type,source,identity_key)
   DO UPDATE SET last_observed_at=GREATEST(constellation_entities.last_observed_at,EXCLUDED.last_observed_at)
   RETURNING *`;
   const star=rows[0];
   await tx`INSERT INTO galaxy_registry_imports(id,organization_id,spr_registry_id,entity_id,authority_state)
    VALUES(${randomUUID()},${org},${registryId},${star.id},'UNAUTHORIZED')
    ON CONFLICT(organization_id,spr_registry_id) DO NOTHING`;
   return star;
  });
 }

 async relationships(org:string,entityId:string,asOf:string,limit=250){
  return withTenant(this.sql,org,async tx=>{
   const root=(await tx<any[]>`SELECT id,identity_key,entity_type,name,evidence_state,evidence_hash FROM constellation_entities
    WHERE organization_id=${org} AND id=${entityId}::uuid AND known_at<=${asOf} LIMIT 1`)[0];
   if(!root)return null;
   const rels=await tx<any[]>`SELECT * FROM constellation_relationships
    WHERE organization_id=${org} AND known_at<=${asOf} AND observed_at<=${asOf}
    AND (ended_at IS NULL OR ended_at>${asOf})
    AND (from_entity_id=${entityId}::uuid OR to_entity_id=${entityId}::uuid)
    ORDER BY observed_at DESC LIMIT ${limit}`;
   const ids=[...new Set<string>(rels.flatMap(r=>[r.from_entity_id,r.to_entity_id]).filter((x:string)=>x!==entityId))];
   const neighbors=ids.length?await tx<any[]>`SELECT id,identity_key,entity_type,name,evidence_state,evidence_hash FROM constellation_entities
    WHERE organization_id=${org} AND id=ANY(${ids}::uuid[]) LIMIT ${limit}`:[];
   return{root,relationships:rels,neighbors,coverage:'OBSERVED_ONLY',note:'Only persisted evidence-backed tenant relationships are shown. Missing edges remain UNKNOWN.'};
  });
 }

 async blastRadius(org:string,registryId:string,asOf:string,limit=250){
  return withTenant(this.sql,org,async tx=>{
   const imported=await tx<any[]>`SELECT entity_id FROM galaxy_registry_imports WHERE organization_id=${org} AND spr_registry_id=${registryId} LIMIT 1`;
   if(!imported[0])return{registryId,affectedEntities:[],affectedRelationships:[],coverage:'UNKNOWN'};
   const id=imported[0].entity_id;
   const rels=await tx<any[]>`SELECT * FROM constellation_relationships
    WHERE organization_id=${org} AND known_at<=${asOf} AND observed_at<=${asOf}
    AND (ended_at IS NULL OR ended_at>${asOf})
    AND (from_entity_id=${id} OR to_entity_id=${id})
    ORDER BY observed_at DESC LIMIT ${limit}`;
   const ids=[...new Set<string>(rels.flatMap(r=>[r.from_entity_id,r.to_entity_id]))];
   const ents=ids.length?await tx<any[]>`SELECT id,identity_key,entity_type,name,evidence_state,evidence_hash FROM constellation_entities
    WHERE organization_id=${org} AND id=ANY(${ids}::uuid[]) LIMIT ${limit}`:[];
   return{registryId,rootEntityId:id,affectedEntities:ents,affectedRelationships:rels,coverage:'OBSERVED_ONLY',note:'Blast radius contains persisted tenant relationships only; missing relationships remain UNKNOWN.'};
  });
 }

 async close(){await this.sql.end({timeout:5})}
}
