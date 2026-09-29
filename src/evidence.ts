import{randomUUID}from'node:crypto';import{digest}from'./observation.js';
export type KernelState='SUPPORTED'|'PARTIAL'|'UNKNOWN'|'CONFLICTING'|'UNSUPPORTED';
type Row<T>={org:string;v:T};export class EvidenceKernelMemory{
 private sources=new Map<string,Row<any>>();private observations=new Map<string,Row<any>>();private evidenceRows=new Map<string,Row<any>>();private findings=new Map<string,Row<any>>();private claims=new Map<string,Row<any>>();private evaluations:Row<any>[]=[];
 source(org:string,x:any){const v={id:randomUUID(),...x};this.sources.set(v.id,{org,v});return structuredClone(v)}
 observe(org:string,x:any){if(this.sources.get(x.sourceId)?.org!==org)return null;const v={id:randomUUID(),...x,contentDigest:digest(x.content),ingestedAt:new Date().toISOString()};this.observations.set(v.id,{org,v});return structuredClone(v)}
 evidence(org:string,x:any){if(!/^[a-f0-9]{64}$/.test(x.digest))throw Error('INVALID_DIGEST');if(this.observations.get(x.observationId)?.org!==org)return null;const v={id:randomUUID(),...x};this.evidenceRows.set(v.id,{org,v});return structuredClone(v)}
 finding(org:string,x:any){if((x.evidenceIds as string[]).some(id=>this.evidenceRows.get(id)?.org!==org))return null;const v={id:randomUUID(),...x};this.findings.set(v.id,{org,v});return structuredClone(v)}
 claim(org:string,x:any){const v={id:randomUUID(),...x};this.claims.set(v.id,{org,v});return structuredClone(v)}
 evaluate(org:string,claimId:string,findingId:string|null,state:KernelState,explanation:string){if(this.claims.get(claimId)?.org!==org||(findingId&&this.findings.get(findingId)?.org!==org))return null;const v={id:randomUUID(),claimId,findingId,state,explanation,evaluatedAt:new Date().toISOString()};this.evaluations.push({org,v});return structuredClone(v)}
 lineage(org:string,claimId:string){const c=this.claims.get(claimId);if(!c||c.org!==org)return null;return{claim:structuredClone(c.v),evaluations:this.evaluations.filter(x=>x.org===org&&x.v.claimId===claimId).map(x=>structuredClone(x.v))}}
 knowledgeAt(org:string,asOf:string){const t=Date.parse(asOf);return[...this.observations.values()].filter(x=>x.org===org&&Date.parse(x.v.ingestedAt)<=t).map(x=>structuredClone(x.v))}
}