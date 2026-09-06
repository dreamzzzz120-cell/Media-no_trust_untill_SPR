import { describe, expect, it } from 'vitest';
import { createStore } from '../src/db.js';

describe('API key authentication', () => {
  it('stores only hashed keys and returns the scoped identity', async () => {
    const store = createStore(undefined);
    const created = await store.createApiKey('org-test', 'test', 'creator');
    expect(created.key).toMatch(/^mp_/);
    expect(await store.authenticateApiKey(created.key)).toEqual({ keyId: created.id, organizationId: 'org-test', role: 'creator' });
    expect(await store.authenticateApiKey('mp_invalid')).toBeNull();
    await store.close();
  });
});
