export interface HealthState { status: 'ok' | 'not_ready'; service: string; checks: Record<string, 'ok' | 'missing'>; }

export function buildReadiness(hasDatabase: boolean, production: boolean): HealthState {
  if (production && !hasDatabase) return { status: 'not_ready', service: 'spr-media-passport', checks: { database: 'missing' } };
  return { status: 'ok', service: 'spr-media-passport', checks: { database: hasDatabase ? 'ok' : 'missing' } };
}
