import type{AuthorityStore,AuthorityCheck}from'./authority-store.js';import{executeGoverned,type ExecutionReceipt}from'./execution.js';
export interface GuardedAction extends AuthorityCheck{organizationId:string;targetReference?:string|null;payload:unknown}
export async function runGuardedAction(store:AuthorityStore,action:GuardedAction,executor:(payload:unknown)=>Promise<void>):Promise<ExecutionReceipt>{
 const authority=await store.check(action.organizationId,{actorEntityId:action.actorEntityId,missionId:action.missionId,actionType:action.actionType,...(action.targetResourceId!==undefined?{targetResourceId:action.targetResourceId}:{})});
 return executeGoverned({organizationId:action.organizationId,actorEntityId:action.actorEntityId,actionType:action.actionType,targetReference:action.targetReference??null,payload:action.payload,authority},executor);
}
