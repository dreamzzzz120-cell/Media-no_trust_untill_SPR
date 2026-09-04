export type MediaKind = 'image' | 'video';
export type VerificationState = 'pending' | 'verified' | 'failed';

export interface MediaAsset {
  id: string;
  sha256: string;
  mime: string;
  kind: MediaKind;
  sizeBytes: number;
  originalFilename: string;
  createdAt: string;
}

export interface ProvenanceResult {
  status: 'verified' | 'present_untrusted' | 'absent' | 'error';
  embedded: boolean;
  trusted: boolean;
  activeManifest?: unknown;
  manifestStore?: unknown;
  errors: string[];
}

export interface VerificationRecord {
  asset: MediaAsset;
  provenance: ProvenanceResult;
  observations: EvidenceObservation[];
  verdict: MediaVerdict;
  distribution: DistributionAction;
  limitations: string[];
}

export interface EvidenceObservation {
  source: string;
  signal: string;
  result: 'positive' | 'negative' | 'inconclusive' | 'unavailable';
  confidence?: number;
  details?: string;
}

export type MediaVerdict =
  | 'AI_VERIFIED'
  | 'HUMAN_ORIGIN_VERIFIED'
  | 'UNVERIFIED'
  | 'REVIEW'
  | 'BLOCK';

export type DistributionAction = 'ALLOW' | 'LABEL' | 'REVIEW' | 'BLOCK';
