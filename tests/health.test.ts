import { describe, expect, it } from 'vitest';
import { buildReadiness } from '../src/health.js';

describe('readiness', () => {
  it('fails production readiness without a database', () => {
    expect(buildReadiness(false, true).status).toBe('not_ready');
  });
  it('is ready with database', () => {
    expect(buildReadiness(true, true).status).toBe('ok');
  });
});
