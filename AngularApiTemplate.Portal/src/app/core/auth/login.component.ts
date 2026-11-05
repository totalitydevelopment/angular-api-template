import { ChangeDetectionStrategy, Component, DestroyRef, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { AuthService } from './auth.service';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1>Customer sign in</h1>
    @if (!auth.config.enabled) {
      <p>Customer sign in is not configured in this template.</p>
      <a routerLink="/tasks">Continue to Tasks</a>
    } @else {
      <p>Use a verification code sent to your email. No password needed.</p>
      @if (auth.error(); as error) {
        <p class="error" role="alert">{{ error }}</p>
      }
      @if (auth.codeRequired()) {
        @let code = codeForm.controls.code;
        <form [formGroup]="codeForm" (ngSubmit)="verify()" novalidate>
          <label for="verification-code">Email verification code</label>
          <p id="code-hint">Enter the code sent to your email.</p>
          <input
            aria-describedby="code-hint"
            id="verification-code"
            formControlName="code"
            autocomplete="one-time-code"
            inputmode="numeric"
            required
          />
          @if (code.touched && code.invalid) {
            <p class="error">Enter the verification code sent to your email.</p>
          }
          <button type="submit" [disabled]="auth.busy()">Verify code</button>
          <button type="button" [disabled]="auth.busy()" (click)="restart()">Start again</button>
        </form>
      } @else {
        @let email = emailForm.controls.email;
        <form [formGroup]="emailForm" (ngSubmit)="begin(false)" novalidate>
          <label for="customer-email">Email address</label>
          <p id="email-hint">Enter a valid email address.</p>
          <input
            aria-describedby="email-hint"
            id="customer-email"
            type="email"
            formControlName="email"
            autocomplete="email"
            required
          />
          @if (email.touched && email.invalid) {
            <p class="error">Enter a valid email address.</p>
          }
          <button type="submit" [disabled]="auth.busy()">Sign in</button>
          <button type="button" [disabled]="auth.busy()" (click)="begin(true)">
            Create an account
          </button>
        </form>
      }
      @if (auth.busy()) {
        <p role="status">Please wait…</p>
      }
    }
  `,
})
export class LoginComponent {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  readonly emailForm = new FormGroup({
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
  });
  readonly codeForm = new FormGroup({
    code: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });

  constructor() {
    this.destroyRef.onDestroy(() => this.auth.resetFlow());
  }

  async begin(signup: boolean): Promise<void> {
    this.emailForm.markAllAsTouched();
    if (this.emailForm.invalid) return;
    await this.auth.begin(this.emailForm.controls.email.value, signup);
    this.finish();
  }

  async verify(): Promise<void> {
    this.codeForm.markAllAsTouched();
    if (this.codeForm.invalid) return;
    const code = this.codeForm.controls.code.value;
    this.codeForm.reset();
    await this.auth.verify(code);
    this.finish();
  }

  restart(): void {
    this.codeForm.reset();
    this.auth.resetFlow();
  }

  private finish(): void {
    if (this.destroyRef.destroyed || !this.auth.authenticated()) return;
    const requested = this.route.snapshot.queryParamMap.get('returnUrl');
    const url = requested && /^\/tasks(?:[/?;#]|$)/.test(requested) ? requested : '/tasks';
    void this.router.navigateByUrl(url);
  }
}
