export interface VerificationMetrics {
  startedAt: number;
  completedAt: number;
  durationMs: number;
  observationCount: number;
  providerFailures: number;
}

export function measureVerification<T extends { observations: Array<{ result: string }> }>(startedAt: number, record: T): VerificationMetrics {
  const completedAt = Date.now();
  return {
    startedAt,
    completedAt,
    durationMs: Math.max(0, completedAt - startedAt),
    observationCount: record.observations.length,
    providerFailures: record.observations.filter((o) => o.result === 'unavailable').length,
  };
}
