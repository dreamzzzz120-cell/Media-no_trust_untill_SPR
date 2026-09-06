import { describe, expect, it } from 'vitest';
import { buildTrustVector, calculateConfidence, calculateTrustScore, decide } from '../src/trust.js';

describe('Media Trust Engine', () => {
  it('scores verified disclosed assisted media conservatively', () => {
    const vector = buildTrustVector({ provenanceVerified: true, aiStatus: 'AI_ASSISTED', disclosureConsistent: true, observations: [{ source: 'test', signal: 'source_quality', result: 'positive', confidence: 0.95 }] });
    expect(vector.provenance).toBe(96);
    expect(vector.humanContribution).toBe(85);
    expect(calculateTrustScore(vector)).toBeGreaterThan(70);
  });

  it('forces review on disclosure mismatch', () => {
    expect(decide(90, { provenanceVerified: true, disclosureConsistent: false, highRisk: false, conflicting: false })).toBe('REVIEW');
  });

  it('suppresses high-risk manipulation', () => {
    expect(decide(95, { provenanceVerified: true, disclosureConsistent: true, highRisk: true, conflicting: false })).toBe('SUPPRESS');
  });

  it('never treats missing evidence as perfect confidence', () => {
    expect(calculateConfidence([])).toBe(0.35);
  });
});
