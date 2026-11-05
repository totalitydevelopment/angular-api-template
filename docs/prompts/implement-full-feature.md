# Implement a full-stack feature (API + Angular Portal)

Copy the prompt below and supply the end-to-end feature specification.

> Implement the `<Feature>` end-to-end vertical slice across the .NET backend and Angular
> Portal. Read `AGENTS.md`, `docs/architecture.md`, `README.md`, and applicable `.github`
> instructions first. Inspect the complete `Tasks` vertical slice in both
> `AngularApiTemplate.Api/` (`src/` + `tests/`) and
> `AngularApiTemplate.Portal/src/app/features/tasks` as the canonical reference.
>
> Feature specification:
> - Domain model & business invariants: `<describe entity, invariants, normalization>`
> - Persistence & storage limits: `<describe table, keys, column lengths/precision, indexes, relationships>`
> - API operations & contracts: `<describe routes, HTTP verbs, request/response models, validation limits, authorization policy>`
> - Portal routes, views & forms: `<describe lazy routes, smart route views, dumb presentational components, form rules, and navigation>`
>
> Clarification gate:
> - Before writing code, review the specification above. If any domain rule, column length,
>   HTTP status code, authorization requirement, concurrency behavior, or UI state is
>   underspecified, ask clarifying questions first.
>
> Execution sequence (complete Phase 1 before starting Phase 2):
>
> Phase 1 — Backend (.NET API, Application, Domain, Infrastructure):
> 1. Follow all rules in `docs/prompts/implement-api-feature.md` and `docs/architecture.md`:
>    - Domain entity invariants only (no storage length constants or EF attributes).
>    - `IApplicationDbContext` + `AppDbContext` explicit `DbSet`, direct projections,
>      `AsNoTracking` reads, scoped Application service.
>    - `<Entity>Configuration : IEntityTypeConfiguration<TEntity>` owning schema lengths/
>      keys/indexes, plus complete migration + Designer + snapshot if schema changed.
>    - Operation-named controllers (`<Operation>.cs` / `<Operation>Async`) with
>      `[Authorize(Policy = AuthenticationExtensions.CustomerPolicy)]`, explicit API class
>      contracts, shared `<Feature>RequestLimits`, and `ProducesResponseType` metadata.
>    - Centralize all C# imports in each project's `GlobalUsings.cs`.
> 2. Verify Phase 1 before touching Angular:
>    - Add Domain tests, model-limit alignment tests, controller convention tests, and SQL
>      Server HTTP integration tests.
>    - Run `dotnet build AngularApiTemplate.Api/AngularApiTemplate.slnx --no-restore`,
>      `dotnet format AngularApiTemplate.Api/AngularApiTemplate.slnx --verify-no-changes --no-restore`,
>      and backend tests.
>
> Phase 2 — Frontend (Angular Portal):
> 1. Follow all rules in `docs/prompts/implement-portal-feature.md` and
>    `docs/architecture.md` against the verified Phase 1 HTTP contracts:
>    - Lazy standalone `<feature>.routes.ts` guarded by `canMatch: [customerGuard]`,
>      providing feature State, Effects, Facade, and ApiService.
>    - Typed request/response contracts and factory functions matching the exact API shapes
>      and `<Feature>RequestLimits`.
>    - NgRx actions (carrying `generation`), pure immutable reducer (with bounded per-ID
>      operation state and no unread snapshots), narrow memoized selectors projecting view
>      models, effects with `sessionChanged` cancellation and explicit concurrency
>      (`switchMap` reads, `exhaustMap` create/update, `groupBy` + `exhaustMap` per-ID
>      deletes), and zero-subscription `Store.selectSignal` guards in the Facade.
>    - Smart `OnPush` route components (`vm$ | async`, local `signal()`s,
>      `takeUntilDestroyed`) orchestrating focused dumb presentational components
>      (`input.required()`, `output()`) and extracted `*.form.ts` modules.
> 2. Verify Phase 2:
>    - Add service, reducer/selector memoization, effect concurrency, session-boundary, and
>      routed user-flow Vitest specs.
>    - From `AngularApiTemplate.Portal`, run `npm run typecheck`,
>      `npx tsc --noEmit -p tsconfig.spec.json`, `npm run format:check`,
>      `npm test -- --watch=false`, and `npm run build`.
>
> Handover:
> - Update `docs/architecture.md`, `README.md`, and `docs/foundation-block-one.md` with
>   verification evidence. Stay on `init`; do not commit, push, deploy, or provision Azure
>   resources without separate authorization.
