import type { EvidenceObservation, MediaKind, ProvenanceResult } from '../domain/media.js';

export interface SignalProvider {
  name: string;
  analyze(input: { path: string; mime: string; kind: MediaKind; provenance: ProvenanceResult }): Promise<EvidenceObservation[]>;
}

const AI_SOURCE_TYPES = new Set([
  'http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia',
  'http://cv.iptc.org/newscodes/digitalsourcetype/compositedWithTrainedAlgorithmicMedia',
  'http://c2pa.org/digitalsourcetype/trainedAlgorithmicMedia',
]);

function collectActions(value: unknown, out: Array<Record<string, unknown>> = []): Array<Record<string, unknown>> {
  if (!value || typeof value !== 'object') return out;
  if (Array.isArray(value)) { for (const item of value) collectActions(item, out); return out; }
  const object = value as Record<string, unknown>;
  if (Array.isArray(object.actions)) for (const action of object.actions) if (action && typeof action === 'object') out.push(action as Record<string, unknown>);
  for (const child of Object.values(object)) collectActions(child, out);
  return out;
}

export const baselineProvider: SignalProvider = {
  name: 'spr-baseline',
  async analyze({ mime, kind, provenance }) {
    const observations: EvidenceObservation[] = [
      { source: 'spr-baseline', signal: 'file_type', result: 'positive', confidence: 1, details: `${kind}:${mime}` },
      { source: 'spr-baseline', signal: 'c2pa_provenance', result: provenance.status === 'verified' ? 'positive' : provenance.status === 'absent' ? 'negative' : 'inconclusive', confidence: provenance.status === 'verified' ? 0.99 : undefined, details: provenance.status },
    ];
    const actions = collectActions(provenance.manifestStore);
    const aiActions = actions.filter((a) => typeof a.digitalSourceType === 'string' && AI_SOURCE_TYPES.has(a.digitalSourceType));
    if (provenance.trusted && aiActions.length > 0) {
      observations.push({ source: 'c2pa', signal: 'synthetic_media_provenance', result: 'positive', confidence: 0.99, details: `C2PA reports ${aiActions.length} AI/ML-origin action(s)` });
    }
    return observations;
  },
};

export function resolveEvidence(provenance: ProvenanceResult, observations: EvidenceObservation[]) {
  const synthetic = observations.some((o) => o.signal.includes('synthetic') && o.result === 'positive');
  const human = observations.some((o) => o.signal.includes('capture') && o.result === 'positive');
  const conflict = observations.some((o) => o.result === 'inconclusive' && /conflict/i.test(o.details ?? ''));
  const manipulation = observations.some((o) => /manipulation|deepfake|tamper/i.test(o.signal) && o.result === 'positive');
  return { synthetic, human, conflict, manipulation, provenanceVerified: provenance.status === 'verified' };
}
