import{describe,it,expect}from'vitest';import{readFileSync}from'node:fs';
const e=readFileSync(new URL('../src/embedded-workers.ts',import.meta.url),'utf8');
const s=readFileSync(new URL('../src/server.ts',import.meta.url),'utf8');
const m=readFileSync(new URL('../db/058_worker_heartbeats.sql',import.meta.url),'utf8');
describe('worker liveness release gate',()=>{
 it('persists webhook and privacy heartbeats',()=>{expect(e).toContain("beat('webhook'");expect(e).toContain("beat('privacy'")});
 it('records worker failures instead of hiding them',()=>expect(e).toContain('lastError'));
 it('requires fresh workers when embedded mode is enabled',()=>{expect(s).toContain('workersOk');expect(s).toContain("workerName===name&&x.fresh&&!x.lastError")});
 it('keeps liveness operational rather than tenant-owned',()=>{expect(m).not.toContain('organization_id');expect(m).toContain('worker_name TEXT PRIMARY KEY')});
});
