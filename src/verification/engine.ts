import { resolveDistributionAction, resolveVerdict } from '../domain/verdict.js';
import type { EvidenceObservation, MediaAsset, VerificationRecord } from '../domain/media.js';
import { inspectC2pa } from '../provenance/c2pa.js';
import { baselineProvider, resolveEvidence, type SignalProvider } from './signals.js';
import { buildTrustVector, calculateConfidence, calculateTrustScore, decide } from '../trust.js';

export async function verifyMedia(
  asset: MediaAsset,
  path: string,
  options: { verifyTrust: boolean; requireVerification: boolean; providers?: SignalProvider[] },
): Promise<VerificationRecord> {
  const provenance = await inspectC2pa(path, options.verifyTrust);
  const providers = options.providers ?? [baselineProvider];
  const observations: EvidenceObservation[] = [];

  for (const provider of providers) {
    try {
      const result = await provider.analyze({ path, mime: asset.mime, kind: asset.kind, provenance });
      observations.push(...result.map((item) => ({ ...item, source: item.source || provider.name })));
    } catch (error) {
      observations.push({ source: provider.name, signal: 'provider_failure', result: 'unavailable', details: error instanceof Error ? error.message.slice(0, 500) : 'provider failure' });
    }
  }

  const resolved = resolveEvidence(provenance, observations);
  const declared = asset.declaredAiUse ?? 'UNKNOWN';
  const detectedAi = resolved.synthetic;
  const aiStatus = detectedAi ? (declared === 'AI_SYNTHETIC_PERSON' ? declared : declared === 'AI_SYNTHETIC_VOICE' ? declared : 'AI_GENERATED') : declared;
  const disclosureConsistent = detectedAi ? declared !== 'NONE' && declared !== 'UNKNOWN' : true;
  const highRisk = resolved.manipulation;
  const vector = buildTrustVector({ provenanceVerified: resolved.provenanceVerified, aiStatus, disclosureConsistent, observations });
  const trustScore = calculateTrustScore(vector);
  const confidence = calculateConfidence(observations);
  const decision = decide(trustScore, { provenanceVerified: resolved.provenanceVerified, disclosureConsistent, highRisk, conflicting: resolved.conflict });
  const verdict = resolveVerdict({ provenanceVerified: resolved.provenanceVerified, syntheticSignalVerified: resolved.synthetic, humanCaptureProvenanceVerified: resolved.human, conflictingEvidence: resolved.conflict, highRiskManipulation: highRisk });
  const distribution = resolveDistributionAction(verdict, options.requireVerification);

  const limitations = [
    'This is an evidence-based trust assessment, not a determination of objective truth.',
    'AI detection signals are probabilistic; absence of a signal does not prove human origin.',
    'Copyright, privacy, likeness, and trademark signals are risk indicators, not legal conclusions.',
  ];
  if (provenance.status === 'absent') limitations.push('No supported C2PA provenance was embedded in the submitted asset.');
  if (provenance.status === 'error') limitations.push('C2PA validation could not complete for this asset.');
  if (detectedAi && !disclosureConsistent) limitations.push('Detected synthetic-media evidence is inconsistent with the submitted AI disclosure.');

  return {
    passportId: asset.id,
    asset,
    provenance,
    observations,
    trustVector: vector,
    trustScore,
    confidence,
    aiStatus,
    verdict,
    decision,
    distribution,
    limitations,
    policyVersion: 'media-policy-2026.09.01',
    createdAt: new Date().toISOString(),
  };
}
