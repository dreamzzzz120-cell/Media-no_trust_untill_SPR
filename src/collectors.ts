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
 try{const o=await collector.collect(subject);if(o.collectorKey!==collector.key||o.collectorVersion!==collector.version)throw Error('COLLECTOR_IDENTITY_MISMATCH');if(!/^[a-f0-9]{64}$/.test(o.evidenceHash))throw Error('INVALID_EVIDENCE_HASH');return o}catch(e){return unknownObservation<T>(collector.key,collector.version,subject,e instanceof Error?e.message:'COLLECTOR_FAILED')}
}
