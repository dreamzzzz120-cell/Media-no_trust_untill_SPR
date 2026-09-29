import { actionAuthorityPolicy } from './action-authority-policy.js';
import { randomUUID } from 'node:crypto';

export type AuthorityDecision='AUTHORIZED'|'NOT_AUTHORIZED'|'UNKNOWN';
export interface AuthorityInput {
 actorEntityId:string; actionType:string; targetResourceId?:string|null;
 license?:{id:string;licenseClass:number;endorsements?:string[];scope?:{actionTypes?:string[];resourceIds?:string[]}|null;validFrom:string;validUntil?:string|null;evidenceHash:string}|null;
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
 const at=i.now??new Date().toISOString(), t=Date.parse(at), reasons:string[]=[], unknowns:string[]=[];
 if(!i.license||!i.mission) return {id:randomUUID(),decision:'UNKNOWN',reasons:['LICENCE_OR_MISSION_NOT_ESTABLISHED'],evaluatedAt:at};
 if(!validHash(i.license.evidenceHash)||!validHash(i.mission.evidenceHash)) return {id:randomUUID(),decision:'UNKNOWN',reasons:['AUTHORITY_EVIDENCE_NOT_ESTABLISHED'],evaluatedAt:at};
 if(i.authorityStatus==='REVOKED'||i.authorityStatus==='SUSPENDED'||i.authorityStatus==='EXPIRED') reasons.push('AUTHORITY_INACTIVE');
 if(i.freshness==='STALE'||i.freshness==='UNKNOWN') unknowns.push('AUTHORITY_FRESHNESS_NOT_ESTABLISHED');
 if(t<Date.parse(i.license.validFrom)||(i.license.validUntil&&t>=Date.parse(i.license.validUntil))) reasons.push('LICENCE_OUTSIDE_VALIDITY');
 if(t<Date.parse(i.mission.startsAt)||t>=Date.parse(i.mission.expiresAt)||i.mission.endedAt) reasons.push('MISSION_INACTIVE');
 if(i.license.licenseClass>i.mission.maxLicenseClass) reasons.push('LICENCE_EXCEEDS_MISSION');
 const policy=actionAuthorityPolicy(i.actionType);
 if(!policy) unknowns.push('ACTION_AUTHORITY_POLICY_NOT_ESTABLISHED');
 else {if(i.license.licenseClass<policy.minimumClass) reasons.push('LICENCE_CLASS_INSUFFICIENT');const e=i.license.endorsements??[];if(policy.requiredEndorsements.some(x=>!e.includes(x)))reasons.push('REQUIRED_ENDORSEMENT_MISSING')}
 if(i.license.scope?.actionTypes&&!i.license.scope.actionTypes.includes(i.actionType))reasons.push('ACTION_OUTSIDE_LICENCE_SCOPE');
 if(i.targetResourceId&&i.license.scope?.resourceIds&&!i.license.scope.resourceIds.includes(i.targetResourceId))reasons.push('RESOURCE_OUTSIDE_LICENCE_SCOPE');
 if(i.approval?.required){
   if(i.approval.decision==='DENIED') reasons.push('APPROVAL_DENIED');
   else if(i.approval.decision!=='APPROVED'||!validHash(i.approval.evidenceHash)||(i.approval.validUntil&&t>=Date.parse(i.approval.validUntil)))
     unknowns.push('APPROVAL_NOT_ESTABLISHED');
 }
 if(i.budget==='OVER_BUDGET') reasons.push('BUDGET_EXCEEDED');
 else if(i.budget==='UNKNOWN') unknowns.push('BUDGET_NOT_ESTABLISHED');
 if(i.law==='UNSUPPORTED'||i.law==='CONFLICTING') reasons.push('LAW_REQUIREMENT_NOT_SATISFIED');
 else if(i.law==='UNKNOWN'||i.law==='PARTIAL') unknowns.push('LAW_EVIDENCE_NOT_ESTABLISHED');
 if(i.authorityStatus==='UNKNOWN'||i.authorityStatus===undefined) unknowns.push('AUTHORITY_STATUS_NOT_ESTABLISHED');
 if(reasons.length) return {id:randomUUID(),decision:'NOT_AUTHORIZED',reasons:[...reasons,...unknowns],evaluatedAt:at};
 if(unknowns.length) return {id:randomUUID(),decision:'UNKNOWN',reasons:unknowns,evaluatedAt:at};
 return {id:randomUUID(),decision:'AUTHORIZED',reasons:['AUTHORITY_ESTABLISHED'],evaluatedAt:at};
}

export type ExecutionGate='ALLOW_EXECUTION'|'DENY_EXECUTION'|'HOLD_UNKNOWN';
export function executionGate(result:AuthorityResult):ExecutionGate {
 if(result.decision==='AUTHORIZED') return 'ALLOW_EXECUTION';
 if(result.decision==='NOT_AUTHORIZED') return 'DENY_EXECUTION';
 return 'HOLD_UNKNOWN';
}
