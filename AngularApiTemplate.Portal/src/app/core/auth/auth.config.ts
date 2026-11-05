import { InjectionToken } from '@angular/core';

import { authValues } from './auth.values';

export interface AuthConfig {
  readonly enabled: boolean;
  readonly clientId: string;
  readonly authority: string;
  readonly apiScope: string;
  readonly nativeAuthProxyUrl: string;
}

// Non-secret placeholders. Disabled mode does not load MSAL or contact Entra.
export const authConfig: AuthConfig = authValues;

export const AUTH_CONFIG = new InjectionToken<AuthConfig>('AUTH_CONFIG', {
  providedIn: 'root',
  factory: () => authConfig,
});

export function validateAuthConfig(config: AuthConfig): void {
  if (!config.enabled) return;
  const guid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const authority = new URL(config.authority);
  const proxy = new URL(config.nativeAuthProxyUrl);
  if (
    !guid.test(config.clientId) ||
    config.clientId === '00000000-0000-0000-0000-000000000000' ||
    authority.protocol !== 'https:' ||
    !authority.hostname.endsWith('.ciamlogin.com') ||
    authority.pathname !== '/' ||
    authority.search ||
    authority.hash ||
    authority.username ||
    authority.password ||
    authority.port ||
    !/^api:\/\/[^\s/]+\/[^\s/]+$/.test(config.apiScope) ||
    config.apiScope.includes('YOUR-') ||
    proxy.hostname.endsWith('.invalid') ||
    proxy.username ||
    proxy.password ||
    proxy.search ||
    proxy.hash ||
    (proxy.protocol !== 'https:' && !(proxy.protocol === 'http:' && proxy.hostname === 'localhost'))
  ) {
    throw new Error(
      'Configure the Entra client ID, CIAM authority, API scope and native authentication proxy before enabling authentication.',
    );
  }
}
