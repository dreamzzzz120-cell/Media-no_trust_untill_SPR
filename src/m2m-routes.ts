import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { Config } from './config.js';
import type { AuthorityStore } from './authority-store.js';
import type { KernelStore } from './evidence-store.js';
import { M2MStore } from './m2m-store.js';
import { type M2MTrustEnvelope } from './m2m-trust.js';
import { evaluateNetworkTrust, postReceiptToSpr, receiptDigest, sprVerifyPassport, verifyEnvelopeHmac } from './m2m-network.js';

const hex64=z.string().regex(/^[a-f0-9]{64}$/);
const machine=z.object({machineId:z.uuid(),organizationId:z.string().min(1).max(200),passportId:z.string().min(1).max(255).nullable().optional()}).strict();
const envelopeSchema=z.object({
 protocol:z.literal('m2m-trust/1'),envelopeId:z.uuid(),issuer:machine,subject:machine,
 requestedAction:z.string().trim().min(1).max(120),resource:z.string().max(1000).nullable().optional(),
 passportState:z.enum(['ACTIVE','PARTIAL','UNKNOWN','REVOKED','EXPIRED']).default('UNKNOWN'),
 issuedAt:z.iso.datetime({offset:true}),expiresAt:z.iso.datetime({offset:true}),nonce:z.string().min(16).max(256),
 evidenceDigest:hex64.nullable().optional(),
 signature:z.object({alg:z.literal('HS256'),keyId:z.string().min(1).max(120),value:hex64}).strict()
}).strict();

const handshakeSchema=z.object({envelope:envelopeSchema,missionId:z.uuid(),targetResourceId:z.uuid().nullable().optional()}).strict();
const completionSchema=z.object({
 executionOutcome:z.enum(['OBSERVED_SUCCEEDED','OBSERVED_FAILED']),
 providerEvidenceDigest:hex64,
 observedAt:z.iso.datetime({offset:true}),
 source:z.string().trim().min(1).max(200),
 details:z.record(z.string(),z.unknown()).default({})
}).strict();

const allowedRoles=new Set(['analyst','organization_admin','platform_admin','super_admin']);
function identity(req:any,reply:any):{organizationId:string;keyId:string}|null{
 const x=req.mediaAuth;
 if(!x?.organizationId){void reply.code(403).send({error:'TENANT_KEY_REQUIRED'});return null}
 if(!allowedRoles.has(x.role)){void reply.code(403).send({error:'FORBIDDEN'});return null}
 return{organizationId:x.organizationId,keyId:x.keyId};
}

