export type EvidenceState = 'OBSERVED' | 'VERIFIED' | 'DECLARED' | 'UNKNOWN' | 'STALE' | 'CONFLICTING' | 'UNAVAILABLE';
export type ExternalOutcome = 'CONFIRMED' | 'FAILED' | 'ABSENT' | 'UNREACHABLE';
export interface Reconciliation { state: EvidenceState; alert: 'CRITICAL' | null; explanation: string }
/** Only a connector which independently authenticates its source may pass a trusted outcome. */
export function reconcileAction(claimedAction: string, outcome: ExternalOutcome, trustedSource: boolean): Reconciliation {
 if (!trustedSource) return { state: 'DECLARED', alert: null, explanation: 'External outcome was not authenticated; the AI claim remains unverified.' };
 if (outcome === 'UNREACHABLE') return { state: 'UNAVAILABLE', alert: null, explanation: 'The authoritative system could not be reached; completion is unverified.' };
 if (outcome === 'CONFIRMED') return { state: 'VERIFIED', alert: null, explanation: `The authoritative system confirmed the reported action: ${claimedAction}` };
 return { state: 'CONFLICTING', alert: 'CRITICAL', explanation: `The AI reported ${claimedAction}; the authoritative system reported ${outcome.toLowerCase()}.` };
}
