import { resolveDistributionAction, resolveVerdict } from '../domain/verdict.js';
import type { EvidenceObservation, MediaAsset, VerificationRecord } from '../domain/media.js';
import { inspectC2pa } from '../provenance/c2pa.js';
import { baselineProvider, resolveEvidence, type SignalProvider } from './signals.js';

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
      observations.push({
        source: provider.name,
        signal: 'provider_failure',
        result: 'unavailable',
        details: error instanceof Error ? error.message.slice(0, 500) : 'provider failure',
      });
    }
  }

  const resolved = resolveEvidence(provenance, observations);
  const verdict = resolveVerdict({
    provenanceVerified: resolved.provenanceVerified,
    syntheticSignalVerified: resolved.synthetic,
    humanCaptureProvenanceVerified: resolved.human,
    conflictingEvidence: resolved.conflict,
    highRiskManipulation: resolved.manipulation,
  });
  const distribution = resolveDistributionAction(verdict, options.requireVerification);
  const limitations = [
    'No detector can establish truth with perfect certainty.',
    'Absence of AI-generation provenance is not proof of human origin.',
  ];
  if (provenance.status === 'absent') limitations.push('No supported C2PA provenance was embedded in the submitted asset.');
  if (provenance.status === 'error') limitations.push('C2PA validation could not complete for this asset.');

  return { asset, provenance, observations, verdict, distribution, limitations };
}
