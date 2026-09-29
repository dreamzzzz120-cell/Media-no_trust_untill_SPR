import { randomUUID } from 'node:crypto';

export type AuthorityDecision='AUTHORIZED'|'NOT_AUTHORIZED'|'UNKNOWN';
export interface AuthorityInput {
 actorEntityId:string; actionType:string; targetResourceId?:string|null;
 license?:{id:string;licenseClass:number;validFrom:string;validUntil?:string|null;evidenceHash:string}|null;
 mission?:{id:string;maxLicenseClass:number;startsAt:string;expiresAt:string;endedAt?:string|null;evidenceHash:string}|null;
 approval?:{required:boolean;decision?:'APPROVED'|'DENIED'|'UNKNOWN';validUntil?:string|null;evidenceHash?:string|null}|null;
 authorityStatus?:'ACTIVE'|'EXPIRED'|'REVOKED'|'SUSPENDED'|'UNKNOWN';
 freshness?:'CURRENT'|'STALE'|'UNKNOWN';
 budget?:'WITHIN_BUDGET'|'OVER_BUDGET'|'UNKNOWN'|null;
 law?:'SUPPORTED'|'PARTIAL'|'UNSUPPORTED'|'UNKNOWN'|'CONFLICTING'|'NOT_APPLICABLE'|null;
 now?:string;
}
export interface AuthorityResult {id:string;decision:AuthorityDecision;reasons:string[];evaluatedAt:string}

const validHash=(x?:string|null)=>!!x&&/^[a-f0-9]{64}$/.test(x);
export function evaluateAuthority(i:AuthorityInput):AuthorityResult {
 const at=i.now??new Date().toISOString(), t=Date.parse(at), reasons:string[]=[];
 if(!i.license||!i.mission) return {id:randomUUID(),decision:'UNKNOWN',reasons:['LICENCE_OR_MISSION_NOT_ESTABLISHED'],evaluatedAt:at};
 if(!validHash(i.license.evidenceHash)||!validHash(i.mission.evidenceHash)) return {id:randomUUID(),decision:'UNKNOWN',reasons:['AUTHORITY_EVIDENCE_NOT_ESTABLISHED'],evaluatedAt:at};
 if(i.authorityStatus==='REVOKED'||i.authorityStatus==='SUSPENDED'||i.authorityStatus==='EXPIRED') reasons.push('AUTHORITY_INACTIVE');
 if(i.freshness==='STALE'||i.freshness==='UNKNOWN') return {id:randomUUID(),decision:'UNKNOWN',reasons:['AUTHORITY_FRESHNESS_NOT_ESTABLISHED'],evaluatedAt:at};
 if(t<Date.parse(i.license.validFrom)||(i.license.validUntil&&t>=Date.parse(i.license.validUntil))) reasons.push('LICENCE_OUTSIDE_VALIDITY');
 if(t<Date.parse(i.mission.startsAt)||t>=Date.parse(i.mission.expiresAt)||i.mission.endedAt) reasons.push('MISSION_INACTIVE');
 if(i.license.licenseClass>i.mission.maxLicenseClass) reasons.push('LICENCE_EXCEEDS_MISSION');
 if(i.approval?.required){
   if(i.approval.decision==='DENIED') reasons.push('APPROVAL_DENIED');
   else if(i.approval.decision!=='APPROVED'||!validHash(i.approval.evidenceHash)||(i.approval.validUntil&&t>=Date.parse(i.approval.validUntil)))
     return {id:randomUUID(),decision:'UNKNOWN',reasons:['APPROVAL_NOT_ESTABLISHED'],evaluatedAt:at};
 }
 if(i.budget==='OVER_BUDGET') reasons.push('BUDGET_EXCEEDED');
 else if(i.budget==='UNKNOWN') return {id:randomUUID(),decision:'UNKNOWN',reasons:['BUDGET_NOT_ESTABLISHED'],evaluatedAt:at};
 if(i.law==='UNSUPPORTED'||i.law==='CONFLICTING') reasons.push('LAW_REQUIREMENT_NOT_SATISFIED');
 else if(i.law==='UNKNOWN'||i.law==='PARTIAL') return {id:randomUUID(),decision:'UNKNOWN',reasons:['LAW_EVIDENCE_NOT_ESTABLISHED'],evaluatedAt:at};
 if(i.authorityStatus==='UNKNOWN'||i.authorityStatus===undefined) return {id:randomUUID(),decision:'UNKNOWN',reasons:['AUTHORITY_STATUS_NOT_ESTABLISHED'],evaluatedAt:at};
 return {id:randomUUID(),decision:reasons.length?'NOT_AUTHORIZED':'AUTHORIZED',reasons:reasons.length?reasons:['AUTHORITY_ESTABLISHED'],evaluatedAt:at};
}

export type ExecutionGate='ALLOW_EXECUTION'|'DENY_EXECUTION'|'HOLD_UNKNOWN';
export function executionGate(result:AuthorityResult):ExecutionGate {
 if(result.decision==='AUTHORIZED') return 'ALLOW_EXECUTION';
 if(result.decision==='NOT_AUTHORIZED') return 'DENY_EXECUTION';
 return 'HOLD_UNKNOWN';
}
