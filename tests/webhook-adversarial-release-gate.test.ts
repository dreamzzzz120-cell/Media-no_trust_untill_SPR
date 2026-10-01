import{describe,it,expect}from'vitest';import{signWebhook,verifyWebhook}from'../src/webhook.js';import{verifyProviderSignature}from'../src/commerce.js';import{createHmac}from'node:crypto';
describe('webhook adversarial contract',()=>{const secret='x'.repeat(32),payload={event:'x'},now=Date.parse('2026-10-01T00:00:00Z'),ts='2026-10-01T00:00:00Z';
it('rejects forged signatures',()=>expect(verifyWebhook(secret,payload,ts,'0'.repeat(64),now)).toBe(false));
it('rejects expired timestamps',()=>expect(verifyWebhook(secret,payload,'2026-09-30T23:00:00Z',signWebhook(secret,payload,'2026-09-30T23:00:00Z'),now)).toBe(false));
it('signature binds payload so poison mutation fails',()=>{const sig=signWebhook(secret,payload,ts);expect(verifyWebhook(secret,{event:'poison'},ts,sig,now)).toBe(false)});
it('billing signatures bind exact raw bytes',()=>{const raw='{"a":1}',sig=createHmac('sha256',secret).update(raw).digest('hex');expect(verifyProviderSignature(secret,raw,sig)).toBe(true);expect(verifyProviderSignature(secret,raw+' ',sig)).toBe(false)});
});