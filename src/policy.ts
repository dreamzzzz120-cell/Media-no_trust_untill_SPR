import type { DistributionAction, MediaVerdict } from './domain/verdict.js';

export interface Policy {
  requireVerification: boolean;
  aiGeneratedAction: DistributionAction;
  unverifiedAction: DistributionAction;
}

export const defaultPolicy: Policy = {
  requireVerification: true,
  aiGeneratedAction: 'LABEL',
  unverifiedAction: 'BLOCK',
};

export function actionForVerdict(verdict: MediaVerdict, policy: Policy = defaultPolicy): DistributionAction {
  if (verdict === 'AI_VERIFIED') return policy.aiGeneratedAction;
  if (verdict === 'UNVERIFIED') return policy.unverifiedAction;
  if (verdict === 'BLOCK') return 'BLOCK';
  if (verdict === 'REVIEW') return 'REVIEW';
  return 'ALLOW';
}
