import { createHmac, timingSafeEqual, createHash } from 'node:crypto';
import type { Config } from './config.js';
import { digestM2MEnvelope, evaluateM2MTrust, type M2MTrustEnvelope, type M2MDecision } from './m2m-trust.js';

export interface SprPassportResult {
  protocol:'m2m-trust/1'; passportId:string; machineId:string; passportState:'ACTIVE'|'PARTIAL'|'UNKNOWN'|'REVOKED'|'EXPIRED';
  passportVerified:boolean; evidenceDigest:string|null; observedAt:string|null; source:'SPR'; tenantScoped:true;
}

const canonical=(v:unknown):string=>{if(v===null||typeof v==='string'||typeof v==='boolean')return JSON.stringify(v);if(typeof v==='number'){if(!Number.isFinite(v))throw Error('NON_FINITE_VALUE');return JSON.stringify(v)}if(Array.isArray(v))return '['+v.map(canonical).join(',')+']';if(typeof v==='object'){const o=v as Record<string,unknown>;return '{'+Object.keys(o).sort().map(k=>JSON.stringify(k)+':'+canonical(o[k])).join(',')+'}'}throw Error('UNSUPPORTED_VALUE')};
export const receiptDigest=(v:unknown)=>createHash('sha256').update(canonical(v)).digest('hex');

export function verifyEnvelopeHmac(envelope:M2MTrustEnvelope,secret:string|undefined):boolean|null{
 if(!secret||!envelope.signature||envelope.signature.alg!=='HS256')return null;
 const expected=createHmac('sha256',secret).update(digestM2MEnvelope(envelope)).digest('hex');
 const supplied=envelope.signature.value;
 if(!/^[a-f0-9]{64}$/.test(supplied))return false;
 const a=Buffer.from(expected,'hex'),b=Buffer.from(supplied,'hex');
 return a.length===b.length&&timingSafeEqual(a,b);
}

export async function sprVerifyPassport(config:Config,passportId:string):Promise<SprPassportResult|null>{
 if(!config.SPR_M2M_BASE_URL||!config.SPR_M2M_API_KEY)return null;
 const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),5000);
 try{
  const r=await fetch(config.SPR_M2M_BASE_URL.replace(/\/$/,'')+'/api/agent/v1/m2m/passports/'+encodeURIComponent(passportId)+'/verify',{headers:{'x-api-key':config.SPR_M2M_API_KEY,'accept':'application/json'},signal:controller.signal});
  if(!r.ok)return null;return await r.json() as SprPassportResult;
 }finally{clearTimeout(timer)}
}

export async function postReceiptToSpr(config:Config,receipt:unknown):Promise<{id:string;receiptDigest:string;serverRecordDigest?:string}|null>{
 if(!config.SPR_M2M_BASE_URL||!config.SPR_M2M_API_KEY)return null;
 const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),5000);
 try{
  const r=await fetch(config.SPR_M2M_BASE_URL.replace(/\/$/,'')+'/api/agent/v1/m2m/receipts',{method:'POST',headers:{'x-api-key':config.SPR_M2M_API_KEY,'content-type':'application/json','accept':'application/json'},body:JSON.stringify(receipt),signal:controller.signal});
  if(!r.ok)return null;return await r.json() as any;
 }finally{clearTimeout(timer)}
}

export function bindSprState(envelope:M2MTrustEnvelope,spr:SprPassportResult):M2MTrustEnvelope{
 return{...envelope,passportState:spr.passportState,evidenceDigest:spr.evidenceDigest};
}

export function evaluateNetworkTrust(envelope:M2MTrustEnvelope,input:{spr:SprPassportResult|null;signatureVerified:boolean|null;nonceSeen:boolean;authorityResult:any;now?:string}):M2MDecision{
 const bound=input.spr?bindSprState(envelope,input.spr):{...envelope,passportState:'UNKNOWN' as const,evidenceDigest:null};
 return evaluateM2MTrust(bound,{passportVerified:input.spr?.passportVerified??null,signatureVerified:input.signatureVerified,nonceSeen:input.nonceSeen,authorityResult:input.authorityResult},input.now);
}
