# Configure Microsoft Entra ID (MSAL) authentication

Copy the prompt below and supply the tenant, SPA client ID, API app registration URI/scope, and native-auth proxy URL requirements.

> Implement Microsoft Entra External ID (CIAM) customer authentication across the .NET API
> and Angular Portal in this template. Read AGENTS.md, docs/architecture.md, README.md and
> applicable .github instructions first. Inspect the existing Tasks controllers, API
> Program.cs, CORS policy, Angular app.config.ts, app.routes.ts, core/config, Tasks store/
> effects/reducer/selectors/error mapper, and tests before making changes.
>
> Backend (.NET API):
> - Configure Microsoft.Identity.Web / JwtBearer authentication against the agreed
>   Entra External ID CIAM authority (`https://<tenant>.ciamlogin.com/`), tenant GUID,
>   and v2 audience (`ClientId`). Bind and startup-validate typed non-secret `Entra`
>   configuration in appsettings when `Enabled` is true; keep `Enabled: false` by default
>   so the template runs without Azure. Never commit secrets, tokens, or credentials.
> - Keep CORS middleware after UseRouting and before UseAuthentication/UseAuthorization,
>   using the explicit Cors:AllowedOrigins array without wildcard origins.
> - Use `[Authorize(Policy = "Customer")]` on Tasks controllers (requiring an
>   authenticated user with `oid` and non-empty `scp` when enabled, and bypassing only
>   when `Entra:Enabled` is false), while keeping `/health` as anonymous process liveness.
>
> Frontend (Angular Portal):
> - Use `@azure/msal-browser/custom-auth` directly (without `@azure/msal-angular` hosted
>   redirect wrappers) for custom Angular email one-time-code sign-up and sign-in, loaded
>   via dynamic `import()` only when `authConfig.enabled` is true. Keep all MSAL
>   configuration, state, guards, login UI, and interceptors inside `src/app/core/auth/`;
>   never import MSAL packages inside `src/app/features/`.
> - Register a functional HTTP token interceptor on the single root `provideHttpClient`
>   in `app.config.ts`, scoping token attachment strictly to the `API_BASE_URL` origin
>   and path boundary. Never register a second feature-level `HttpClient`.
> - Protect lazy feature routes in `app.routes.ts` with a functional `canMatch` guard so
>   unauthenticated users do not download protected feature chunks before sign-in.
> - Use `handleRedirectPromise()` once on initialization and clean up SDK callbacks via
>   `DestroyRef`. On logout or active account/tenant change, dispatch a root
>   `sessionChanged({ generation })` action with a strictly increasing generation counter,
>   cancel in-flight feature effect requests via `takeUntil`, reset registered feature
>   state (`tasksFeature`) to `initialTasksState` via a root meta-reducer, and reject
>   stale responses from an older session generation.
> - Preserve 401/403 mapping in `toApiError` (`task-api-error.ts`) so expired sessions
>   and forbidden operations produce plain serializable `ApiError` state without storing
>   `HttpErrorResponse` instances in NgRx.
>
> Validation:
> - Add backend integration tests covering 401 unauthenticated, 403 app-only callers,
>   invalid tokens, and 200/201/204 authorized Tasks requests, plus startup configuration
>   validation.
> - Add Portal unit and integration tests covering `canMatch` guard behavior, native
>   email-code sign-in/sign-up, bearer token attachment to `API_BASE_URL`, 401/403
>   `ApiError` mapping, and state reset + in-flight HTTP cancellation on session change.
> - Run `dotnet build`, `dotnet format --verify-no-changes`, backend tests, and Portal
>   `npm run typecheck`, `npm run format:check`, `npm test -- --watch=false`, and
>   `npm run build`. Update `docs/architecture.md`, `README.md`, and
>   `docs/foundation-block-one.md`. Stay on `init`; do not commit, push, deploy, or
>   provision Azure resources without separate authorization.
