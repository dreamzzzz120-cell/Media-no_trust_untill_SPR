import postgres from 'postgres';
import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
const url=process.env.DATABASE_URL;
const ROLLBACK='__AUTHZ_OBJECT_ATTACK_ROLLBACK__';

describe.skipIf(!url)('authority mission delegation approval cross-tenant IDs',()=>{
  it('blocks Galaxy A from foreign authority objects even with exact UUIDs',async()=>{
    const admin=postgres(url!,{prepare:false});
    try{
      await expect(admin.begin(async tx=>{
        const role='authority_object_probe';
        const a=randomUUID(),b=randomUUID();
        await tx.unsafe(`CREATE ROLE ${role} NOLOGIN NOSUPERUSER NOBYPASSRLS`);
        await tx.unsafe(`GRANT USAGE ON SCHEMA public TO ${role}; GRANT SELECT ON universe_authority_roots,universe_licenses,universe_missions,universe_mission_members,universe_approval_requirements,universe_approvals,universe_delegations TO ${role}`);
        await tx`INSERT INTO organizations(id,name) VALUES(${a},'Authority A'),(${b},'Authority B')`;

        async function seed(org:string,prefix:string){
          const parent=randomUUID(),child=randomUUID(),approver=randomUUID();
          for(const [id,key] of [[parent,prefix+'-parent'],[child,prefix+'-child'],[approver,prefix+'-approver']] as const)
            await tx`INSERT INTO constellation_entities(id,organization_id,identity_key,entity_type,name,evidence_state,evidence_hash,source,first_observed_at,last_observed_at,metadata) VALUES(${id},${org},${key},'AI_AGENT',${key},'OBSERVED',${'a'.repeat(64)},'authz-test',now(),now(),'{}')`;
          const root=randomUUID();
          await tx`INSERT INTO universe_authority_roots(id,organization_id,constellation_entity_id,authority_type,evidence_state,evidence_hash,source,observed_at) VALUES(${root},${org},${approver},'HUMAN','OBSERVED',${'b'.repeat(64)},'authz-test',now())`;
          const parentLicense=randomUUID(),childLicense=randomUUID();
          await tx`INSERT INTO universe_licenses(id,organization_id,subject_entity_id,authority_root_id,license_class,endorsements,scope,valid_from,valid_until,evidence_state,evidence_hash,source,observed_at) VALUES
          (${parentLicense},${org},${parent},${root},6,'[]','{}',now()-interval '1 hour',now()+interval '1 day','OBSERVED',${'c'.repeat(64)},'authz-test',now()),
          (${childLicense},${org},${child},${root},3,'[]','{}',now()-interval '1 hour',now()+interval '1 day','OBSERVED',${'d'.repeat(64)},'authz-test',now())`;
          const mission=randomUUID();
          await tx`INSERT INTO universe_missions(id,organization_id,name,purpose,authority_root_id,maximum_license_class,scope,starts_at,expires_at,evidence_state,evidence_hash,source,observed_at) VALUES(${mission},${org},'Mission','test',${root},6,'{}',now()-interval '1 hour',now()+interval '1 day','OBSERVED',${'e'.repeat(64)},'authz-test',now())`;
          await tx`INSERT INTO universe_mission_members(mission_id,organization_id,entity_id,role,evidence_hash,source,observed_at) VALUES(${mission},${org},${parent},'PARENT',${'f'.repeat(64)},'authz-test',now()),(${mission},${org},${child},'CHILD',${'1'.repeat(64)},'authz-test',now())`;
          const requirement=randomUUID(),approval=randomUUID();
          await tx`INSERT INTO universe_approval_requirements(id,organization_id,action_type,minimum_license_class,threshold,approver_kind,evidence_hash,source,observed_at) VALUES(${requirement},${org},'EXECUTE',3,'{}','HUMAN',${'2'.repeat(64)},'authz-test',now())`;
          await tx`INSERT INTO universe_approvals(id,organization_id,requirement_id,mission_id,actor_entity_id,approver_entity_id,decision,scope,valid_until,evidence_hash,source,decided_at) VALUES(${approval},${org},${requirement},${mission},${child},${approver},'APPROVED','{}',now()+interval '1 hour',${'3'.repeat(64)},'authz-test',now())`;
          const delegation=randomUUID();
          await tx`INSERT INTO universe_delegations(id,organization_id,parent_entity_id,child_entity_id,parent_license_id,child_license_id,mission_id,delegated_class,endorsements,scope,depth,expires_at,evidence_hash,source,occurred_at,observed_at) VALUES(${delegation},${org},${parent},${child},${parentLicense},${childLicense},${mission},3,'[]','{}',1,now()+interval '1 hour',${'4'.repeat(64)},'authz-test',now(),now())`;
          return{root,parentLicense,childLicense,mission,requirement,approval,delegation};
        }

        const A=await seed(a,'a'),B=await seed(b,'b');
        await tx.unsafe(`SET LOCAL ROLE ${role}`);
        await tx`SELECT set_config('app.organization_id',${a},true)`;
        const checks=[
          ['root','universe_authority_roots',B.root],
          ['license','universe_licenses',B.childLicense],
          ['mission','universe_missions',B.mission],
          ['approval requirement','universe_approval_requirements',B.requirement],
          ['approval','universe_approvals',B.approval],
          ['delegation','universe_delegations',B.delegation],
        ] as const;
        for(const [label,table,id] of checks){
          const rows=await tx.unsafe(`SELECT id FROM ${table} WHERE id=$1`,[id]);
          expect(rows,label).toHaveLength(0);
        }
        expect(await tx`SELECT id FROM universe_missions WHERE id=${A.mission}`).toHaveLength(1);
        expect(await tx`SELECT id FROM universe_approvals WHERE id=${A.approval}`).toHaveLength(1);
        expect(await tx`SELECT id FROM universe_delegations WHERE id=${A.delegation}`).toHaveLength(1);
        throw new Error(ROLLBACK);
      })).rejects.toThrow(ROLLBACK);
    }finally{await admin.end({timeout:5})}
  });
});
