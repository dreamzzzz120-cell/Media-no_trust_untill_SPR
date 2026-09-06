import type { AiStatus, EvidenceObservation, MediaDecision, TrustVector } from './domain/media.js';

const dimensions = [
  'provenance','authenticity','aiTransparency','sourceQuality','claimIntegrity','manipulationRisk',
  'originality','copyrightRisk','creatorTrust','spamRisk','humanContribution','evidenceQuality',
] as const;

export function buildTrustVector(args: {
  provenanceVerified: boolean;
  aiStatus: AiStatus;
  disclosureConsistent: boolean | null;
  observations: EvidenceObservation[];
}): TrustVector {
  const positive = (pattern: RegExp) => args.observations.filter(o => pattern.test(o.signal) && o.result === 'positive').length;
  const negative = (pattern: RegExp) => args.observations.filter(o => pattern.test(o.signal) && o.result === 'negative').length;
  const avgConfidence = args.observations.filter(o => typeof o.confidence === 'number').reduce((s,o,a,arr) => s + (o.confidence ?? 0) / arr.length, 0);
  const riskScore = (pattern: RegExp) => Math.max(0, Math.min(100, 100 - negative(pattern) * 25 - positive(pattern) * 50));
  const disclosure = args.disclosureConsistent === null ? null : args.disclosureConsistent ? 95 : 25;
  const aiTransparency = disclosure ?? (args.aiStatus === 'UNKNOWN' ? 50 : 70);
  return {
    provenance: args.provenanceVerified ? 96 : 45,
    authenticity: riskScore(/authentic|tamper/i),
    aiTransparency,
    sourceQuality: observationsScore(args.observations, /source|citation|corrobor/i, 60),
    claimIntegrity: observationsScore(args.observations, /claim|fact|evidence/i, 60),
    manipulationRisk: 100 - riskScore(/manipulation|deepfake|splice|imperson/i),
    originality: observationsScore(args.observations, /original|duplicate|reuse|derivative/i, 60),
    copyrightRisk: 100 - riskScore(/copyright|license|likeness|trademark/i),
    creatorTrust: observationsScore(args.observations, /creator|reputation|history/i, 60),
    spamRisk: 100 - riskScore(/spam|automation|near.?duplicate|engagement/i),
    humanContribution: args.aiStatus === 'NONE' ? 100 : args.aiStatus === 'AI_ASSISTED' || args.aiStatus === 'AI_EDITED' ? 85 : args.aiStatus === 'UNKNOWN' ? 50 : 20,
    evidenceQuality: Math.round(Math.max(0, Math.min(100, avgConfidence * 100 || 45))),
  };
}

function observationsScore(observations: EvidenceObservation[], pattern: RegExp, fallback: number) {
  const matching = observations.filter(o => pattern.test(o.signal) && typeof o.confidence === 'number');
  if (!matching.length) return fallback;
  const base = matching.reduce((s,o) => s + (o.result === 'positive' ? 1 : o.result === 'negative' ? 0 : 0.5) * (o.confidence ?? 0), 0);
  return Math.round(Math.max(0, Math.min(100, (base / matching.reduce((s,o) => s + (o.confidence ?? 0), 0)) * 100)));
}

export function calculateTrustScore(vector: TrustVector): number | null {
  const values = dimensions.map(d => vector[d]).filter((v): v is number => typeof v === 'number');
  return values.length ? Math.round(values.reduce((a,b) => a + b, 0) / values.length) : null;
}

export function calculateConfidence(observations: EvidenceObservation[]): number {
  const values = observations.map(o => o.confidence).filter((v): v is number => typeof v === 'number');
  return values.length ? Math.max(0, Math.min(1, values.reduce((a,b) => a+b, 0) / values.length)) : 0.35;
}

export function decide(score: number | null, args: { provenanceVerified: boolean; disclosureConsistent: boolean | null; highRisk: boolean; conflicting: boolean }): MediaDecision {
  if (args.highRisk) return 'SUPPRESS';
  if (args.conflicting || args.disclosureConsistent === false) return 'REVIEW';
  if (score !== null && args.provenanceVerified && score >= 90) return 'PROMOTE';
  if (score !== null && score >= 70) return 'TRUST';
  return 'REVIEW';
}
