import{describe,it,expect}from'vitest';import{classify,retryDelay,signature,defaultDeliveryPolicy}from'../src/webhook-delivery.js';
describe('production webhook delivery contract',()=>{
 it('uses bounded exponential backoff',()=>{expect(retryDelay(1,defaultDeliveryPolicy,()=>.5)).toBe(1000);expect(retryDelay(2,defaultDeliveryPolicy,()=>.5)).toBe(2000);expect(retryDelay(99,defaultDeliveryPolicy,()=>.5)).toBe(defaultDeliveryPolicy.maxDelayMs)});
 it('delivers only 2xx and retries transient failures',()=>{expect(classify(1,200)).toBe('DELIVERED');expect(classify(1,429)).toBe('RETRY');expect(classify(1,503)).toBe('RETRY');expect(classify(1,null)).toBe('RETRY')});
 it('dead-letters permanent client errors and exhausted retries',()=>{expect(classify(1,400)).toBe('DEAD');expect(classify(1,401)).toBe('DEAD');expect(classify(defaultDeliveryPolicy.maxAttempts,503)).toBe('DEAD')});
 it('treats timeout-like 408 and conflict/retry hints as transient',()=>{expect(classify(1,408)).toBe('RETRY');expect(classify(1,409)).toBe('RETRY');expect(classify(1,425)).toBe('RETRY')});
 it('signs delivery id timestamp and exact body and identifies rotation key',()=>{const a=signature('x'.repeat(32),'key-2026-09','00000000-0000-4000-8000-000000000001','2026-09-30T00:00:00.000Z','{"a":1}');const b=signature('x'.repeat(32),'key-2026-09','00000000-0000-4000-8000-000000000002','2026-09-30T00:00:00.000Z','{"a":1}');expect(a.keyId).toBe('key-2026-09');expect(a.value).toMatch(/^[a-f0-9]{64}$/);expect(a.value).not.toBe(b.value)});
});
