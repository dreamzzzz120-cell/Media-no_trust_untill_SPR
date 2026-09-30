import postgres from 'postgres';import {randomUUID} from 'node:crypto';
export type ProvenanceEdgeType='CREATED'|'DELEGATED'|'INVOKED'|'USED_TOOL'|'ACCESSED_RESOURCE'|'DERIVED_FROM'|'OTHER';
export class StarDnaStore{
 private sql:postgres.Sql;constructor(url:string){this.sql=postgres(url,{prepare:false})}
 async add(org:string,i:{parentEntityId:string;childEntityId:string;edgeType:ProvenanceEdgeType;evidenceHash:string;source:string;occurredAt:string;observedAt:string}){
  if(i.parentEntityId===i.childEntityId)throw Error('STAR_DNA_SELF_EDGE');
  if(!/^[a-f0-9]{64}$/.test(i.evidenceHash))throw Error('STAR_DNA_INVALID_EVIDENCE_HASH');
  if(Date.parse(i.observedAt)<Date.parse(i.occurredAt))throw Error('STAR_DNA_OBSERVED_BEFORE_OCCURRENCE');
  const r=await this.sql<any[]>`INSERT INTO universe_provenance_edges(id,organization_id,parent_entity_id,child_entity_id,edge_type,evidence_hash,source,occurred_at,observed_at)
   SELECT ${randomUUID()},${org},${i.parentEntityId},${i.childEntityId},${i.edgeType},${i.evidenceHash},${i.source},${i.occurredAt},${i.observedAt}
   WHERE EXISTS(SELECT 1 FROM constellation_entities WHERE organization_id=${org} AND id=${i.parentEntityId})
   AND EXISTS(SELECT 1 FROM constellation_entities WHERE organization_id=${org} AND id=${i.childEntityId}) RETURNING *`;
  return r[0]??null;
 }
 async lineage(org:string,entityId:string,asOf:string,limit=250){return this.sql<any[]>`WITH RECURSIVE dna AS (
  SELECT e.*,1 depth FROM universe_provenance_edges e WHERE e.organization_id=${org} AND e.child_entity_id=${entityId} AND e.occurred_at<=${asOf} AND e.known_at<=${asOf}
  UNION
  SELECT e.*,d.depth+1 FROM universe_provenance_edges e JOIN dna d ON e.child_entity_id=d.parent_entity_id WHERE e.organization_id=${org} AND e.occurred_at<=${asOf} AND e.known_at<=${asOf} AND d.depth<32
 ) SELECT * FROM dna ORDER BY depth,occurred_at,id LIMIT ${limit}`}
 async close(){await this.sql.end({timeout:5})}
}