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
 if(i.authorityStatus==='REVOKED'||i.authorityStatus==='SUSPENDED'||i.authorityStatus==='EXPIRED') reasons.push('AUTHORITY_INACTIVE');
 if(!Number.isFinite(t)) unknowns.push('EVALUATION_TIME_INVALID');
 if(!i.license||!i.mission){unknowns.push('LICENCE_OR_MISSION_NOT_ESTABLISHED');return {id:randomUUID(),decision:reasons.length?'NOT_AUTHORIZED':'UNKNOWN',reasons:[...reasons,...unknowns],evaluatedAt:at}}
 if(!validHash(i.license.evidenceHash)||!validHash(i.mission.evidenceHash)) unknowns.push('AUTHORITY_EVIDENCE_NOT_ESTABLISHED');
 const lv=Date.parse(i.license.validFrom),lu=i.license.validUntil?Date.parse(i.license.validUntil):null,ms=Date.parse(i.mission.startsAt),me=Date.parse(i.mission.expiresAt),ma=i.mission.endedAt?Date.parse(i.mission.endedAt):null;
 if(!Number.isFinite(lv)||(lu!==null&&!Number.isFinite(lu))||!Number.isFinite(ms)||!Number.isFinite(me)||(ma!==null&&!Number.isFinite(ma))) unknowns.push('AUTHORITY_TIME_EVIDENCE_INVALID');
 if(i.freshness==='STALE'||i.freshness==='UNKNOWN') unknowns.push('AUTHORITY_FRESHNESS_NOT_ESTABLISHED');
 if(Number.isFinite(t)&&Number.isFinite(lv)&&(lu===null||Number.isFinite(lu))&&(t<lv||(lu!==null&&t>=lu))) reasons.push('LICENCE_OUTSIDE_VALIDITY');
 if(Number.isFinite(t)&&Number.isFinite(ms)&&Number.isFinite(me)&&(ma===null||Number.isFinite(ma))&&(t<ms||t>=me||ma!==null)) reasons.push('MISSION_INACTIVE');
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
