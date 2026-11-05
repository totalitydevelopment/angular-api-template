# Backend foundation: implementation handover

Historical foundation-block report, before the Tasks implementation. Current
architecture and startup commands are maintained in the linked architecture/README.
The Tasks follow-up now adds a domain model, service, controllers and migration; the
"not yet introduced" statements below describe the earlier foundation checkpoint.

This superseded the earlier Generic Host scaffold. The Angular portal is outside
this block and has not been edited. The repository remains on init, uncommitted.
[Architecture](architecture.md) is the maintained rule source; [README](../README.md)
owns setup commands. Agent and GitHub instruction files link to those sources.

## Implemented files and responsibilities

| Files | Change |
| --- | --- |
| Application/Persistence/IApplicationDbContext.cs; Application project | Application-owned persistence contract; intentional EF Core dependency |
| Infrastructure/Persistence/AppDbContext.cs, DatabaseOptions.cs; DependencyInjection.cs | SQL Server context, fluent mapping discovery, sanitized startup validation and shared scoped registration |
| Both hosts' appsettings files | Required connection setting; non-secret Development placeholder |
| Functions project, Program.cs, GlobalUsings.cs, host.json, local.settings.example.json | Real .NET 10 isolated worker, no triggers; private ignored local settings copied for verification |
| Functions project run-directory target | Normalizes the SDK's relative working directory for root-level project launches |
| Architecture tests | Exact direct project graph, framework/package restrictions, EF-aware Application allowlist, prohibited package checks |
| Infrastructure configuration/registration tests; API health test | Required options, SQL Server registration and same-instance scope, invalid config redaction, health startup with explicit test settings |
| README, architecture.md, AGENTS.md, GitHub instruction pointers, this handover | Current conventions, reference decisions, commands and evidence |

EF Core and SQL Server packages are pinned to 10.0.14. Infrastructure pins the
transitive System.Security.Cryptography.Pkcs dependency to patched 10.0.14 after
NuGet audit rejected the older version pulled by the SQL client dependency chain.
No vulnerability suppression was introduced. Azure Functions uses Azure.Functions.Sdk
1.0.1 and Microsoft.Azure.Functions.Worker 2.52.0.

No business operation exists yet, so no empty Application service, API contract,
DbSet, domain aggregate, mapping helper, migration or persistence workflow was added.
The interface currently exposes SaveChangesAsync; introduce explicit DbSets and a
focused service interface/implementation together with the first real use case.
EF design-time tooling will be added when a model requires migrations.

## Same Page reference review

Reviewed the requested references in the available local Same-Page.Api checkout:

- .github/instructions/architecture.instructions.md
- .github/instructions/api/controllers.instructions.md
- .github/instructions/core/aggregates.instructions.md
- .github/instructions/functions/processors.instructions.md
- .github/.copilot-instructions.md (legacy file present; modern filename absent)
- AGENTS.md and CLAUDE.md

No product code, credentials or settings were copied. The Windows reference path
was resolved to the existing checkout; no machine-specific reference paths are
embedded in the durable instructions.

| Generic rule | Decision |
| --- | --- |
| Nullable references, file-scoped namespaces, common global usings, braces and readable formatting | Adopted using the existing .NET 10 project conventions |
| Primary-constructor DI, thin HTTP endpoints, feature/operation organization and typed HTTP responses | Adopted; no sample controller introduced |
| Factories, controlled setters, invariant-protecting domain methods and aggregate consistency | Adopted for future real entities; no speculative base classes |
| Async I/O, cancellation, targeted projections, no tracking for reads, tracked mutations and correct Include chains | Adopted in Application services, rather than controller/processor EF queries |
| Complete EF migration + Designer + snapshot artifacts | Adopted; no empty migration generated |
| Inward dependencies and interface-based services | Adapted to explicit Domain/Application split; Application intentionally EF-aware |
| Direct controller/processor DbContext access and services only when reused | Replaced by Application interfaces for all business workflows, as requested |
| AutoMapper and mapper profiles | Omitted in favor of explicit API object initializers and direct Application result projections |
| Core/domain request objects reused as HTTP responses | Replaced by explicit boundary ownership; Application results are never serialized directly |
| Blanket SingleAsync/no-null-check after authorization | Omitted; existence and uniqueness must be justified by each use case |
| Firebase, product route prefixes, customer-specific permissions/IDs, payments, AI and caching systems | Omitted; unrelated to the template, Entra identity comes later |
| Copied mobile/public workflows | Omitted; entry points share Application operations instead |
| EF InMemory integration-test examples | Omitted; SQL Server will verify relational behavior when introduced |
| MSTest, old framework claims and assertions of compliance | Not copied; retain existing xUnit projects and verify current build evidence |
| Mandatory try/catch in every Function and immediate dead-letter-on-exception claim | Not copied; settlement/retry behavior will be verified for the chosen trigger |
| Remove all commented-out code | Adapted: retain the user's explicit commented Key Vault activation line |
| Production branch/deployment flow | Not copied; user asked to work on init without commits, pushes or deployments |

