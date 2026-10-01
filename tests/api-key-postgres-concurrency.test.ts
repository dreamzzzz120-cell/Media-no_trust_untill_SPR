import postgres from 'postgres';
import { describe, expect, it } from 'vitest';
import { createStore } from '../src/db.js';
import { randomUUID } from 'node:crypto';

const url=process.env.DATABASE_URL;

describe.skipIf(!url)('PostgreSQL API-key lifecycle concurrency attacks',()=>{
  it('allows only one concurrent rotation and invalidates the old secret immediately',async()=>{
    const admin=postgres(url!,{prepare:false});
    const org=randomUUID();
    await admin`INSERT INTO organizations(id,name) VALUES(${org},'API key race test')`;
    await admin.end({timeout:5});
    const store=createStore(url);
    try{
      const old=await store.createApiKey(org,'old','organization_admin');
      expect(await store.authenticateApiKey(old.key)).not.toBeNull();
      const attempts=await Promise.all(Array.from({length:12},(_,i)=>store.rotateApiKey(org,old.id,'replacement-'+i,'organization_admin')));
      const winners=attempts.filter(Boolean);
      expect(winners).toHaveLength(1);
      expect(await store.authenticateApiKey(old.key)).toBeNull();
      expect(await store.authenticateApiKey(winners[0]!.key)).toMatchObject({organizationId:org,role:'organization_admin'});
      const replay=await Promise.all(Array.from({length:8},()=>store.rotateApiKey(org,old.id,'replay','organization_admin')));
      expect(replay.every(x=>x===null)).toBe(true);
    }finally{
      await store.close();
      const cleanup=postgres(url!,{prepare:false});
      await cleanup`DELETE FROM organizations WHERE id=${org}`;
      await cleanup.end({timeout:5});
    }
  });
});
