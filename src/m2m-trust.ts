import { createHash, randomUUID } from 'node:crypto';
import { evaluateAuthority, type AuthorityInput, type AuthorityResult } from './authority.js';
import { executeGoverned, type ExecutionReceipt } from './execution.js';

export type M2MTrustDecision='VERIFIED'|'PARTIAL'|'UNKNOWN'|'DENIED'|'REVOKED'|'EXPIRED';

export interface M2MTrustEnvelope {
 protocol:'m2m-trust/1';
 envelopeId:string;
 issuer:{machineId:string;organizationId:string;passportId?:string|null};
 subject:{machineId:string;organizationId:string;passportId?:string|null};
 requestedAction:string;
 resource?:string|null;
 passportState:'ACTIVE'|'PARTIAL'|'UNKNOWN'|'REVOKED'|'EXPIRED';
 issuedAt:string;
 expiresAt:string;
 nonce:string;
 evidenceDigest?:string|null;
}

export interface M2MVerificationContext {
 passportVerified:boolean|null;
 signatureVerified:boolean|null;
 nonceSeen:boolean;
 authority:AuthorityInput;
}

export interface M2MDecision {
 id:string;
 decision:M2MTrustDecision;
 reasons:string[];
 envelopeDigest:string;
 authority:AuthorityResult;
 evaluatedAt:string;
}

const canonical=(v:unknown):string=>{if(v===null||typeof v==='string'||typeof v==='boolean')return JSON.stringify(v);if(typeof v==='number'){if(!Number.isFinite(v))throw Error('NON_FINITE_VALUE');return JSON.stringify(v)}if(Array.isArray(v))return '['+v.map(canonical).join(',')+']';if(typeof v==='object'){const o=v as Record<string,unknown>;return '{'+Object.keys(o).sort().map(k=>JSON.stringify(k)+':'+canonical(o[k])).join(',')+'}'}throw Error('UNSUPPORTED_VALUE')};
const digest=(v:unknown)=>createHash('sha256').update(canonical(v)).digest('hex');

export function evaluateM2MTrust(e:M2MTrustEnvelope,c:M2MVerificationContext,now=new Date().toISOString()):M2MDecision{
 const authority=evaluateAuthority({...c.authority,now}),reasons:string[]=[],unknowns:string[]=[];
 if(e.protocol!=='m2m-trust/1')reasons.push('UNSUPPORTED_PROTOCOL');
 const t=Date.parse(now),iat=Date.parse(e.issuedAt),exp=Date.parse(e.expiresAt);
 if(!Number.isFinite(t)||!Number.isFinite(iat)||!Number.isFinite(exp))reasons.push('INVALID_TIME');
 else {if(t<iat)reasons.push('NOT_YET_VALID');if(t>=exp)reasons.push('EXPIRED')}
 if(c.nonceSeen)reasons.push('REPLAY_DETECTED');
 if(!e.nonce||e.nonce.length<16)reasons.push('NONCE_INVALID');
 if(e.passportState==='REVOKED')return done('REVOKED',[...reasons,'PASSPORT_REVOKED'],authority,e,now);
 if(e.passportState==='EXPIRED')return done('EXPIRED',[...reasons,'PASSPORT_EXPIRED'],authority,e,now);
 if(e.passportState==='UNKNOWN')unknowns.push('PASSPORT_STATE_UNKNOWN');
 if(e.passportState==='PARTIAL')unknowns.push('PASSPORT_STATE_PARTIAL');
 if(c.passportVerified===false)reasons.push('PASSPORT_VERIFICATION_FAILED'); else if(c.passportVerified===null)unknowns.push('PASSPORT_VERIFICATION_NOT_ESTABLISHED');
 if(c.signatureVerified===false)reasons.push('SIGNATURE_VERIFICATION_FAILED'); else if(c.signatureVerified===null)unknowns.push('SIGNATURE_VERIFICATION_NOT_ESTABLISHED');
 if(authority.decision==='NOT_AUTHORIZED')reasons.push('AUTHORITY_DENIED');
 if(authority.decision==='UNKNOWN')unknowns.push('AUTHORITY_UNKNOWN');
 if(reasons.length)return done(reasons.includes('EXPIRED')?'EXPIRED':'DENIED',[...reasons,...unknowns],authority,e,now);
 if(unknowns.length)return done(e.passportState==='PARTIAL'?'PARTIAL':'UNKNOWN',unknowns,authority,e,now);
 return done('VERIFIED',['IDENTITY_AUTHORITY_AND_EVIDENCE_VERIFIED'],authority,e,now);
}
function done(decision:M2MTrustDecision,reasons:string[],authority:AuthorityResult,e:M2MTrustEnvelope,evaluatedAt:string):M2MDecision{return{id:randomUUID(),decision,reasons,envelopeDigest:digest(e),authority,evaluatedAt}}

export async function executeM2M(
 decision:M2MDecision,
 input:{organizationId:string;actorEntityId:string;actionType:string;targetReference?:string|null;payload:unknown;idempotencyKey?:string},
 executor:(payload:unknown)=>Promise<void>,
):Promise<ExecutionReceipt>{
 if(decision.decision!=='VERIFIED'){
   const authority:AuthorityResult=decision.decision==='DENIED'||decision.decision==='REVOKED'||decision.decision==='EXPIRED'
    ?{...decision.authority,decision:'NOT_AUTHORIZED',reasons:[...decision.authority.reasons,'M2M_TRUST_NOT_VERIFIED']}
    :{...decision.authority,decision:'UNKNOWN',reasons:[...decision.authority.reasons,'M2M_TRUST_NOT_VERIFIED']};
   return executeGoverned({...input,authority},executor);
 }
 return executeGoverned({...input,authority:decision.authority},executor);
}
