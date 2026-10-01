import { describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config.js';

const production = {
  NODE_ENV: 'production',
  REQUIRE_API_KEY: 'true',
  API_KEY: 'a'.repeat(40),
  DATABASE_URL: 'postgres://user:pass@example.com/db',
  MALWARE_SCAN_URL: 'https://scanner.example.test/scan',
  MALWARE_SCAN_TOKEN: 't'.repeat(40),
  MAX_UPLOAD_BYTES: '268435456',
};

describe('configuration', () => {
  it('rejects production without a strong API key', () => {
    expect(() => loadConfig({ ...production, API_KEY: 'short' })).toThrow();
  });
  it('rejects production API-key bypass', () => {
    expect(() => loadConfig({ ...production, REQUIRE_API_KEY: 'false' })).toThrow();
  });
  it('requires deletion of quarantined source media in production', () => {
    expect(() => loadConfig({ ...production, DELETE_SOURCE_AFTER_VERIFICATION: 'false' })).toThrow();
  });
  it('rejects production without malware scanning', () => {
    expect(() => loadConfig({ ...production, MALWARE_SCAN_URL: undefined })).toThrow();
  });
  it('keeps API live but worker readiness degraded when a separate worker credential is absent', () => {
    const c = loadConfig({ ...production, RUN_EMBEDDED_WORKERS: 'true' });
    expect(c.RUN_EMBEDDED_WORKERS).toBe(true);
    expect(c.WORKER_DATABASE_URL).toBeUndefined();
  });
  it('rejects reusing the API database credential for embedded workers', () => {
    expect(() => loadConfig({ ...production, RUN_EMBEDDED_WORKERS: 'true', WORKER_DATABASE_URL: production.DATABASE_URL })).toThrow('WORKER_DATABASE_URL must be distinct');
  });
  it('accepts a complete production configuration', () => {
    const c = loadConfig(production);
    expect(c.REQUIRE_API_KEY).toBe(true);
    expect(c.DATABASE_URL).toContain('postgres://');
  });
});
