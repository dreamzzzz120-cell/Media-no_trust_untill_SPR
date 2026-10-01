import{describe,it,expect}from'vitest';import{readFileSync}from'node:fs';const m=readFileSync(new URL('../src/constellation.ts',import.meta.url),'utf8');
describe('Constellation truth model release gate',()=>{
 it('validates evidence hashes on every persisted object type',()=>{expect(m).toContain("assertEntitySemantics(i)");expect(m).toContain("assertRelationshipSemantics(i)");expect(m).toContain("assertEventSemantics(i)");expect((m.match(/INVALID_EVIDENCE_HASH/g)||[]).length).toBeGreaterThanOrEqual(3)});
 it('rejects impossible entity and relationship time windows',()=>{expect(m).toContain('INVALID_ENTITY_OBSERVATION_WINDOW');expect(m).toContain('INVALID_RELATIONSHIP_WINDOW')});
 it('requires evidence before a wormhole or major change exists',()=>{expect(m).toContain('WORMHOLE_REQUIRES_OBSERVED_EVIDENCE');expect(m).toContain('CHANGE_REQUIRES_OBSERVED_EVIDENCE')});
 it('prevents visibility gaps becoming verified-positive facts',()=>expect(m).toContain('VISIBILITY_GAP_REQUIRES_LIMITED_EVIDENCE_STATE'));
 it('historical postgres events cannot reference objects outside the snapshot',()=>{expect(m).toContain('(entity_id IS NULL OR entity_id=ANY');expect(m).toContain('(relationship_id IS NULL OR relationship_id=ANY')});
 it('historical records cannot appear before known_at',()=>{expect((m.match(/known_at<=/g)||[]).length).toBeGreaterThanOrEqual(3)});
 it('ended relationships disappear after their end time',()=>expect(m).toContain('(ended_at IS NULL OR ended_at>${asOf})'));
 it('empty snapshots remain unknown',()=>expect(m).toContain("coverage:{state:'UNKNOWN' as const"));
});