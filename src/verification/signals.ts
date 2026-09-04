import type { EvidenceObservation, MediaKind, ProvenanceResult } from '../domain/media.js';

export interface SignalProvider {
  name: string;
  analyze(input: { path: string; mime: string; kind: MediaKind; provenance: ProvenanceResult }): Promise<EvidenceObservation[]>;
}

/**
 * Baseline provider deliberately reports what is knowable without an external
 * AI detector. It never labels content human merely because no AI signal exists.
 */
export const baselineProvider: SignalProvider = {
  name: 'spr-baseline',
  async analyze({ mime, kind, provenance }) {
    return [
      {
        source: 'spr-baseline',
        signal: 'file_type',
        result: 'positive',
        confidence: 1,
        details: `${kind}:${mime}`,
      },
      {
        source: 'spr-baseline',
        signal: 'c2pa_provenance',
        result: provenance.status === 'verified' ? 'positive' : provenance.status === 'absent' ? 'negative' : 'inconclusive',
        confidence: provenance.status === 'verified' ? 0.99 : undefined,
        details: provenance.status,
      },
    ];
  },
};

export function resolveEvidence(provenance: ProvenanceResult, observations: EvidenceObservation[]) {
  const synthetic = observations.some((o) => o.signal.includes('synthetic') && o.result === 'positive');
  const human = observations.some((o) => o.signal.includes('capture') && o.result === 'positive');
  const conflict = observations.some((o) => o.result === 'inconclusive' && /conflict/i.test(o.details ?? ''));
  const manipulation = observations.some((o) => /manipulation|deepfake|tamper/i.test(o.signal) && o.result === 'positive');
  return { synthetic, human, conflict, manipulation, provenanceVerified: provenance.status === 'verified' };
}
