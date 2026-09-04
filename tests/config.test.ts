import { describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config.js';

describe('configuration', () => {
  it('rejects production without a strong API key', () => {
    expect(() => loadConfig({ NODE_ENV: 'production', REQUIRE_API_KEY: 'true', API_KEY: 'short' })).toThrow();
  });
  it('rejects production API-key bypass', () => {
    expect(() => loadConfig({ NODE_ENV: 'production', REQUIRE_API_KEY: 'false' })).toThrow();
  });
  it('accepts a valid production configuration', () => {
    const c = loadConfig({ NODE_ENV: 'production', REQUIRE_API_KEY: 'true', API_KEY: 'a'.repeat(40) });
    expect(c.REQUIRE_API_KEY).toBe(true);
  });
});
