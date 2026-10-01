import postgres from 'postgres';
import {describe,expect,it} from 'vitest';
import {randomUUID} from 'node:crypto';
import {verifyRestoredDatabase} from '../src/restore-verifier.js';
const url=process.env.DATABASE_URL;

describe.skipIf(!url)('restore verifier PostgreSQL gate',()=>{
  it('requires a restricted runtime role and reports empty evidence as UNKNOWN',async()=>{
    const admin=postgres(url!,{prepare:false});
    const role='restore_probe_'+randomUUID().replaceAll('-','').slice(0,12);
    const password='RestoreProbe_'+randomUUID();
    try{
      await admin.unsafe(`CREATE ROLE ${role} LOGIN PASSWORD '${password.replaceAll("'","''")}' NOSUPERUSER NOBYPASSRLS`);
      await admin.unsafe(`GRANT CONNECT ON DATABASE ${JSON.stringify(new URL(url!).pathname.slice(1)).replaceAll('"','')} TO ${role}`).catch(()=>undefined);
      await admin.unsafe(`GRANT USAGE ON SCHEMA public TO ${role}; GRANT SELECT ON schema_migrations,media_verification_history TO ${role}`);
      const u=new URL(url!);u.username=role;u.password=password;
      const proof=await verifyRestoredDatabase(u.toString());
      expect(proof.migrationsVerified).toBe(true);
      expect(proof.tenantIsolationVerified).toBe(true);
      expect(proof.checkedEvidence).toBe(0);
      expect(proof.evidenceHashesVerified).toBe(false);
      expect(proof.limitations.join(' ')).toContain('UNKNOWN');
    }finally{
      await admin.unsafe(`REVOKE ALL PRIVILEGES ON schema_migrations,media_verification_history FROM ${role}`).catch(()=>undefined);
      await admin.unsafe(`REVOKE USAGE ON SCHEMA public FROM ${role}`).catch(()=>undefined);
      await admin.unsafe(`DROP ROLE IF EXISTS ${role}`).catch(()=>undefined);
      await admin.end({timeout:5});
    }
  });
});
