import postgres from 'postgres';
import { randomUUID } from 'node:crypto';
export type BoundaryEffect='ALLOW'|'FLAG'|'REQUIRE_HUMAN'|'BLOCK';
export interface Boundary {id:string;organizationId:string;aiId:string;name:string;version:number;actionType:string;effect:BoundaryEffect;maxNumericValue:number|null;unit:string|null;enabled:boolean;createdAt:string}
export interface ActionProposal {actionType:string;numericValue:number|null;unit:string|null}
export interface BoundaryEvaluation {decision:BoundaryEffect;reason:string;boundary:Boundary|null;riskSignals:string[];failClosed:boolean}
export interface BoundaryStore {create(org:string,input:Omit<Boundary,'id'|'organizationId'|'createdAt'>):Promise<Boundary>;evaluate(org:string,aiId:string,proposal:ActionProposal):Promise<BoundaryEvaluation>;close():Promise<void>}
function evaluateOne(boundaries:Boundary[],proposal:ActionProposal):BoundaryEvaluation {
 const matches=boundaries.filter(b=>b.enabled&&b.actionType===proposal.actionType).sort((a,b)=>b.version-a.version);
 if(!matches.length)return {decision:'REQUIRE_HUMAN',reason:'No active boundary exists for this action type; execution is held for human review.',boundary:null,riskSignals:['boundary_missing'],failClosed:true};
 const b=matches[0]!;
 if(b.maxNumericValue!==null){
  if(proposal.numericValue===null)return {decision:'REQUIRE_HUMAN',reason:'The boundary requires a numeric value but the proposed action did not provide one.',boundary:b,riskSignals:['required_action_value_missing'],failClosed:true};
  if(b.unit&&proposal.unit!==b.unit)return {decision:'REQUIRE_HUMAN',reason:'The proposed action unit does not match the configured boundary unit.',boundary:b,riskSignals:['boundary_unit_mismatch'],failClosed:true};
  if(proposal.numericValue>b.maxNumericValue)return {decision:b.effect,reason:'Proposed numeric value exceeds the active configured boundary.',boundary:b,riskSignals:['configured_boundary_exceeded'],failClosed:b.effect!=='ALLOW'};
 }
 return {decision:'ALLOW',reason:'The proposed action is within the active configured boundary.',boundary:b,riskSignals:[],failClosed:false};
}
export function createBoundaryStore(url?:string):BoundaryStore{return url?new PgBoundaryStore(postgres(url,{prepare:false})):new MemoryBoundaryStore();}
class MemoryBoundaryStore implements BoundaryStore {private rows:Boundary[]=[];async create(org:string,input:Omit<Boundary,'id'|'organizationId'|'createdAt'>){const b={id:randomUUID(),organizationId:org,...input,createdAt:new Date().toISOString()};this.rows.push(b);return structuredClone(b)}async evaluate(org:string,aiId:string,p:ActionProposal){return evaluateOne(this.rows.filter(b=>b.organizationId===org&&b.aiId===aiId),p)}async close(){this.rows=[]}}
class PgBoundaryStore implements BoundaryStore {
 constructor(private sql:postgres.Sql){}
 async create(org:string,input:Omit<Boundary,'id'|'organizationId'|'createdAt'>){const rows=await this.sql<any[]>('INSERT INTO action_boundaries(id,organization_id,ai_identity_id,name,version,action_type,effect,max_numeric_value,unit,enabled) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *',[randomUUID(),org,input.aiId,input.name,input.version,input.actionType,input.effect,input.maxNumericValue,input.unit,input.enabled]);if(!rows[0])throw new Error('BOUNDARY_CREATE_FAILED');return map(rows[0])}
 async evaluate(org:string,aiId:string,p:ActionProposal){const rows=await this.sql<any[]>('SELECT * FROM action_boundaries WHERE organization_id=$1 AND ai_identity_id=$2 AND action_type=$3 AND enabled=true ORDER BY version DESC',[org,aiId,p.actionType]);return evaluateOne(rows.map(map),p)}
 async close(){await this.sql.end({timeout:5})}
}
const map=(r:any):Boundary=>({id:r.id,organizationId:r.organization_id,aiId:r.ai_identity_id,name:r.name,version:Number(r.version),actionType:r.action_type,effect:r.effect,maxNumericValue:r.max_numeric_value===null?null:Number(r.max_numeric_value),unit:r.unit,enabled:r.enabled,createdAt:r.created_at.toISOString()});
