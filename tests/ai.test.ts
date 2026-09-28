import { describe, expect, it } from 'vitest';
import { createAiStore } from '../src/ai.js';
import { createHash } from 'node:crypto';

describe('AI flight recorder', () => {
 it('isolates tenants, preserves evidence links and chronological readable event data', async () => {
  const store = createAiStore();
  const ai = await store.register('tenant-a', { name: 'Agent 1', purpose: 'Customer assistance', owner: null, provider: null, model: null });
  expect(await store.get('tenant-b', ai.id)).toBeNull();
  const evidenceHash = createHash('sha256').update('source event').digest('hex');
  const input = { eventType: 'ACTION_REQUESTED' as const, sourceType: 'DECLARATION' as const, source: 'client log', summary: 'Agent requested a refund.', occurredAt: '2026-09-28T14:00:00.000Z', evidenceHash };
  expect(await store.append('tenant-b', ai.id, input)).toBeNull();
  const first = await store.append('tenant-a', ai.id, input);
  const second = await store.append('tenant-a', ai.id, { ...input, eventType: 'ACTION_FAILED', occurredAt: '2026-09-28T14:01:00.000Z', summary: 'The refund was reported failed.' });
  expect(first?.evidenceHash).toBe(evidenceHash);
  expect(second?.previousHash).toBe(first?.eventHash);
  expect((await store.integrity('tenant-a', ai.id)).state).toBe('VALID_INTERNAL_CHAIN');
  expect(await store.timeline('tenant-b', ai.id)).toEqual([]);
  expect((await store.timeline('tenant-a', ai.id)).map(e => e.summary)).toEqual(['Agent requested a refund.', 'The refund was reported failed.']);
  expect((await store.timeline('tenant-a', ai.id, first?.sequence, 1)).map(e => e.id)).toEqual([second?.id]);
  await store.close();
 });
});
