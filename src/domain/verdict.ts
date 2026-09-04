export type MediaVerdict =
  | 'AI_VERIFIED'
  | 'HUMAN_ORIGIN_VERIFIED'
  | 'UNVERIFIED'
  | 'REVIEW'
  | 'BLOCK';

export type DistributionAction = 'ALLOW' | 'LABEL' | 'REVIEW' | 'BLOCK';

export interface EvidenceObservation {
  source: string;
  signal: string;
  result: 'positive' | 'negative' | 'inconclusive' | 'unavailable';
  confidence?: number;
  details?: string;
}

export interface VerificationInput {
  provenanceVerified: boolean;
  syntheticSignalVerified: boolean;
  humanCaptureProvenanceVerified: boolean;
  conflictingEvidence: boolean;
  highRiskManipulation: boolean;
}

/**
 * Conservative evidence resolver. Absence of synthetic evidence is never
 * interpreted as proof of human origin.
 */
export function resolveVerdict(input: VerificationInput): MediaVerdict {
  if (input.highRiskManipulation) return 'BLOCK';
  if (input.conflictingEvidence) return 'REVIEW';
  if (input.syntheticSignalVerified && input.provenanceVerified) {
    return 'AI_VERIFIED';
  }
  if (input.humanCaptureProvenanceVerified && input.provenanceVerified) {
    return 'HUMAN_ORIGIN_VERIFIED';
  }
  return 'UNVERIFIED';
}

export function resolveDistributionAction(
  verdict: MediaVerdict,
  requireVerification = true,
): DistributionAction {
  if (verdict === 'BLOCK') return 'BLOCK';
  if (verdict === 'REVIEW') return 'REVIEW';
  if (verdict === 'AI_VERIFIED') return 'LABEL';
  if (verdict === 'HUMAN_ORIGIN_VERIFIED') return 'ALLOW';
  return requireVerification ? 'BLOCK' : 'LABEL';
}
