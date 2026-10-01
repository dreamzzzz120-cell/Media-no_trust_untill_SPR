import{describe,it,expect}from'vitest';import{readFileSync}from'node:fs';
const config=readFileSync(new URL('../src/config.ts',import.meta.url),'utf8');
const server=readFileSync(new URL('../src/server.ts',import.meta.url),'utf8');
const privacy=readFileSync(new URL('../src/privacy-worker.ts',import.meta.url),'utf8');
const webhook=readFileSync(new URL('../src/webhook-worker.ts',import.meta.url),'utf8');
const migrate=readFileSync(new URL('../src/migrate.ts',import.meta.url),'utf8');
describe('database role separation release gate',()=>{
 it('keeps migration/admin URL distinct from runtime URLs',()=>{expect(config).toContain('APP_DATABASE_URL');expect(config).toContain('WORKER_DATABASE_URL');expect(server).toContain('config.APP_DATABASE_URL ?? config.DATABASE_URL');expect(privacy).toContain('process.env.WORKER_DATABASE_URL??process.env.APP_DATABASE_URL??process.env.DATABASE_URL');expect(webhook).toContain('process.env.WORKER_DATABASE_URL??process.env.APP_DATABASE_URL??process.env.DATABASE_URL');expect(migrate).toContain('DATABASE_URL')});
 it('runtime code never intentionally falls back to a privileged URL when a restricted URL exists',()=>{expect(server).toContain('const runtimeDatabaseUrl = config.APP_DATABASE_URL ?? config.DATABASE_URL');expect(server).not.toContain('createStore(config.DATABASE_URL)')});
});
