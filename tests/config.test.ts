import { describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config.js';

const production = {
  NODE_ENV: 'production',
  REQUIRE_API_KEY: 'true',
  API_KEY: 'a'.repeat(40),
  DATABASE_URL: 'postgres://user:pass@example.com/db',
  PERSISTENT_STORAGE_CONFIRMED: 'true',
  MALWARE_SCAN_URL: 'https://scanner.example.test/scan',
  MALWARE_SCAN_TOKEN: 't'.repeat(20),
};

describe('configuration', () => {
  it('rejects production without a strong API key', () => {
    expect(() => loadConfig({ ...production, API_KEY: 'short' })).toThrow();
  });
  it('rejects production API-key bypass', () => {
    expect(() => loadConfig({ ...production, REQUIRE_API_KEY: 'false' })).toThrow();
  });
  it('rejects production without durable storage confirmation', () => {
    expect(() => loadConfig({ ...production, PERSISTENT_STORAGE_CONFIRMED: 'false' })).toThrow();
  });
  it('rejects production without malware scanning', () => {
    expect(() => loadConfig({ ...production, MALWARE_SCAN_URL: undefined })).toThrow();
  });
  it('accepts a complete production configuration', () => {
    const c = loadConfig(production);
    expect(c.REQUIRE_API_KEY).toBe(true);
    expect(c.DATABASE_URL).toContain('postgres://');
  });
});
