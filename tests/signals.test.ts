import { describe, expect, it } from 'vitest';
import { baselineProvider } from '../src/verification/signals.js';

describe('C2PA AI signals', () => {
  it('recognizes trusted trained-algorithmic media provenance', async () => {
    const result = await baselineProvider.analyze({
      path: '/unused', mime: 'image/jpeg', kind: 'image',
      provenance: {
        status: 'verified', embedded: true, trusted: true, errors: [],
        manifestStore: { manifests: { x: { assertions: [{ data: { actions: [{ action: 'c2pa.created', digitalSourceType: 'http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia' }] } }] } } },
      },
    });
    expect(result.some((x) => x.signal === 'synthetic_media_provenance' && x.result === 'positive')).toBe(true);
  });
  it('does not emit AI proof from an untrusted manifest', async () => {
    const result = await baselineProvider.analyze({
      path: '/unused', mime: 'video/mp4', kind: 'video',
      provenance: { status: 'present_untrusted', embedded: true, trusted: false, errors: [], manifestStore: { actions: [{ digitalSourceType: 'http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia' }] } },
    });
    expect(result.some((x) => x.signal === 'synthetic_media_provenance')).toBe(false);
  });
});
