import postgres from'postgres';import{evaluateAuthority,type AuthorityResult}from'./authority.js';
export interface AuthorityCheck{actorEntityId:string;actionType:string;missionId:string;targetResourceId?:string|null}
export interface AuthorityStore{ready():Promise<boolean>;check(org:string,input:AuthorityCheck):Promise<AuthorityResult>;close():Promise<void>}
export function createAuthorityStore(url?:string):AuthorityStore{return url?new PgAuthority(postgres(url,{prepare:false})):new UnavailableAuthority()}
class UnavailableAuthority implements AuthorityStore{async ready(){return false}async check(_o:string,i:AuthorityCheck){return evaluateAuthority({actorEntityId:i.actorEntityId,actionType:i.actionType,targetResourceId:i.targetResourceId??null,authorityStatus:'UNKNOWN',freshness:'UNKNOWN'})}async close(){}}
class PgAuthority implements AuthorityStore{
 constructor(private sql:postgres.Sql){}
 async ready(){try{await this.sql`SELECT 1 FROM universe_licenses LIMIT 0`;return true}catch{return false}}
 async check(org:string,i:AuthorityCheck):Promise<AuthorityResult>{
  const l=await this.sql<any[]>`SELECT l.* FROM universe_licenses l JOIN universe_mission_members mm ON mm.organization_id=l.organization_id AND mm.entity_id=l.subject_entity_id WHERE l.organization_id=${org} AND l.subject_entity_id=${i.actorEntityId} AND mm.mission_id=${i.missionId} ORDER BY l.valid_from DESC LIMIT 1`;
  const m=await this.sql<any[]>`SELECT * FROM universe_missions WHERE organization_id=${org} AND id=${i.missionId} LIMIT 1`;
  if(!l[0]||!m[0])return evaluateAuthority({actorEntityId:i.actorEntityId,actionType:i.actionType,targetResourceId:i.targetResourceId??null,authorityStatus:'UNKNOWN',freshness:'UNKNOWN'});
  const s=await this.sql<any[]>`SELECT status FROM universe_authority_status_events WHERE organization_id=${org} AND subject_type='LICENSE' AND subject_id=${l[0].id} ORDER BY effective_at DESC,known_at DESC LIMIT 1`;
  const f=await this.sql<any[]>`SELECT freshness_state FROM universe_authority_freshness WHERE organization_id=${org} AND subject_type='LICENSE' AND subject_id=${l[0].id} ORDER BY checked_at DESC,known_at DESC LIMIT 1`;
  return evaluateAuthority({actorEntityId:i.actorEntityId,actionType:i.actionType,targetResourceId:i.targetResourceId??null,license:{id:l[0].id,licenseClass:l[0].license_class,validFrom:new Date(l[0].valid_from).toISOString(),validUntil:l[0].valid_until?new Date(l[0].valid_until).toISOString():null,evidenceHash:l[0].evidence_hash},mission:{id:m[0].id,maxLicenseClass:m[0].maximum_license_class,startsAt:new Date(m[0].starts_at).toISOString(),expiresAt:new Date(m[0].expires_at).toISOString(),endedAt:m[0].ended_at?new Date(m[0].ended_at).toISOString():null,evidenceHash:m[0].evidence_hash},authorityStatus:s[0]?.status??'UNKNOWN',freshness:f[0]?.freshness_state??'UNKNOWN'});
 }
 async close(){await this.sql.end({timeout:5})}
}
