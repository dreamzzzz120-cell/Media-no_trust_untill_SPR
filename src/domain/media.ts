export type MediaKind = 'image' | 'video' | 'audio' | 'article' | 'text' | 'podcast' | 'livestream' | 'document' | 'social_post' | 'news_report' | 'advertisement';
export type VerificationState = 'pending' | 'verified' | 'failed';
export type AiStatus = 'NONE' | 'AI_ASSISTED' | 'AI_EDITED' | 'AI_GENERATED' | 'AI_SYNTHETIC_PERSON' | 'AI_SYNTHETIC_VOICE' | 'AI_DEEPFAKE' | 'UNKNOWN';
export type MediaDecision = 'TRUST' | 'PROMOTE' | 'REVIEW' | 'SUPPRESS';
export type ClaimClassification = 'SUPPORTED' | 'PARTIALLY_SUPPORTED' | 'UNSUPPORTED' | 'CONTRADICTED' | 'OPINION' | 'SATIRE' | 'UNKNOWN';
export interface MediaAsset {
  id: string; sha256: string; mime: string; kind: MediaKind; sizeBytes: number; originalFilename: string; createdAt: string;
  creatorId?: string | undefined; organizationId?: string | undefined; declaredAiUse?: AiStatus | undefined;
  perceptualHash?: string | undefined; audioFingerprint?: string | undefined; normalizedFingerprint?: string | undefined;
}
export interface ProvenanceResult {
  status: 'verified' | 'present_untrusted' | 'absent' | 'error'; embedded: boolean; trusted: boolean;
  activeManifest?: unknown; manifestStore?: unknown; issuer?: string; manifestHash?: string; errors: string[];
}
export type TrustDimension = 'provenance' | 'authenticity' | 'aiTransparency' | 'sourceQuality' | 'claimIntegrity' | 'manipulationRisk' | 'originality' | 'copyrightRisk' | 'creatorTrust' | 'spamRisk' | 'humanContribution' | 'evidenceQuality';
export interface TrustVector {
  provenance: number | null; authenticity: number | null; aiTransparency: number | null; sourceQuality: number | null;
  claimIntegrity: number | null; manipulationRisk: number | null; originality: number | null; copyrightRisk: number | null;
  creatorTrust: number | null; spamRisk: number | null; humanContribution: number | null; evidenceQuality: number | null;
}
export interface EvidenceObservation {
  id?: string | undefined; source: string; signal: string;
  result: 'positive' | 'negative' | 'inconclusive' | 'unavailable'; confidence?: number | undefined; details?: string | undefined;
  model?: { name: string; version: string } | undefined; contentHash?: string | undefined; createdAt?: string | undefined; expiresAt?: string | undefined;
}
export interface VerificationRecord {
  passportId?: string | undefined; asset: MediaAsset; provenance: ProvenanceResult; observations: EvidenceObservation[];
  trustVector: TrustVector; trustScore: number | null; confidence: number; aiStatus: AiStatus; verdict: MediaVerdict;
  decision: MediaDecision; distribution: DistributionAction; limitations: string[]; policyVersion: string; createdAt?: string | undefined;
}
export type MediaVerdict = 'AI_VERIFIED' | 'HUMAN_ORIGIN_VERIFIED' | 'UNVERIFIED' | 'REVIEW' | 'BLOCK';
export type DistributionAction = 'ALLOW' | 'LABEL' | 'REVIEW' | 'BLOCK';
