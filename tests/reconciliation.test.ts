import { expect, it } from 'vitest';
import { reconcileAction } from '../src/reconciliation.js';
it('does not promote an unauthenticated claim', () => { expect(reconcileAction('refund completed', 'CONFIRMED', false).state).toBe('DECLARED'); });
it('holds an unreachable source as unavailable', () => { expect(reconcileAction('refund completed', 'UNREACHABLE', true).state).toBe('UNAVAILABLE'); });
it('flags a trusted contradictory result', () => { expect(reconcileAction('refund completed', 'FAILED', true)).toMatchObject({ state: 'CONFLICTING', alert: 'CRITICAL' }); });
it('confirms only a trusted result', () => { expect(reconcileAction('refund completed', 'CONFIRMED', true).state).toBe('VERIFIED'); });
