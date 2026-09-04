import type { SignalProvider } from './verification/signals.js';

/** External providers are opt-in. Each provider must report explicit evidence and
 * may never turn a provider error into a positive authenticity signal. */
export function composeProviders(providers: SignalProvider[]): SignalProvider[] {
  return providers.filter((provider) => Boolean(provider.name && provider.analyze));
}
