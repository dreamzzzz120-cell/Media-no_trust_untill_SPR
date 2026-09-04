import { describe, expect, it } from 'vitest';
import { actionForVerdict, defaultPolicy } from '../src/policy.js';

describe('distribution policy', () => {
  it('blocks unverified media by default', () => {
    expect(actionForVerdict('UNVERIFIED')).toBe('BLOCK');
  });
  it('labels verified AI media by default', () => {
    expect(actionForVerdict('AI_VERIFIED')).toBe('LABEL');
  });
  it('always blocks a hard block verdict', () => {
    expect(actionForVerdict('BLOCK')).toBe('BLOCK');
  });
  it('always sends conflicts to review', () => {
    expect(actionForVerdict('REVIEW')).toBe('REVIEW');
  });
  it('allows verified human-origin media', () => {
    expect(actionForVerdict('HUMAN_ORIGIN_VERIFIED')).toBe('ALLOW');
  });
  it('keeps the default policy fail-closed for unverified content', () => {
    expect(defaultPolicy.requireVerification).toBe(true);
    expect(defaultPolicy.unverifiedAction).toBe('BLOCK');
  });
});
