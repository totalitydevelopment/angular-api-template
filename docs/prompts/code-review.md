# Independent code review and architectural audit

Copy the prompt below and give it to a separate reviewer agent or model to audit recent changes (API, Portal, or full-stack) against the repository's engineering bar.

> Perform a rigorous, Google-engineer-caliber code review of `<target feature, directory, or recent git diff>`
> in this repository. Read `AGENTS.md`, `docs/architecture.md`, `README.md`, and applicable
> `.github` instructions first so you judge the code against both industry best practices
> and this template's explicit architectural rules.
>
> Do NOT modify files unless asked. Inspect the code and tests thoroughly, run the
> non-destructive verification checks, and report findings organized by the rubric below
> with exact `file:line` references and severity (`Critical`, `Major`, `Minor`, `Nit`).
>
> Review rubric:
>
> 1. Backend Architecture & Boundaries (if backend files are in scope):
>    - Layer ownership: Does Domain stay free of EF attributes and storage-length constants?
>      Does Application use `IApplicationDbContext` with direct `AsNoTracking` read
>      projections and explicit save boundaries without leaking `HttpContext`, MVC, or API
>      DTOs?
>    - Persistence & Validation: Does `<Entity>Configuration` own column lengths while API
>      request contracts own matching DataAnnotations via `<Feature>RequestLimits`? Are
>      alignment tests present? If schema changed, are migration, Designer, and snapshot
>      complete?
>    - Controllers & Security: Is there one operation-named controller per file (`*Async`
>      action name), `[Authorize(Policy = AuthenticationExtensions.CustomerPolicy)]`,
>      explicit class request/response mapping, `CancellationToken` propagation, and complete
>      `ProducesResponseType` metadata? Are all `using` directives centralized in each
>      project's `GlobalUsings.cs`?
>
> 2. Angular Smart vs. Dumb Components & Forms (if Portal files are in scope):
>    - Container vs. Presentational split: Are route components strictly focused on view
>      orchestration (`TasksFacade`-style intent calls, `vm$ | async`, local UI `signal()`s),
>      never injecting `Store` or `HttpClient`? Is reusable or nested UI (edit forms,
>      confirmations, complex rows) extracted into dumb `OnPush` components using signal
>      `input.required()` and `output()`?
>    - View-Model purity: Do raw HTTP transport DTOs leak into templates, or do selectors
>      project dedicated view models with pre-formatted display labels?
>    - Reactive forms & Accessibility: Are form construction, validation limits,
>      single-responsibility `ValidatorFn`s, and payload normalization extracted into
>      dedicated `*.form.ts` files? Do templates use `@let` control aliases, static
>      `aria-describedby` hints above controls, `.ng-touched.ng-invalid` CSS, `role="alert"`
>      for critical errors, and `role="list"` on `list-style: none` lists without component
>      `*Invalid` getters or ternary ARIA bindings?
>
> 3. NgRx Reducers, Selectors, and Memory Management:
>    - State hygiene: Are all state fields readonly, serializable (no `HttpErrorResponse` or
>      class instances), and actively read by selectors? Are page-owned detail slices cleared
>      on exit (`*Closed`) and guarded against stale IDs?
>    - Bounded retention: Are per-ID operation maps (`deletions`, etc.) actively pruned on
>      settlement and view departure (`retainedDeletions` pattern) so state never grows into
>      an unbounded history over a long session?
>    - Selector memoization: Do `createSelector` definitions compose narrow child slice
>      selectors (never selecting the entire feature state object) so unrelated slice transitions
>      preserve view-model object reference equality?
>
> 4. RxJS Subscriptions, Concurrency, and Session/Lifecycle Cleanup:
>    - Subscription audit: Trace every `.subscribe()` call. Do templates use `AsyncPipe`?
>      Do component-owned route/stream subscriptions use `takeUntilDestroyed(this.destroyRef)`
>      placed after higher-order operators? Does the Facade use `Store.selectSignal` for
>      synchronous guards instead of manual `.subscribe()` calls?
>    - Effect concurrency & error resilience: Is `catchError` always inside the inner HTTP
>      observable pipe? Are concurrency operators intentionally chosen (`switchMap` +
>      `takeUntil` for reads, `exhaustMap` for create/update, `groupBy` with finite
>      `duration` + `exhaustMap` for concurrent per-ID deletes)?
>    - Auth & session boundary: Do effects capture `selectSessionGeneration` via `defer`,
>      include `generation` on all completion actions, and cancel active inner streams and
>      `groupBy` durations on `sessionChanged`?
>
> 5. Verification & Test Coverage Gaps:
>    - Check that unit, memoization, concurrency, session-boundary, and integration/router
>      flow tests actually prove the invariants above rather than only testing happy paths.
>    - Report the exact output of `npm run typecheck`, `npx tsc --noEmit -p tsconfig.spec.json`,
>      `npm run format:check`, `npm test -- --watch=false`, `npm run build`, and (when
>      applicable) `dotnet build` / `dotnet format --verify-no-changes` / `dotnet test`.
