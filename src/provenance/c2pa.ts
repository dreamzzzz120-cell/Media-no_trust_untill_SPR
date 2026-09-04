import { Reader } from '@contentauth/c2pa-node';
import type { ProvenanceResult } from '../domain/media.js';

export async function inspectC2pa(path: string, verifyTrust: boolean): Promise<ProvenanceResult> {
  try {
    const settings = {
      verify: {
        verify_after_reading: true,
        verify_trust: verifyTrust,
        ocsp_fetch: false,
      },
    };
    const reader = await Reader.fromAsset({ path }, settings);
    const store = reader.json();
    const active = reader.getActive();
    const embedded = Boolean(reader.isEmbedded());
    const trusted = Boolean((active as { validation_status?: unknown } | undefined)?.validation_status);
    return {
      status: embedded ? (trusted ? 'verified' : 'present_untrusted') : 'absent',
      embedded,
      trusted,
      activeManifest: active ?? undefined,
      manifestStore: store ?? undefined,
      errors: [],
    };
  } catch (error) {
    return {
      status: 'error',
      embedded: false,
      trusted: false,
      errors: [error instanceof Error ? error.message.slice(0, 500) : 'C2PA inspection failed'],
    };
  }
}