## Configuration decisions

Both hosts use the shared vault loader, currently commented out at the user's
request. KeyVault:Name is angular-template-dev-kv; the URI is derived from this
non-secret bootstrap name. Supply a real name and uncomment the line to enable
loading. Development uses developer Azure identity; Azure uses managed identity.
Environment variables/CLI overrides win over vault values. No secrets are printed
or included in configuration validation messages. This run did not contact a vault.

Foundation and SQL connection options validate at startup even while vault loading
is skipped. Development's localhost/Integrated Security connection is only a
non-secret placeholder. It does not prove local SQL authentication or connectivity.
Base configuration is empty so non-Development hosts must supply a connection.
The API health endpoint is process liveness, not database/vault readiness. No host
opens SQL connections, creates a schema or runs migrations automatically at startup.

Functions now uses the real isolated worker and host, not a standalone Generic Host.
The example local settings select dotnet-isolated/Development without credentials.
The empty host requires no storage connection; add host-level storage/trigger
settings with the first trigger. Secrets loaded in worker Program do not configure
external trigger bindings in the separate Functions host.

## Validation evidence (2026-11-05)

- NuGet restore succeeded after the patched cryptography pin.
- The solution built successfully. On first Functions build, the SDK emitted
  AZFW0108 while bootstrapping/restoring its generated extensions project; later
  builds use the restored artifacts. The final solution build passed with zero
  warnings/errors; dotnet format --verify-no-changes also passed.
- 24 tests passed: 12 architecture, 11 configuration/registration, 1 HTTP.
- Domain/Application test projects intentionally contain no placeholder tests.
- The actual Azure Functions host was started through the root-level dotnet run
  command on port 7075. Worker indexing loaded Worker 2.52.0 on .NET 10.0.14;
  zero functions were found and Job host started, as expected for an empty host.
- The API was also launched as a separate process through its documented command;
  GET /health returned HTTP 200 Healthy.
- Core Tools was 4.7.0. The root-level launch required normalizing the SDK's relative
  run directory; the project target keeps this portable without machine paths.
- SQL registration tests verify the selected provider and scope lifetime without
  opening a connection. No query, transaction or migration correctness is claimed.

## Outstanding work

Provision/configure an actual SQL Server and credentials when introducing the first
persistence behavior; add SQL Server integration tests then. Supply a real vault
only when ready to uncomment loading and verify access. Choose staff/customer Entra
requirements in the identity block. No Azure resources were provisioned, and no
commit, push or deployment was performed. No sample business features were added.

## Platform references

