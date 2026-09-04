import { describe, expect, it } from 'vitest';
import { resolveDistributionAction, resolveVerdict } from '../src/domain/verdict.js';

describe('verdict engine', () => {
  it('never calls missing AI evidence human proof', () => {
    expect(resolveVerdict({ provenanceVerified: false, syntheticSignalVerified: false, humanCaptureProvenanceVerified: false, conflictingEvidence: false, highRiskManipulation: false })).toBe('UNVERIFIED');
  });
  it('accepts verified synthetic provenance as AI verified', () => {
    expect(resolveVerdict({ provenanceVerified: true, syntheticSignalVerified: true, humanCaptureProvenanceVerified: false, conflictingEvidence: false, highRiskManipulation: false })).toBe('AI_VERIFIED');
    expect(resolveDistributionAction('AI_VERIFIED')).toBe('LABEL');
  });
  it('requires provenance for human-origin verification', () => {
    expect(resolveVerdict({ provenanceVerified: false, syntheticSignalVerified: false, humanCaptureProvenanceVerified: true, conflictingEvidence: false, highRiskManipulation: false })).toBe('UNVERIFIED');
  });
  it('routes conflicts to review', () => {
    expect(resolveVerdict({ provenanceVerified: true, syntheticSignalVerified: true, humanCaptureProvenanceVerified: true, conflictingEvidence: true, highRiskManipulation: false })).toBe('REVIEW');
  });
  it('blocks high-risk manipulation', () => {
    expect(resolveVerdict({ provenanceVerified: true, syntheticSignalVerified: false, humanCaptureProvenanceVerified: false, conflictingEvidence: false, highRiskManipulation: true })).toBe('BLOCK');
    expect(resolveDistributionAction('BLOCK')).toBe('BLOCK');
  });
  it('fails closed when verification is required', () => {
    expect(resolveDistributionAction('UNVERIFIED', true)).toBe('BLOCK');
  });
});
