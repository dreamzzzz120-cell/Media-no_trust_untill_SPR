import { Reader } from '@contentauth/c2pa-node';
import type { ProvenanceResult } from '../domain/media.js';

export async function inspectC2pa(path: string, verifyTrust: boolean): Promise<ProvenanceResult> {
  try {
    const settings = {
      verify: {
        verify_after_reading: true,
        verify_trust: verifyTrust,
        ocsp_fetch: false,
        remote_manifest_fetch: false,
      },
    };
    const reader = await Reader.fromAsset({ path }, settings);
    if (!reader) return { status: 'absent', embedded: false, trusted: false, errors: [] };

    const raw = reader.json() as unknown;
    const store = typeof raw === 'string' ? JSON.parse(raw) as Record<string, unknown> : raw as Record<string, unknown>;
    const active = reader.getActive();
    const embedded = Boolean(reader.isEmbedded());
    const validationStatus = store.validation_status;
    const validationState = store.validation_state;
    const hasValidationErrors = Array.isArray(validationStatus) && validationStatus.length > 0;
    const trusted = embedded && !hasValidationErrors && (validationState === undefined || validationState === 'Trusted' || validationState === 'Valid');
    const result: ProvenanceResult = {
      status: embedded ? (trusted ? 'verified' : 'present_untrusted') : 'absent',
      embedded,
      trusted,
      manifestStore: store,
      errors: hasValidationErrors ? ['C2PA validation reported one or more validation-status entries'] : [],
    };
    if (active !== undefined && active !== null) result.activeManifest = active;
    return result;
  } catch (error) {
    return {
      status: 'error',
      embedded: false,
      trusted: false,
      errors: [error instanceof Error ? error.message.slice(0, 500) : 'C2PA inspection failed'],
    };
  }
}
