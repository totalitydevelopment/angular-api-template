import { DestroyRef, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';

import type {
  CustomAuthAccountData,
  ICustomAuthPublicClientApplicationV2,
  SignInCodeRequiredState,
  SignUpCodeRequiredState,
} from '@azure/msal-browser/custom-auth';
import { Store } from '@ngrx/store';

import { AUTH_CONFIG, validateAuthConfig } from './auth.config';
import { selectSessionGeneration, sessionChanged } from './session.state';

@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly config = inject(AUTH_CONFIG);
  private readonly store = inject(Store);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private client?: ICustomAuthPublicClientApplicationV2;
  private account?: CustomAuthAccountData;
  private identity: string | null = null;
  private epoch = 0;
  private sessionBlocked = false;
  private initialization?: Promise<void>;
  private pending?: SignInCodeRequiredState | SignUpCodeRequiredState;
  private signup = false;
  readonly authenticated = signal(false);
  readonly codeRequired = signal(false);
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);

  private get scopes(): string[] {
    // Native MSAL replaces its defaults when custom scopes are supplied.
    return ['openid', 'profile', 'offline_access', this.config.apiScope];
  }

  constructor() {
    this.destroyRef.onDestroy(() => {
      ++this.epoch;
      this.pending = undefined;
      this.account = undefined;
    });
  }

  initialize(): Promise<void> {
    return (this.initialization ??= this.initializeClient());
  }

  private async initializeClient(): Promise<void> {
    validateAuthConfig(this.config);
    if (!this.config.enabled) return;
    const { CustomAuthPublicClientApplication } = await import('@azure/msal-browser/custom-auth');
    if (this.destroyRef.destroyed) return;
    this.client = await CustomAuthPublicClientApplication.create({
      auth: {
        clientId: this.config.clientId,
        authority: this.config.authority,
        redirectUri: window.location.origin + '/login',
      },
      customAuth: { challengeTypes: ['oob'], authApiProxyUrl: this.config.nativeAuthProxyUrl },
      cache: { cacheLocation: 'sessionStorage' },
    });
    if (this.destroyRef.destroyed) return;
    // Native email-code flows do not use redirect observables. Process SDK browser fallback once.
    await this.client.handleRedirectPromise();
    if (this.destroyRef.destroyed) return;
    this.syncAccount();
    const callbackId = this.client.addEventCallback(() => {
      if (!this.destroyRef.destroyed && !this.busy()) this.syncAccount();
    });
    this.destroyRef.onDestroy(() => {
      if (callbackId) this.client?.removeEventCallback(callbackId);
    });
  }

  refreshAccount(): void {
    this.syncAccount();
  }

  private syncAccount(): void {
    const result = this.client?.getCurrentAccount();
    this.setAccount(!this.sessionBlocked && result?.isCompleted() ? result.data : undefined);
  }

  private setAccount(account: CustomAuthAccountData | undefined): void {
    const info = account?.getAccount();
    const identity = info ? info.homeAccountId + ':' + info.tenantId : null;
    this.account = account;
    this.authenticated.set(!!account);
    if (identity !== this.identity) {
      this.identity = identity;
      this.changeSession();
    }
  }

  private changeSession(): void {
    this.pending = undefined;
    this.codeRequired.set(false);
    ++this.epoch;
    this.store.dispatch(
      sessionChanged({ generation: this.store.selectSignal(selectSessionGeneration)() + 1 }),
    );
  }

  async begin(email: string, signup: boolean): Promise<void> {
    if (this.busy() || !this.config.enabled) return;
    this.busy.set(true);
    this.error.set(null);
    const epoch = this.epoch;
    try {
      await this.initialize();
      if (!this.client || this.destroyRef.destroyed || epoch !== this.epoch) return;
      this.pending = undefined;
      this.codeRequired.set(false);
      this.signup = signup;
      if (signup) {
        const result = await this.client.signUp({ username: email.trim() });
        if (epoch !== this.epoch || this.destroyRef.destroyed) return;
        if (!result.isCodeRequired()) throw new Error('Unsupported authentication step');
        this.pending = result.state;
      } else {
        const result = await this.client.signIn({
          username: email.trim(),
          scopes: this.scopes,
        });
        if (await this.discardObsoleteAccount(epoch, result.data)) return;
        if (result.isCompleted() && result.data) {
          this.sessionBlocked = false;
          this.setAccount(result.data);
          return;
        }
        if (!result.isCodeRequired()) throw new Error('Unsupported authentication step');
        this.pending = result.state;
      }
      this.codeRequired.set(true);
    } catch {
      if (epoch === this.epoch && !this.destroyRef.destroyed)
        this.error.set('Unable to continue. Check your email and try again.');
    } finally {
      if (!this.destroyRef.destroyed) this.busy.set(false);
    }
  }

  async verify(code: string): Promise<void> {
    if (!this.pending || this.busy()) return;
    this.busy.set(true);
    this.error.set(null);
    const epoch = this.epoch;
    try {
      const result = await this.pending.submitCode(code.trim());
      if (await this.discardObsoleteAccount(epoch, result.data || undefined)) return;
      if (!result.isCompleted()) {
        if (result.error?.isInvalidCode()) {
          this.error.set(
            'That code is invalid or has expired. Use the latest code for this sign-in attempt.',
          );
          return;
        }
        throw new Error('Sign in did not complete');
      }
      if (this.signup) {
        // A verified signup continues directly to sign-in, without retaining the code.
        if (!('signIn' in result.state)) throw new Error('Unsupported continuation');
        const signedIn = await result.state.signIn({ scopes: this.scopes });
        if (await this.discardObsoleteAccount(epoch, signedIn.data)) return;
        if (!signedIn.isCompleted() || !signedIn.data) throw new Error('Sign in failed');
        this.sessionBlocked = false;
        this.setAccount(signedIn.data);
      } else {
        if (!result.data) throw new Error('Missing account');
        this.sessionBlocked = false;
        this.setAccount(result.data);
      }
      this.pending = undefined;
      this.codeRequired.set(false);
    } catch {
      if (epoch === this.epoch && !this.destroyRef.destroyed)
        this.error.set('Sign in could not be completed. Please start again.');
    } finally {
      if (!this.destroyRef.destroyed) this.busy.set(false);
    }
  }

  private async discardObsoleteAccount(
    epoch: number,
    account?: CustomAuthAccountData,
  ): Promise<boolean> {
    if (epoch === this.epoch && !this.destroyRef.destroyed) return false;
    // SDK Promises cannot be cancelled and may already have cached a late account.
    // No new sign-in can start while busy; clear that obsolete account before releasing the gate.
    try {
      const result = await account?.signOut();
      if (result?.isFailed()) this.blockObsoleteSession();
    } catch {
      this.blockObsoleteSession();
    }
    return true;
  }

  private blockObsoleteSession(): void {
    this.sessionBlocked = true;
    this.setAccount(undefined);
    if (!this.destroyRef.destroyed)
      this.error.set('Sign out could not be completed. Close this tab before signing in again.');
  }

  resetFlow(): void {
    ++this.epoch;
    this.pending = undefined;
    this.codeRequired.set(false);
    this.error.set(null);
  }

  async accessToken(): Promise<string> {
    await this.initialize();
    this.syncAccount();
    const epoch = this.epoch;
    const account = this.account;
    if (!account) throw new Error('Sign in required');
    try {
      const result = await account.getAccessToken({
        scopes: this.scopes,
        forceRefresh: false,
      });
      if (await this.discardObsoleteAccount(epoch, account)) throw new Error('Session changed');
      this.syncAccount();
      if (epoch !== this.epoch || this.destroyRef.destroyed) throw new Error('Session changed');
      if (!result.isCompleted() || !result.data?.accessToken) throw new Error('Sign in required');
      return result.data.accessToken;
    } catch {
      if (epoch === this.epoch && !this.destroyRef.destroyed) await this.logout();
      throw new Error('Sign in required');
    }
  }

  async logout(): Promise<void> {
    const account = this.account;
    this.sessionBlocked = true;
    this.resetFlow();
    this.setAccount(undefined);
    // Reset before awaiting the SDK, so old HTTP work cannot update the new session.
    if (!account) this.changeSession();
    try {
      const result = await account?.signOut();
      if (result?.isFailed())
        this.error.set(
          'Local sign out could not be completed. Close this tab before signing in again.',
        );
    } catch {
      this.error.set(
        'Local sign out could not be completed. Close this tab before signing in again.',
      );
    } finally {
      if (!this.destroyRef.destroyed) void this.router.navigateByUrl('/login');
    }
  }
}
