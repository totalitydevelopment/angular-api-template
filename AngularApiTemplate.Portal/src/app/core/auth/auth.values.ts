// Default template values. Real development authentication is opt-in with start:entra.
export const authValues = {
  enabled: false,
  clientId: 'YOUR-PORTAL-CLIENT-ID',
  authority: 'https://YOUR-TENANT.ciamlogin.com/',
  apiScope: 'api://YOUR-API-CLIENT-ID/access_as_customer',
  nativeAuthProxyUrl: 'https://YOUR-AUTH-PROXY.example.invalid/api',
};