- [EF Core SQL Server provider](https://learn.microsoft.com/en-us/ef/core/providers/sql-server/)
- [Azure Functions isolated worker](https://learn.microsoft.com/en-us/azure/azure-functions/dotnet-isolated-process-guide)
- [Azure Functions SDK](https://github.com/Azure/azure-functions-dotnet-worker/blob/main/src/Azure.Functions.Sdk/README.md)

## Tasks follow-up (2026-11-05)

The first feature is implemented through Domain/Tasks, Application/Tasks,
Infrastructure/Persistence/Configurations and Migrations, and Api/Controllers/Tasks.
API models are distinct and explicitly mapped. Four anonymous, operation-named
controllers (`GetTask`, `CreateTask`, `ReplaceTask`, `DeleteTask`) call ITaskService;
input validation uses DataAnnotations and `TrimmedMaxLengthAttribute` on the API
request contracts, while `TaskItem` guards domain invariants; the service uses Tasks
through IApplicationDbContext. No list, repository, mediator, mapper, authentication
provider or portal changes were added.

CreateTasks migration 20261105112714 includes its Designer and snapshot and was
applied only to AngularApiTemplate_Tasks_Development in angular-template-tasks-sql
on 127.0.0.1:11433. HTTP tests use and delete their own uniquely named local SQL Server
database. The live API CRUD smoke run verified 201 + Location, 200 retrieval/update,
204 deletion and 404 afterward. See README for repeatable scripts and HTTP examples.

The generated Functions extension project needed the SDK version in global.json's
msbuild-sdks section for repeatable full builds; that pin is now explicit.

Final Tasks verification: solution build succeeded with zero warnings/errors;
52 checks passed (12 dependency/package architecture checks, 6 domain tests,
11 configuration/registration tests, 23 HTTP/controller checks). SQL Server HTTP
checks cover the CRUD lifecycle, POST Location, missing records, validation limits,
required PUT fields, malformed IDs, persistence and absence of a list endpoint.
The live process smoke check also passed the complete CRUD lifecycle.

## Angular communication follow-up (2026-11-05)

The user approved adding GET /tasks as a plain TaskResponse array, superseding the
original no-list scope. ListTasks.cs calls ITaskService.ListAsync; the Application
service projects a no-tracking SQL query. No pagination, filters, envelope or new
migration was introduced. OpenAPI metadata for list/create/get/delete now agrees
with actual 200/201/204/400/404 responses. Existing operation-named controllers and
DataAnnotations validation changes from the other local work were preserved.

Angular adds features/tasks/{components,models,services,store}, a lazy TasksModule
and routing module, typed contracts/API service/error mapper, NgRx actions/effects/
reducer/selectors/facade and typed list/create/detail components. Root composition
adds one HttpClient, API URL token, root Store and /api development proxy. Matching
NgRx Store/Effects 22.0.1 were added; Angular/RxJS were not upgraded. Portal rules are
maintained in architecture.md and referenced by the scoped GitHub instructions.

Verified: 19 portal tests; strict TypeScript and template checking; production build
with a separate 56.60 kB Tasks lazy chunk; 53 backend checks and a zero-warning build;
.NET formatting verification. The improved collection HTTP test passed against SQL
Server after the full suite, verifying new tasks appear and deleted tasks disappear.

Real browser verification through Angular's dev proxy exercised list, form create,
direct detail navigation and browser refresh, confirmed deletion on both list and
detail pages, and successful return to the empty list. Direct API requests confirmed
persistence/deletion. Browser offline simulation displayed a connection error and
recovered after reconnecting and retrying; server-error/mutation-failure recovery
was verified in the mocked effect/router tests. Test-created development tasks were
removed; temporary SQL test databases were dropped by the fixture.

Production hosting/proxying and authentication remain future blocks. The API remains
anonymous; no portal update/edit flow was added. The reference customer Portal was
read-only, without BackOfficePortal or embedded backoffice implementation references.
No commit, push, deployment or Azure provisioning was performed.


## Portal lifecycle audit follow-up (2026-11-05)

Inspected the single Angular app and lazy Tasks feature, root/feature registration,
all production subscriptions, selectors/reducer/effects, route components/templates,
HTTP service and existing tests. No shared Angular library, authentication provider,
custom route-reuse strategy, third-party widget, script loader, polling task, global
DOM listener, persisted cache or signal interop/effect exists in current portal code.
Installed and lockfile versions agree: Angular 22.2.4, NgRx Store/Effects 22.0.1,
RxJS 7.8.2, build/CLI 22.2.6, TypeScript 6.0.3, Vitest 5.1.0, jsdom 30.1.3.

Confirmed application-lifetime growth of settled deletion entries in TasksState.
Successful deletes now remove their entry; failed deletes retain errors only for
tasks visible on the active list/detail. Pending mutations still settle after
navigation, concurrent per-ID gates remain unchanged, and page-owned reads cancel
on departure. Regression tests cover 100 distinct deletions, departed-view failure
cleanup and five repeated routed list/detail departures with pending HTTP cancellation.
Existing facade synchronous one-shot guards, async templates, DestroyRef route
subscription and effect inner-request cancellation were verified as appropriate.

Architecture now owns mandatory ownership/cleanup rules and illustrative component,
higher-order stream, async widget and session reset examples. AGENTS and scoped portal
instructions point there. Future integrations must enforce replacement/destruction,
auth boundaries and bounded retention without copying unrelated product behavior.

Validation: 21 tests passed in five files; strict app TypeScript check and production
build passed with a separate 57.03 kB Tasks lazy chunk. An initial npm test invocation
at repository root failed because package.json lives in the portal; the corrected
portal command passed. No backend changes or backend validation in this audit.
Installed Angular AsyncPipe/takeUntilDestroyed/router and RxJS take/switchMap/
shareReplay source informed lifecycle analysis. No browser heap/GC or live API/SQL
run was performed for this audit; earlier browser evidence above belongs to the
communication implementation and does not establish memory cleanup. No commits,
pushes, publishing, deployment or provisioning.

## Portal best-practices review follow-up (2026-11-05)

Replaced legacy `TasksModule` and `TasksRoutingModule` with standalone `TASKS_ROUTES`
(`tasks.routes.ts`) providing feature-scoped state, effects, facade and HTTP service,
and added root `provideEffects()` in `app.config.ts`. Narrowed `selectDetailViewModel`
and `selectListViewModel` input selectors to specific feature slices so unrelated state
transitions preserve memoized view-model references. Hardened `isProblemDetails` to
accept `null`/optional properties without discarding validation errors, updated
post-create/post-delete navigation checks in `TasksEffects` to strip URL fragments and
matrix parameters, guarded the idle/empty list template branch, restored Safari list
semantics with `role="list"`, and improved form accessibility (`aria-invalid` and
`aria-describedby` synchronization with hints placed above controls). Added `typecheck`
and `format:check` scripts, updated `package.json` dependency ranges to match the latest
supported Angular/NgRx/RxJS/tooling releases (upgrading `jsdom` to `31.0.0` while keeping
`typescript` at `~6.0.3` per Angular 22.2's `>=6.0 <6.1` peer constraint), and updated
portal documentation.

Validation: 22 tests passed in five files; `npm run typecheck`, `npm run format:check`,
and `npm run build` passed with a separate 53.55 kB `tasks-routes` lazy chunk.

## Convention audit follow-up (2026-11-05)

Explicit C# imports now live only in each project's GlobalUsings.cs, including tests
and checked-in migration artifacts. SDK implicit imports and disposal using statements
remain supported. Newly generated migrations require import normalization before
validation. HTTP contracts are classes with init properties; Application contracts
remain records. Controller action methods use operation names with Async suffixes.
PUT now declares its 200/400/404 response metadata. Multiline service expressions use
block bodies. Source/controller checks cover centralized imports, API contract classes,
action naming and response statuses. These conventions supersede the earlier handover's
common-import wording; docs/architecture.md remains authoritative.

Verification for this follow-up: solution restore and build passed with zero build
warnings/errors; formatting verification passed; 54 tests passed (13 architecture,
6 domain, 11 infrastructure, 24 API/controller checks), including real SQL Server
HTTP persistence and validation. HTTP assertions compare contract fields explicitly
rather than relying on record equality. The Application test project remains empty
by design. No Portal behavior changed; no browser verification was repeated.

## Direct localhost API and CORS follow-up (2026-11-05)

Angular environment.apiBaseUrl now targets http://localhost:5111, matching the .NET
HTTP launch profile. The dev server no longer uses its proxy configuration.
API composition reads the Cors:AllowedOrigins array into a named policy, applied
after routing. Base settings allow no origins; Development allows the portal at
http://localhost:4200. No credentialed CORS or wildcard origin was introduced.
Same Page Program.cs was reviewed read-only for its configuration-key/policy approach;
no Same Page code, settings or credentials were modified.

Verified the live portal at http://localhost:4200/tasks renders "No tasks yet" using
the local SQL-backed API. GET http://localhost:5111/tasks returns 200 with [] and
Access-Control-Allow-Origin: http://localhost:4200. Both local processes remain running.
Preflight tests allow 4200 and reject 5200 and an unrelated origin. All 57 backend
checks and 22 portal tests passed; strict app TypeScript, production portal build and
.NET formatting verification passed. The default shell dotnet lacked the pinned SDK;
validation succeeded with the isolated SDK documented in README.

## Entity configuration ownership follow-up (2026-11-05)

Supersedes the earlier domain-length-guard decision. Existing TaskItemConfiguration
now owns the unchanged SQL lengths (Title 200, Description 2000). Domain storage
constants and length guards were removed; the nonblank-title rule and trimming remain.
API-local TaskRequestLimits supplies both HTTP contracts. No relational schema change
is intended and migration artifacts were left unchanged. New domain regressions cover
in-memory values beyond storage limits and atomic rejection of a blank replacement.
New model checks compare both HTTP contracts to SQL Server metadata and the existing
migration snapshot without connecting. Architecture documents validation ownership,
non-HTTP entry-point responsibilities and a linked reusable configuration prompt.
Same Page was inspected read-only, including actual Data/Config implementations.

Verification on this Windows machine completed after installing SDK 10.0.403 at
C:/Users/Anon/.dotnet and selecting it through DOTNET_ROOT/PATH (README has PowerShell
commands). Solution/tool restore passed; final solution build passed with zero
warnings/errors. First Functions build emitted AZFW0108 while restoring generated
extensions; the subsequent build was clean. dotnet format --verify-no-changes and
git diff --check passed after preserving LF checkout endings with local
core.autocrlf=input. No additional source changes resulted from formatting.

All 60 backend tests passed: 13 architecture, 7 domain, 11 infrastructure and 29 API
checks, including the new HTTP/model/snapshot alignment tests and real SQL Server
HTTP persistence/validation. Application.Tests remains intentionally empty. Initial
SQL tests failed because the dedicated database setup was absent; after Docker
Desktop recovered and scripts/tasks-local.py up started the dedicated SQL Server 2022
container on 127.0.0.1:11433, scripts/tasks-local.py test passed in full. The fixture
applied migrations only to its unique test database. Private generated SQL credentials
remain ignored with a user-only Windows ACL. Portal/browser verification was not
repeated for this backend-only change. No commit, push, deployment or Azure provisioning
occurred.

## Portal CRUD, component architecture and Entra readiness follow-up (2026-11-05)

Completed the Portal Tasks CRUD lifecycle by adding `PUT /tasks/{id}` replacement
(`createReplaceTaskRequest`, `TasksApiService.replace`, `TasksActions` edit/update
events, `update$` effect with `exhaustMap`, reducer/selector `UpdateViewModel` slice,
extracted `task-edit.form.ts` and presentational `TaskEditFormComponent` orchestrated
by `TaskDetailComponent`). Replaced `Store.select + take(1).subscribe(...)` guards in
`TasksFacade` with synchronous `Store.selectSignal` reads so the facade has zero manual
subscriptions, removed the unread `created` snapshot from `TasksState`, restored static
`aria-describedby` field hint associations on the create and edit forms, added explicit
401/403 messages in `toApiError`, and added `docs/prompts/configure-entra-authentication.md`
for the upcoming Microsoft Entra ID (MSAL) block.


## Entra External ID customer authentication scaffold (2026-11-05)

Implemented the agreed native/custom customer route with email one-time codes and
non-secret placeholders. Both API Entra:Enabled and Portal authConfig.enabled are
false by default, so startup and anonymous Tasks still work. The shared Customer
policy attributes remain on all five Tasks controllers; the disabled policy bypass
is central rather than manually commenting each attribute. Enabled mode validates
CIAM tenant/API configuration at startup and uses Microsoft.Identity.Web 4.17.0 /
JwtBearer. It requires an authenticated delegated customer (oid/scp), with no paid
status, per-endpoint scope matrix or business roles. Health remains anonymous.
Tasks is still a shared collection; no identity or schema changes reached Domain,
Application, Infrastructure or Functions as part of this auth block.

Portal MSAL Browser 5.28.0 (MSAL Common 16.16.0) is dynamically loaded from core/auth.
The native SDK is used directly; MSAL Angular's hosted-flow wrapper is not installed.
Custom /login handles signup, sign-in, email-code verification, local sign-out and
safe return to Tasks. The single root HTTP interceptor adds API tokens only across
the configured origin/path boundary. A functional canMatch prevents anonymous
loading of protected routes when enabled. Root monotonic session generation resets
registered feature state, cancels active Tasks reads and mutations, closes delete
groups and rejects stale successes/failures and navigation/refresh side effects.
SDK events are removed on root destruction; page departure invalidates native flow
continuations and clears obsolete completed accounts before releasing the gate.
No token, raw SDK account or HttpErrorResponse is stored in NgRx.

Real native auth requires the external tenant, public-client/API registrations,
email-OTP user flow, delegated API permission and a configured native-auth CORS
proxy. These are explicit integration placeholders in README, not resources created
or verified here. Live Entra signup/sign-in, real token refresh, proxy forwarding,
MFA, federation and extra signup attribute challenges have not been exercised.
Session tests use an SDK mock, and API JWT tests use real signature/issuer/audience/
expiry validation against test-only local signing metadata; they do not contact Entra.

Verification: solution restore and final dotnet build passed with zero warnings or
errors; dotnet format --verify-no-changes passed. All 73 backend tests passed (13
architecture, 7 domain, 11 infrastructure and 42 API), including SQL-backed
authenticated CRUD (200/201/204), anonymous 401, app-only 403, invalid signature,
audience, issuer and expired-token rejection, config validation and disabled-mode
regressions. The dedicated local SQL container was started after the first run
found it stopped; test fixtures migrated/dropped only their isolated databases.
The temporary API used for browser verification was stopped to release Windows
build locks before the final clean build, then restarted. The local API and Portal
dev servers remain running with authentication disabled.

Portal typecheck, format:check, 42 tests across seven files and production build
passed. Tests cover canMatch lazy loading, bearer URL boundaries, disabled bypass,
401/403 serialization, all five in-flight operation cancellations, feature reset,
late responses, lazy registration after session changes, native signup/sign-in,
SDK callback removal, account/tenant generation and late native account cleanup.
An existing edit-form HTML formatting issue was normalized for the required check.
Final production output has a 289.22 kB initial bundle, separate 26.95 kB Tasks lazy
chunk and dynamically loaded 429.75 kB MSAL SDK chunk. Browser verification against
the local SQL-backed API confirmed /login's disabled message and navigation to an
empty Tasks list, without contacting Entra. No heap/GC profiling was performed.

README, architecture and the reusable auth prompt now describe this agreed native
scope and setup. Work stayed on init with pre-existing edits preserved. No commit,
push, deployment or Azure provisioning was performed.

## Real development Entra setup (2026-11-05)

User authorized a reusable local-development external tenant under Totality and
created it from the prepared review screen, then completed administrator MFA.
Totality Development Local (`1992ca53-10eb-45a4-b028-e6c430a6e70e`,
`totalitylocaldev.onmicrosoft.com`) is linked to the existing Totality subscription
through Totality-Identity-Dev in UK South. Directory country is United Kingdom,
with Europe directory residency. No SMS, Front Door, Azure app hosting, premium
add-on, secret, production identity or Bicep deployment was provisioned.

Created AngularApiTemplate API - Local and AngularApiTemplate Portal - Local.
API client ID is bdc716c2-1a0f-4e37-a304-d9d881c5ef8d; Portal client ID is
3bc9a510-7769-40da-977d-2d08d7199c91. Verified API manifest token version 2 and
defined access_as_customer (scope ID a28f1d8c-dcfa-46a5-af6a-e036d3ad660b).
User approved Microsoft Platform Policies for both registrations and separately
approved the Portal's development-only delegated API grant. Portal public-client
and native authentication are enabled, its SPA callback is localhost:4200/login,
and its unused default Graph User.Read permission was removed. Created
LocalEmailSignupSignin using email OTP and no additional signup attributes, then
verified the Portal appears in its Applications list. Other projects need their
own registrations/scopes; this tenant's customer directory/settings are shared.

Added opt-in Angular local-entra configuration and start:entra, public development
values, API Development Entra IDs and tasks-local.py run-entra. Default template
and production settings remain disabled/placeholders. Added a loopback-only local
native-auth proxy with fixed tenant/client/origin, endpoint/header/method checks,
bounded bodies/timeouts, cancellation, no caching and no credential/body logging.
README and architecture describe values, boundaries and repeatable launch commands.

Verification: 42 Portal tests, strict typecheck, formatting, default production
build and development/local-entra build passed. All 73 backend tests and solution
build (zero warnings/errors) and .NET formatting passed. The placeholder-startup
test now supplies its own invalid placeholders explicitly rather than depending
on Development JSON remaining invalid. Seven live local proxy checks passed for
health/CORS and rejection of unapproved origin/header/path/method/client, without
contacting Entra. Live API /health returned 200 and anonymous /tasks returned 401
after replacing the existing disabled-mode API with run-entra. Proxy, Portal and
API were left running for customer testing; no source commit/push occurred.

Live custom Angular signup reached Entra and requested email verification for the
user-approved test address. The submitted code produced the application's generic
verification error. Subsequent diagnosis found an accepted OTP/token HTTP 200
response containing only an access token: supplying the API scope replaced native
MSAL's default OIDC scopes. AuthService now explicitly includes openid, profile and
offline_access with the API scope for sign-in, signup continuation and access-token
acquisition. Earlier attempts also returned invalid_oob_value/501811; do not label
every generic verification error an incorrect code. Error copy now distinguishes
an invalid/expired code from failure to complete sign-in, without provider details.

Final live verification used the user's single in-app-browser session. Entra's
native token endpoint returned 200, the app established its SDK session and
navigated to /tasks, and the real SQL-backed protected API GET /tasks returned 200.
A full page reload restored the signed-in session and another GET /tasks returned
200 without a new email code. Earlier anonymous GET /tasks returned 401. This
proves real email-code sign-in, proxy forwarding, token acquisition, bearer API
validation and cached session restoration. Refresh-token renewal after expiry,
fresh-account automatic signup continuation, MFA/federation and full authenticated
CRUD were not re-exercised in this live follow-up. Existing backend tests cover
authenticated CRUD using local test signing metadata.

After the scope/error fix, 43 Portal tests, strict typecheck, production build and
formatting passed. Regression expectations cover OIDC+API scopes for ordinary
sign-in, signup continuation and access-token acquisition, plus specific invalid
code messaging without leaking provider descriptions. Backend code did not change
after its 73-test/build/format verification. Local screenshots are in ignored
.local/entra-setup; authenticated-tasks.png records the working signed-in page.
Temporary browser Network diagnostics were disabled after verification; no tokens
or verification codes were written to source or logs. Bicep remains deferred.

## Backend directory restructure (2026-11-05)

Moved the .NET solution, src, tests, Directory.Build.props, global.json and local
EF tool manifest into AngularApiTemplate.Api, alongside AngularApiTemplate.Portal.
Shared documentation, scripts and ignored local state remain at repository root.
Updated startup commands, helper working directories and scoped agent instructions.
Project references and architecture root discovery remain relative to the solution.

Validation after relocation: all 73 backend tests passed against isolated SQL
test databases, solution build passed with zero warnings/errors, EF tool restore
and .NET formatting passed. Portal 43 tests, typecheck, formatting and production
build passed before the backend-only move. Restarted the Entra-enabled local API
from its new location. No database or Azure resources were changed by the move.