export function registerM2MRoutes(app:FastifyInstance,deps:{config:Config;authorityStore:AuthorityStore;kernelStore:KernelStore;m2mStore:M2MStore}){
 app.post('/v1/m2m/handshake',async(req,reply)=>{
  const id=identity(req,reply);if(!id)return;
  if(!deps.config.SPR_M2M_BASE_URL||!deps.config.SPR_M2M_API_KEY||!deps.config.M2M_ENVELOPE_SECRET)return reply.code(503).send({error:'M2M_TRUST_NOT_CONFIGURED'});
  if(!await deps.m2mStore.ready())return reply.code(503).send({error:'M2M_STORE_UNAVAILABLE'});
  const b=handshakeSchema.parse(req.body), e=b.envelope as M2MTrustEnvelope;
  if(e.issuer.organizationId!==id.organizationId)return reply.code(403).send({error:'ISSUER_TENANT_MISMATCH'});
  if(!e.subject.passportId)return reply.code(400).send({error:'SUBJECT_PASSPORT_REQUIRED'});
  if(Date.parse(e.expiresAt)<=Date.now())return reply.code(409).send({error:'ENVELOPE_EXPIRED'});
  const signatureVerified=verifyEnvelopeHmac(e,deps.config.M2M_ENVELOPE_SECRET);
  if(signatureVerified!==true)return reply.code(401).send({error:signatureVerified===false?'INVALID_M2M_SIGNATURE':'M2M_SIGNATURE_NOT_VERIFIABLE'});
  const nonceClaimed=await deps.m2mStore.claimNonce(id.organizationId,e.issuer.machineId,e.nonce,e.expiresAt);
  if(!nonceClaimed)return reply.code(409).send({error:'M2M_REPLAY_DETECTED'});
  const [spr,authority]=await Promise.all([
    sprVerifyPassport(deps.config,e.subject.passportId),
    deps.authorityStore.check(id.organizationId,{actorEntityId:e.issuer.machineId,missionId:b.missionId,actionType:e.requestedAction,...(b.targetResourceId!==undefined?{targetResourceId:b.targetResourceId}:{})})
  ]);
  const decision=evaluateNetworkTrust(e,{spr,signatureVerified:true,nonceSeen:false,authorityResult:authority});
  if(decision.decision!=='VERIFIED')return reply.code(200).send({protocol:'m2m-trust/1',decision:decision.decision,reasons:decision.reasons,envelopeDigest:decision.envelopeDigest,authorityDecision:authority.decision,grant:null});
  const grant=await deps.m2mStore.createGrant({organizationId:id.organizationId,envelopeDigest:decision.envelopeDigest,issuerMachineId:e.issuer.machineId,subjectMachineId:e.subject.machineId,subjectPassportId:e.subject.passportId,requestedAction:e.requestedAction,authorityEvaluationId:authority.id,authorityDecision:authority.decision,trustDecision:decision.decision,expiresAt:e.expiresAt});
  return reply.code(201).send({protocol:'m2m-trust/1',decision:'VERIFIED',reasons:decision.reasons,envelopeDigest:decision.envelopeDigest,authorityDecision:authority.decision,grant:{id:grant.id,expiresAt:grant.expiresAt,status:'ALLOW_EXECUTION'}});
 });

 app.post('/v1/m2m/grants/:id/complete',async(req,reply)=>{
  const who=identity(req,reply);if(!who)return;
  if(!deps.config.SPR_M2M_BASE_URL||!deps.config.SPR_M2M_API_KEY)return reply.code(503).send({error:'SPR_M2M_NOT_CONFIGURED'});
  const grantId=z.uuid().parse((req.params as any).id),b=completionSchema.parse(req.body);
  const grant=await deps.m2mStore.grant(who.organizationId,grantId);
  if(!grant)return reply.code(404).send({error:'M2M_GRANT_NOT_FOUND'});
  if(grant.completedAt)return reply.code(409).send({error:'M2M_GRANT_ALREADY_COMPLETED'});
  if(grant.trustDecision!=='VERIFIED'||grant.authorityDecision!=='AUTHORIZED')return reply.code(409).send({error:'M2M_GRANT_NOT_EXECUTABLE'});
  if(Date.parse(grant.expiresAt)<=Date.now())return reply.code(409).send({error:'M2M_GRANT_EXPIRED'});

  const evidence=await deps.kernelStore.record(who.organizationId,{sourceType:'M2M_EXECUTION_GATEWAY',sourceName:b.source,collector:'m2m-trust-core',subjectType:'MACHINE',subjectId:grant.subjectMachineId,observationType:'M2M_EXECUTION_OUTCOME',content:{grantId,actorMachineId:grant.issuerMachineId,subjectMachineId:grant.subjectMachineId,subjectPassportId:grant.subjectPassportId,requestedAction:grant.requestedAction,executionOutcome:b.executionOutcome,providerEvidenceDigest:b.providerEvidenceDigest,details:b.details},observedAt:b.observedAt,collectedAt:new Date().toISOString(),validationState:'VERIFIED',evidenceType:'M2M_EXECUTION_RECEIPT',provenance:{grantId,envelopeDigest:grant.envelopeDigest,source:b.source,providerEvidenceDigest:b.providerEvidenceDigest}});

  const unsigned={protocol:'m2m-trust/1' as const,envelopeDigest:grant.envelopeDigest,actorMachineId:grant.issuerMachineId,subjectMachineId:grant.subjectMachineId,subjectPassportId:grant.subjectPassportId,requestedAction:grant.requestedAction,authorityDecision:grant.authorityDecision,trustDecision:grant.trustDecision,executionOutcome:b.executionOutcome,evidenceDigest:evidence.evidenceDigest,observedAt:b.observedAt};
  const finalReceipt={...unsigned,receiptDigest:receiptDigest(unsigned)};
  const sprAck=await postReceiptToSpr(deps.config,finalReceipt);
  if(!sprAck)return reply.code(502).send({error:'SPR_RECEIPT_SYNC_FAILED',grantId,evidenceId:evidence.evidenceId,receiptDigest:finalReceipt.receiptDigest});
  const completed=await deps.m2mStore.complete(who.organizationId,grantId,{executionOutcome:b.executionOutcome,evidenceDigest:evidence.evidenceDigest,receiptDigest:finalReceipt.receiptDigest,observedAt:b.observedAt,sprReceiptId:sprAck.id,sprAckDigest:sprAck.serverRecordDigest??null});
  if(!completed)return reply.code(409).send({error:'M2M_GRANT_COMPLETION_CONFLICT'});
  return reply.code(201).send({grantId,status:'COMPLETED',receipt:finalReceipt,constellationEvidenceId:evidence.evidenceId,sprReceiptId:sprAck.id,sprRecordDigest:sprAck.serverRecordDigest??null});
 });
}
