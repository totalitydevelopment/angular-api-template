import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';

import { provideStore, Store } from '@ngrx/store';

import { AUTH_CONFIG } from './auth.config';
import { AuthService } from './auth.service';
import { selectSessionGeneration, sessionBoundary, sessionReducer } from './session.state';

const { createClient } = vi.hoisted(() => ({ createClient: vi.fn() }));
vi.mock('@azure/msal-browser/custom-auth', () => ({
  CustomAuthPublicClientApplication: { create: createClient },
}));

function account(id = 'customer', tenant = 'tenant') {
  return {
    getAccount: () => ({ homeAccountId: id, tenantId: tenant }),
    signOut: vi.fn(async () => ({ isFailed: () => false })),
    getAccessToken: vi.fn(async () => ({
      isCompleted: () => true,
      data: { accessToken: 'api-token' },
    })),
  };
}

describe('Native customer authentication lifecycle', () => {
  let auth: AuthService;
  const client = {
    getCurrentAccount: vi.fn(),
    handleRedirectPromise: vi.fn(async () => null),
    signIn: vi.fn(),
    signUp: vi.fn(),
    addEventCallback: vi.fn(() => 'callback-id'),
    removeEventCallback: vi.fn(),
  };
  beforeEach(() => {
    vi.clearAllMocks();
    client.getCurrentAccount.mockReturnValue({ isCompleted: () => false });
    createClient.mockResolvedValue(client);
    TestBed.configureTestingModule({
      providers: [
        provideStore({ session: sessionReducer }, { metaReducers: [sessionBoundary] }),
        { provide: Router, useValue: { navigateByUrl: vi.fn(async () => true) } },
        {
          provide: AUTH_CONFIG,
          useValue: {
            enabled: true,
            clientId: '11111111-1111-4111-8111-111111111111',
            authority: 'https://template.ciamlogin.com/',
            apiScope: 'api://api-id/access_as_customer',
            nativeAuthProxyUrl: 'https://auth.example.test/api',
          },
        },
      ],
    });
    auth = TestBed.inject(AuthService);
  });

  it('initializes once, uses session storage, and removes the SDK callback on destruction', async () => {
    await Promise.all([auth.initialize(), auth.initialize()]);
    expect(createClient).toHaveBeenCalledOnce();
    expect(createClient).toHaveBeenCalledWith(
      expect.objectContaining({
        cache: { cacheLocation: 'sessionStorage' },
        customAuth: expect.objectContaining({ challengeTypes: ['oob'] }),
      }),
    );
    expect(client.handleRedirectPromise).toHaveBeenCalledOnce();
    TestBed.resetTestingModule();
    expect(client.removeEventCallback).toHaveBeenCalledWith('callback-id');
  });

  it('completes email-code sign in and obtains the API access token', async () => {
    const customer = account();
    const submitCode = vi.fn(async () => ({ isCompleted: () => true, data: customer }));
    client.signIn.mockResolvedValue({
      isCompleted: () => false,
      isCodeRequired: () => true,
      state: { submitCode },
    });
    await auth.begin(' customer@example.test ', false);
    expect(auth.codeRequired()).toBe(true);
    expect(client.signIn).toHaveBeenCalledWith({
      username: 'customer@example.test',
      scopes: ['openid', 'profile', 'offline_access', 'api://api-id/access_as_customer'],
    });
    await auth.verify('123456');
    expect(submitCode).toHaveBeenCalledWith('123456');
    expect(auth.authenticated()).toBe(true);
    expect(auth.codeRequired()).toBe(false);
    client.getCurrentAccount.mockReturnValue({ isCompleted: () => true, data: customer });
    expect(await auth.accessToken()).toBe('api-token');
    expect(customer.getAccessToken).toHaveBeenCalledWith({
      scopes: ['openid', 'profile', 'offline_access', 'api://api-id/access_as_customer'],
      forceRefresh: false,
    });
  });

  it('continues verified signup into sign in', async () => {
    const customer = account();
    const signIn = vi.fn(async () => ({ isCompleted: () => true, data: customer }));
    client.signUp.mockResolvedValue({
      isCodeRequired: () => true,
      state: { submitCode: vi.fn(async () => ({ isCompleted: () => true, state: { signIn } })) },
    });
    await auth.begin('new@example.test', true);
    await auth.verify('123456');
    expect(signIn).toHaveBeenCalledWith({
      scopes: ['openid', 'profile', 'offline_access', 'api://api-id/access_as_customer'],
    });
    expect(auth.authenticated()).toBe(true);
  });

  it('increments generation on logout and account or tenant replacement', async () => {
    const store = TestBed.inject(Store);
    const first = account();
    client.getCurrentAccount.mockReturnValue({ isCompleted: () => true, data: first });
    await auth.initialize();
    expect(store.selectSignal(selectSessionGeneration)()).toBe(1);
    auth.refreshAccount();
    expect(store.selectSignal(selectSessionGeneration)()).toBe(1);
    client.getCurrentAccount.mockReturnValue({ isCompleted: () => true, data: account('another') });
    auth.refreshAccount();
    expect(store.selectSignal(selectSessionGeneration)()).toBe(2);
    client.getCurrentAccount.mockReturnValue({
      isCompleted: () => true,
      data: account('another', 'another-tenant'),
    });
    auth.refreshAccount();
    expect(store.selectSignal(selectSessionGeneration)()).toBe(3);
    await auth.logout();
    expect(store.selectSignal(selectSessionGeneration)()).toBe(4);
    expect(auth.authenticated()).toBe(false);
  });

  it('does not accept a code response after the owning page leaves', async () => {
    let complete: ((value: unknown) => void) | undefined;
    client.signIn.mockResolvedValue({
      isCompleted: () => false,
      isCodeRequired: () => true,
      state: {
        submitCode: () =>
          new Promise((resolve) => {
            complete = resolve;
          }),
      },
    });
    await auth.begin('customer@example.test', false);
    const pending = auth.verify('123456');
    auth.resetFlow();
    const lateAccount = account();
    complete?.({ isCompleted: () => true, data: lateAccount });
    await pending;
    expect(auth.authenticated()).toBe(false);
    expect(lateAccount.signOut).toHaveBeenCalledOnce();
  });

  it('renders a plain error for a failed verification', async () => {
    client.signIn.mockResolvedValue({
      isCompleted: () => false,
      isCodeRequired: () => true,
      state: { submitCode: async () => ({ isCompleted: () => false }) },
    });
    await auth.begin('customer@example.test', false);
    await auth.verify('000000');
    expect(auth.error()).toContain('Sign in could not be completed');
    expect(auth.authenticated()).toBe(false);
  });

  it('distinguishes a rejected code from a failed sign-in continuation without exposing provider details', async () => {
    client.signIn.mockResolvedValue({
      isCompleted: () => false,
      isCodeRequired: () => true,
      state: {
        submitCode: async () => ({
          isCompleted: () => false,
          error: {
            isInvalidCode: () => true,
            errorData: { errorDescription: 'private provider details' },
          },
        }),
      },
    });
    await auth.begin('customer@example.test', false);
    await auth.verify('00000000');
    expect(auth.error()).toContain('code is invalid or has expired');
    expect(auth.error()).not.toContain('private provider details');
    expect(auth.codeRequired()).toBe(true);
    expect(auth.authenticated()).toBe(false);
  });
});
