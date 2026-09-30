import type{AuthorityStore,AuthorityCheck}from'./authority-store.js';import{executeGoverned,type ExecutionReceipt,type ExternalExecutionReceipt}from'./execution.js';import{actionFingerprint,type IdempotencyStore}from'./idempotency-store.js';
export interface GuardedAction extends AuthorityCheck{organizationId:string;targetReference?:string|null;payload:unknown;idempotencyKey?:string}
export type GuardedResult={status:'EXECUTED';receipt:ExecutionReceipt}|{status:'REPLAY';receiptId:string}|{status:'IN_PROGRESS'}|{status:'CONFLICT'};
export async function runGuardedAction(store:AuthorityStore,action:GuardedAction,executor:(payload:unknown)=>Promise<ExternalExecutionReceipt>):Promise<ExecutionReceipt>{
 const authority=await store.check(action.organizationId,{actorEntityId:action.actorEntityId,missionId:action.missionId,actionType:action.actionType,...(action.targetResourceId!==undefined?{targetResourceId:action.targetResourceId}:{})});
 return executeGoverned({organizationId:action.organizationId,actorEntityId:action.actorEntityId,actionType:action.actionType,targetReference:action.targetReference??null,payload:action.payload,authority,...(action.idempotencyKey!==undefined?{idempotencyKey:action.idempotencyKey}:{})},executor);
}
export async function runIdempotentGuardedAction(authorityStore:AuthorityStore,idem:IdempotencyStore,action:GuardedAction&{idempotencyKey:string},executor:(payload:unknown)=>Promise<ExternalExecutionReceipt>):Promise<GuardedResult>{
 const fingerprint=actionFingerprint({actorEntityId:action.actorEntityId,missionId:action.missionId,actionType:action.actionType,targetResourceId:action.targetResourceId??null,targetReference:action.targetReference??null,payload:action.payload});
 const claim=await idem.claim(action.organizationId,action.idempotencyKey,fingerprint);
 if(claim.status==='REPLAY')return{status:'REPLAY',receiptId:claim.receiptId};
 if(claim.status==='CONFLICT')return{status:'CONFLICT'};
 if(claim.status==='IN_PROGRESS')return{status:'IN_PROGRESS'};
 const receipt=await runGuardedAction(authorityStore,action,executor);
 if(!await idem.complete(action.organizationId,action.idempotencyKey,fingerprint,receipt.id))throw Error('IDEMPOTENCY_COMPLETION_FAILED');
 return{status:'EXECUTED',receipt};
}
