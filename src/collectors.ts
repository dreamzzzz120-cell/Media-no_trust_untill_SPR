import { createHash } from 'node:crypto';
export type CollectorHealth='HEALTHY'|'DEGRADED'|'DOWN'|'UNKNOWN';
export type Coverage='OBSERVED'|'PARTIAL'|'UNOBSERVED'|'UNKNOWN';
export interface CollectorObservation<T=unknown>{collectorKey:string;collectorVersion:string;subjectType:string;subjectId:string;health:CollectorHealth;coverage:Coverage;observedAt:string;collectedAt:string;payload:T|null;evidenceHash:string;limitations:string[]}
export interface Collector<T=unknown>{key:string;version:string;collect(subject:{type:string;id:string}):Promise<CollectorObservation<T>>}
export const evidenceDigest=(value:unknown)=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
export function unknownObservation<T=unknown>(key:string,version:string,subject:{type:string;id:string},reason:string,now=()=>new Date()):CollectorObservation<T>{
 const at=now().toISOString();
 return{collectorKey:key,collectorVersion:version,subjectType:subject.type,subjectId:subject.id,health:'UNKNOWN',coverage:'UNKNOWN',observedAt:at,collectedAt:at,payload:null,evidenceHash:evidenceDigest({key,version,subject,at,reason}),limitations:[reason]};
}
export async function runCollector<T>(collector:Collector<T>,subject:{type:string;id:string}):Promise<CollectorObservation<T>>{
 try{
  const o=await collector.collect(subject);
  if(o.collectorKey!==collector.key||o.collectorVersion!==collector.version)throw Error('COLLECTOR_IDENTITY_MISMATCH');
  if(o.subjectType!==subject.type||o.subjectId!==subject.id)throw Error('COLLECTOR_SUBJECT_MISMATCH');
  if(!['HEALTHY','DEGRADED','DOWN','UNKNOWN'].includes(o.health))throw Error('INVALID_COLLECTOR_HEALTH');
  if(!['OBSERVED','PARTIAL','UNOBSERVED','UNKNOWN'].includes(o.coverage))throw Error('INVALID_COLLECTOR_COVERAGE');
  if(!Array.isArray(o.limitations)||o.limitations.length>100||o.limitations.some(x=>typeof x!=='string'||x.length>1000))throw Error('INVALID_COLLECTOR_LIMITATIONS');
  const observed=Date.parse(o.observedAt),collected=Date.parse(o.collectedAt),future=Date.now()+5*60*1000;
  if(!Number.isFinite(observed)||!Number.isFinite(collected)||collected<observed||observed>future||collected>future)throw Error('INVALID_COLLECTOR_CHRONOLOGY');
  const encoded=JSON.stringify(o.payload);
  if(encoded!==undefined&&Buffer.byteLength(encoded,'utf8')>2_000_000)throw Error('COLLECTOR_PAYLOAD_TOO_LARGE');
  if(!/^[a-f0-9]{64}$/.test(o.evidenceHash))throw Error('INVALID_EVIDENCE_HASH');
  const expected=evidenceDigest({collectorKey:o.collectorKey,collectorVersion:o.collectorVersion,subjectType:o.subjectType,subjectId:o.subjectId,health:o.health,coverage:o.coverage,observedAt:o.observedAt,payload:o.payload,limitations:o.limitations});
  if(o.evidenceHash!==expected)throw Error('COLLECTOR_EVIDENCE_DIGEST_MISMATCH');
  return o
 }catch(e){return unknownObservation<T>(collector.key,collector.version,subject,e instanceof Error?e.message:'COLLECTOR_FAILED')}
}
