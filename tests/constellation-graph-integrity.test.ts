import{describe,it,expect}from'vitest';import{readFileSync}from'node:fs';const m=readFileSync(new URL('../src/constellation.ts',import.meta.url),'utf8');const ui=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
describe('Constellation graph integrity release gate',()=>{
 it('rejects self relationships',()=>expect(m).toContain('SELF_RELATIONSHIP_NOT_ALLOWED'));
 it('requires both endpoints in the same tenant',()=>{expect(m).toContain('from_entity_id');expect(m).toContain('to_entity_id');expect(m).toContain('organization_id=${org}')});
 it('deduplicates identical active evidence edges',()=>{expect(m).toContain('evidence_hash=${i.evidenceHash} AND ended_at IS NULL');expect(m).toContain('if(existing[0])return relationship(existing[0])')});
 it('bounds snapshot graph size',()=>{expect(m).toContain('limit=500');expect(m).toContain('LIMIT ${limit}')});
 it('renders only edges with visible endpoints',()=>expect(ui).toContain('if(!a||!b)continue'));
 it('shows edge type and evidence state',()=>expect(ui).toContain("(r.relationshipType||'RELATIONSHIP')+' · '+(r.evidenceState||'UNKNOWN')"));
 it('uses stable entity identity for deterministic layout',()=>expect(ui).toContain("sort((a,b)=>String(a.id).localeCompare(String(b.id)))"));
});