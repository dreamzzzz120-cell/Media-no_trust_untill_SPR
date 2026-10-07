import{describe,it,expect}from'vitest';import{readFileSync}from'node:fs';
const server=readFileSync(new URL('../src/server.ts',import.meta.url),'utf8');
const privacy=readFileSync(new URL('../src/privacy-worker.ts',import.meta.url),'utf8');
const webhook=readFileSync(new URL('../src/webhook-worker.ts',import.meta.url),'utf8');
const migrate=readFileSync(new URL('../src/migrate.ts',import.meta.url),'utf8');
const roles=readFileSync(new URL('../src/database-role.ts',import.meta.url),'utf8');
describe('database role separation release gate',()=>{
 it('forces API runtime through constellation_api_runtime',()=>{expect(server).toContain("databaseUrlForRole(config.DATABASE_URL,'constellation_api_runtime')");expect(roles).toContain("role:'constellation_api_runtime'|'constellation_worker_runtime'")});
 it('forces standalone workers through constellation_worker_runtime',()=>{for(const s of [privacy,webhook]){expect(s).toContain("WORKER_DATABASE_URL??process.env.DATABASE_URL");expect(s).toContain("databaseUrlForRole(base,'constellation_worker_runtime')")}});
 it('keeps migrations on the unmodified administrative DATABASE_URL',()=>{expect(migrate).toContain("process.env.DATABASE_URL");expect(migrate).not.toContain("databaseUrlForRole")});
 it('separates embedded worker and API role selection',()=>{expect(server).toContain("workerDbRole:'constellation_worker_runtime'");expect(server).toContain("apiDbRole:'constellation_api_runtime'")});
});
