import{describe,it,expect}from'vitest';import{redactSensitive,containsSensitive}from'../src/redaction.js';import{readFileSync}from'node:fs';
describe('secret and export privacy release gate',()=>{
 it('redacts secret-keyed fields recursively',()=>expect(redactSensitive({token:'abc',nested:{apiKey:'xyz'},ok:'v'})).toEqual({token:'[REDACTED]',nested:{apiKey:'[REDACTED]'},ok:'v'}));
 it('redacts bearer and common provider credentials embedded in strings',()=>{const x=redactSensitive({note:'Bearer abcdefghijklmnopqrstuvwxyz sk_live_abcdefghijklmnop ghp_abcdefghijklmnopqrstuvwxyz'});expect(containsSensitive(x)).toBe(false);expect(JSON.stringify(x)).toContain('[REDACTED]')});
 it('redacts privacy export artifacts before hashing/persistence',()=>expect(readFileSync(new URL('../src/privacy-execution.ts',import.meta.url),'utf8')).toContain('return redactSensitive({organizationId:row.organization_id'));
 it('redacts report facts before report hashing/persistence',()=>expect(readFileSync(new URL('../src/customer-projections.ts',import.meta.url),'utf8')).toContain('facts:redactSensitive(d.evidence)'));
});
