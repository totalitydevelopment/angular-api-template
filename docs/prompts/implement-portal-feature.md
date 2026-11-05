# Implement an Angular Portal feature

Copy the prompt below and supply the feature specification (routes, API endpoints, views, forms, and interactions).

> Implement the `<Feature>` Angular Portal slice in this template. Read `AGENTS.md`, the
> Angular Portal sections of `docs/architecture.md`, `README.md` and
> `.github/instructions/portal.instructions.md` first. Inspect
> `AngularApiTemplate.Portal/src/app/features/tasks` and `src/app/core/auth` as the working
> reference before making changes.
>
> Feature specification:
> - Route path & navigation: `<e.g. /<feature>, /<feature>/create, /<feature>/:id, protected by canMatch: [customerGuard]>`
> - API endpoints consumed: `<list HTTP methods, routes, request bodies, and response shapes>`
> - Views & user flows: `<describe list, detail, create, edit, delete, or custom interactions>`
> - Form validation rules: `<describe fields, required/trimmed rules, and character limits matching API contracts>`
>
> Clarification gate:
> - If any endpoint contract, validation limit, concurrency rule, post-mutation navigation
>   target or empty/error state is missing or ambiguous, stop and ask before coding.
>
> Implementation rules:
> - Lazy routing & DI: Register a standalone lazy route array (`<feature>.routes.ts`) in
>   `app.routes.ts` with `canMatch: [customerGuard]` (unless public). Provide feature
>   `provideState`, `provideEffects`, `<Feature>Facade`, and `<Feature>ApiService` once on
>   the lazy feature route. Never register a second `HttpClient` or import feature code
>   eagerly at root.
> - Contracts & HTTP service: Define readonly request/response interfaces and explicit
>   typed factory functions (`create<Operation>Request`) in `models/`. Keep HTTP calls in
>   `<Feature>ApiService` using `inject(HttpClient)` and `inject(API_BASE_URL)` with
>   `encodeURIComponent` for route parameters. Map errors to plain serializable `ApiError`
>   (including 401/403/404/500 and `ProblemDetails` validation errors); never store
>   `HttpErrorResponse` in state.
> - NgRx Store & Memory:
>   - Declare actions with `createActionGroup`, including `generation: number` on all async
>     success/failure events.
>   - Declare pure immutable state with `createFeature`/`createReducer`. Clear detail/page
>     slices on close, ignore responses for stale route IDs, avoid unread state snapshots,
>     and bound per-ID operation maps (`retainedDeletions` pattern) so settled errors only
>     live while visible and never accumulate unbounded history.
>   - Compose narrow child selectors (`createSelector`) to project transport responses into
>     dedicated view models with pre-formatted labels. Never leak raw HTTP contracts into
>     component templates.
> - Effects & Subscriptions:
>   - Capture `selectSessionGeneration` via `defer` when starting each HTTP request, cancel
>     in-flight requests on `sessionChanged` (`takeUntil`), and filter follow-up effects by
>     current generation.
>   - Use `switchMap` + close/mutation `takeUntil` for page-owned reads, `exhaustMap` for
>     create/update mutations (no automatic retries), and `groupBy` with settlement/session
>     `duration` + `exhaustMap` for independent per-ID concurrent deletes.
>   - In `<Feature>Facade`, use `this.store.selectSignal(...)` for synchronous pending/active
>     guards so the facade has zero `.subscribe()` calls.
> - Smart vs. Dumb Components & Forms:
>   - Use standalone `ChangeDetectionStrategy.OnPush` components everywhere.
>   - Keep route components strictly focused on view orchestration: inject only the feature
>     Facade (and `ActivatedRoute`/`DestroyRef` with `takeUntilDestroyed` where needed),
>     bind `vm$ | async` with `@if`/`@for`/`@let`, and hold only ephemeral confirmation UI
>     flags in local `signal()`s.
>   - Extract reusable/nested feature UI (such as edit forms and delete confirmations) into
>     presentational ("dumb") components using `input.required()` and `output()`.
>   - Extract reactive form construction, validation limits, single-responsibility
>     validators, and request mapping into dedicated `*.form.ts` files. In templates, use
>     `@let` control aliases (`control.touched && control.invalid`), `.ng-touched.ng-invalid`
>     styling, static `aria-describedby` hint IDs placed above controls, `role="alert"` for
>     submission/request errors, and `role="list"` on unstyled lists.
>
> Verification gate:
> - Add unit and router-flow tests covering HTTP service contracts, reducer/selector state
>   transitions and memoization, effect concurrency/recovery, session-change cancellation/
>   reset, and routed user flows.
> - From `AngularApiTemplate.Portal`, run `npm run typecheck`,
>   `npx tsc --noEmit -p tsconfig.spec.json`, `npm run format:check`,
>   `npm test -- --watch=false`, and `npm run build` (verifying the lazy chunk).
> - Update `docs/architecture.md`, `README.md`, and `docs/foundation-block-one.md`. Stay on
>   `init`; do not commit, push, or deploy without separate authorization.
