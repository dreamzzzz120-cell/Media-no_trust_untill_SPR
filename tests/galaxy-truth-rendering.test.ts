import{describe,it,expect}from'vitest';import{readFileSync}from'node:fs';
const app=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const html=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
const model=readFileSync(new URL('../src/constellation.ts',import.meta.url),'utf8');
describe('Galaxy truth-rendering release gate',()=>{
 it('renders only tenant-scoped persisted projections',()=>{expect(app).toContain('/v1/customer/constellation?limit=250');expect(app).toContain('/v1/customer/dashboard?limit=250');expect(app).not.toMatch(/mock|demoData|fakeData/i)});
 it('never converts missing stars into a positive state',()=>{expect(app).toContain('UNKNOWN is not treated as safe or empty');expect(app).toContain("coverage?.state||'UNKNOWN'");expect(model).toContain("No persisted constellation evidence existed by this timestamp.")});
 it('keeps relationship wording neutral across evidence states',()=>{expect(html).toContain('persisted relationship records');expect(html).toContain('persisted relationship');expect(html).not.toContain('observed paths')});
 it('requires established evidence for wormholes and major changes',()=>{expect(model).toContain("WORMHOLE_REQUIRES_OBSERVED_EVIDENCE");expect(model).toContain("CHANGE_REQUIRES_OBSERVED_EVIDENCE")});
 it('never renders black holes as verified positives',()=>{expect(model).toContain("VISIBILITY_GAP_REQUIRES_LIMITED_EVIDENCE_STATE")});
 it('draws graph objects only from returned entity relationship and event arrays',()=>{expect(app).toContain('p.entities');expect(app).toContain('p.relationships');expect(app).toContain('p.events');expect(app).toContain("if(!a||!b)continue")});
 it('does not invent tenant identity',()=>{expect(app).toContain('The Sun is the authenticated tenant context. Constellation does not invent an organization name')});
});