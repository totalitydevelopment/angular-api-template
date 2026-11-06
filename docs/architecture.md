# Backend architecture and engineering conventions

This is the durable source of architecture and coding decisions. Agent and GitHub
instruction files point here. README owns runnable setup commands. The foundation
handover records scope, reference decisions and verification evidence.

The backend solution, source, tests and .NET configuration live under
`AngularApiTemplate.Api/`; the Angular app lives under `AngularApiTemplate.Portal/`.
Shared documentation and orchestration scripts remain at the repository root.

## Project ownership

| Project | Owns | Direct project references |
| --- | --- | --- |
| Domain | Entities, aggregates, value objects, business invariants, plain domain events | None |
| Application | Application service interfaces/implementations, use-case request/results, validation, persistence interfaces | Domain |
| Infrastructure | Concrete EF context, SQL Server configuration, entity configurations, migrations, external integrations | Application, Domain |
| Api | HTTP endpoints, HTTP contracts, explicit mapping, Entra authentication, host composition | Application, Infrastructure |
| Functions | Thin Azure Functions isolated-worker entry points and host composition | Application, Infrastructure |

Host references to Infrastructure are for composition and registration. Endpoint
and Function business workflows call focused Application service interfaces, even
when a workflow currently has one caller. Domain behavior protects invariants;
Application orchestrates a use case. Functions must not reference Api. Application
must not reference API models, MVC, HttpContext, HTTP results or Infrastructure.
Domain stays framework-independent. Each project owns cohesive DI registrations.
No shared helpers project, service locator or mutable static state.

## Application services and persistence

Application intentionally references EF Core. Its `Persistence/IApplicationDbContext`
is implemented by Infrastructure's `Persistence/AppDbContext`. It exposes
`Tasks` and `SaveChangesAsync`; add further explicit `DbSet<TEntity>` properties to
both interface and context alongside their use cases. Do not add a generic Set method
or speculative persistence abstractions.
Register service implementations in Application's `AddApplication` with scoped
lifetimes when they use the scoped context.

Services write ordinary EF LINQ through this interface. Do not introduce generic
repositories, specifications, mediators, mapping libraries or a custom persistence
framework. Project reads directly to the use case's Application result, selecting
only required columns; avoid loading a graph merely to map it. Use AsNoTracking for
read-only entity queries and tracking for mutations. Each Include/ThenInclude chain
must describe its own navigation branch. Do not assume authorization guarantees
existence or uniqueness; use explicit expected not-found handling where appropriate.

Application use cases own save/transaction boundaries. SaveChangesAsync provides EF's
normal transaction semantics for that save; operations spanning multiple saves or
external systems need an explicit strategy and failure tests. Do not share a DbContext
between parallel operations or retain it in singleton services. Scoped interface and
concrete context resolve to the same instance. Both hosts register SQL Server through
Infrastructure. No connections, migrations or schema changes happen automatically at
startup, and no retry policy silently replays a use case.

Infrastructure owns fluent entity mappings, discovered through its assembly, so
Domain needs no EF attributes. Migrations must include the migration `.cs`, its
`.Designer.cs`, and the updated `AppDbContextModelSnapshot.cs`. Generate and inspect
all artifacts together. CreateTasks is the first migration, with its Designer and
model snapshot. The local dotnet-ef tool is pinned in AngularApiTemplate.Api/dotnet-tools.json. Apply
migrations only to an explicitly identified local development database in this block.

## Entity configuration and validation ownership

Every persisted domain entity has an explicit `<Entity>Configuration` implementing
`IEntityTypeConfiguration<TEntity>` under Infrastructure/Persistence/Configurations.
Configure keys, tables, required/optional columns, lengths, precision, indexes,
relationships and delete behavior there, as applicable to the actual model.
AppDbContext discovers these configurations with ApplyConfigurationsFromAssembly;
do not manually create configuration instances or add a parallel configuration system.
TaskItemConfiguration is the working example.

Domain objects must not contain schema lengths/constants, EF attributes, column types,
table/index settings or references to Infrastructure configuration. They remain usable
in memory. Keep actual business invariants and normalization in domain behavior:
TaskItem requires a nonblank title and trims it, but does not enforce 200/2,000-character
storage limits. Do not remove genuine business rules merely because HTTP also checks
input. A future business-specific length rule needs an explicit domain rationale.

API request DataAnnotations own HTTP shape/length validation and return 400 before
application workflows. TaskRequestLimits is API-local and shares values between
create/replace contracts. Infrastructure owns its separate schema declarations;
API code must not import EF configuration to obtain validation constants. The two
boundaries intentionally describe matching limits, without repeating runtime length
validation in Domain or Application. TaskValidationConfigurationTests checks both
request models against the SQL Server model without opening a connection, and checks
that the model still agrees with the migration snapshot. This does not replace SQL
Server integration tests. Angular form limits provide immediate user feedback only.

EF HasMaxLength configures the schema; it is not automatic pre-save validation.
SQL Server remains the persistence backstop. Functions and future non-HTTP entry
points bypass HTTP validation: validate their transport/input contracts before calling
Application, rather than assuming API validation ran. Do not add speculative validators
or translate arbitrary database failures into input-validation errors.

Reference evidence: Same Page's infrastructure/data-access.instructions.md documents
one fluent configuration per entity and assembly discovery. Its actual Data/Config
WaitlistSignupConfiguration and UserBlockConfiguration demonstrate field configuration,
keys, indexes and relationships; their product constants/schema conventions are not
part of this template. The reference documentation's Configurations folder differs
from its actual Config folder; this template retains its existing Configurations path.

For a reusable implementation prompt, see [entity configuration prompt](prompts/configure-domain-entity.md).

### Aggregate boundaries, foreign keys, and child collections

Decide aggregate ownership and navigation properties using bounded cardinality, true invariant protection, and separate read/write patterns:

- **Foreign key + navigation property on dependents:** When an entity references shared catalogue/reference data (for example, `Business` referencing `Subscription`), expose both the foreign key (`Guid SubscriptionId`) and a nullable navigation property (`Subscription? Subscription`) on `Business`, while keeping `Subscription` free of a `BusinessId` back-reference. Domain creation and mutation methods take `SubscriptionId` directly so callers can set or change the relationship without loading the `Subscription` entity first. Read queries in Application use the `Subscription` navigation inside `.AsNoTracking()` + `.Select(...)` projections so EF Core generates a SQL `JOIN` for required columns (such as `b.Subscription!.Title`) without needing `.Include()`.
- **No post-save reload after creation:** When creating an entity (`Business.Create(...)`), do not follow `SaveChangesAsync` with a second `.Include()` query to reload navigation properties for the response. If the use case looks up reference records before creation (for example, querying the Free Trial `Subscription` id and title, or validating submitted `Report` ids), construct the Application result directly from the in-memory entity and those pre-fetched values.
- **Owned child collections vs. separate aggregates:** Keep a child collection on the aggregate root (for example, `IReadOnlyCollection<BusinessReport>` on `Business`, loaded with `.Include(b => b.BusinessReports)` and mutated through a domain method like `business.SetActiveReports(reportIds)`) when two conditions hold:
  1. **Bounded, small cardinality:** The collection has a small, predictable upper bound (such as 5–20 selected report join rows per business), never an unbounded history or transaction log.
  2. **Whole-set mutation or cross-collection invariants:** The collection is synced as a set (such as an onboarding checklist) or the parent enforces a business rule across the collection (such as plan-based report limits).
- **Preventing a "God Aggregate":** Do not attach every tenant-related concept (`BusinessGoals`, `TeamMembers`, `XeroConnections`) as child collections on `Business`. Entities with their own independent lifecycles, screens, or unbounded growth should be separate aggregate roots linked by `BusinessId` and queried or mutated directly through their own `DbSet` on `IApplicationDbContext`. This avoids data over-fetching, false concurrency conflicts on the parent row, and `.Include()` creep.
- **Targeted `.Include()` on writes only:** Never use `.Include()` for read-only endpoints; project with `.Select(...)`. On mutations, `.Include()` only the specific child collection that the current use case mutates (for example, include `BusinessReports` when updating the report selection, but omit it when updating the business profile).

## Contract ownership and mapping

| Model | Location | Consumers |
| --- | --- | --- |
| Domain entity/value object | Domain | Application, Infrastructure |
| Use-case request/result | Application, beside the service/use case | Application, API, Functions |
| HTTP request/response | API, beside the endpoint/feature | API |
| Provider payload | Infrastructure, beside the integration | Infrastructure |

Only explicitly defined API response models may be serialized as business HTTP
responses. Never return entities, tracked objects or Application results directly.
Health text, framework ProblemDetails and OpenAPI are infrastructure endpoints,
not business responses. Application does not know serialization or HTTP concerns.

API request/response contracts use classes (not records), init properties and required
where needed. Application use-case contracts may remain records. Endpoint code creates
Application requests explicitly, calls a service interface, then creates an API
response with an object initializer. Small mapping methods are permitted only to
remove actual repetition. No AutoMapper, Mapster or generic mapper interface. Results
should describe use-case output; do not add an entity-shaped intermediate DTO before
a useful result projection. Tasks is the first concrete example of these boundaries.

## HTTP and Functions entry points

Organize controllers by feature directory, with one HTTP action per operation-named
controller class/file (for example `GetTask.cs`, `CreateTask.cs`, `ReplaceTask.cs`
and `DeleteTask.cs`). Name action methods after their operation with an Async suffix
(for example `CreateTaskAsync`), rather than the raw HTTP verb. Document each
operation’s success, validation and not-found responses with ProducesResponseType
where applicable. Use ControllerBase, ApiController, explicit routing
and binding, typed ActionResult<TResponse>, and primary-constructor DI where simple.
Prefer resource-based routes. GET must never perform business writes.
Entra authentication and the shared Customer policy belong to Api. Current-user
access is deferred until a use case needs caller identity. Health is
public process liveness only. No Firebase dependencies.

The Tasks controllers declare the Customer authorization policy. Authentication is
disabled by default for the runnable template; enabling Entra activates this policy. ListTasks now supplies the collection GET. Routes
use /tasks and /tasks/{id}; no API version prefix is configured in this template.
POST returns 201 with a Location generated from the named GET route; GET and PUT
return 200 API response models; DELETE returns 204 with no body; missing records
return 404. Invalid fields, malformed IDs and missing required JSON properties return
400 ValidationProblemDetails. Input shape and field-limit validation on HTTP requests
use DataAnnotations and custom ValidationAttribute classes on the API request models
(`Required`, `MaxLength`, `TrimmedMaxLength`) so `[ApiController]` rejects invalid
requests before reaching the controller action or Application service. PUT requires
Title, Description (nullable) and IsCompleted explicitly. API-owned TaskRequestLimits define request lengths; EF configurations own column
lengths. TaskItem guards only its nonblank-title business invariant and trims titles. Invalid writes do not save; GET projects a no-tracking
Application result and never calls SaveChanges. Only explicitly constructed
TaskResponse objects cross the HTTP business boundary.

Functions use the isolated .NET worker. Trigger methods, when added, deserialize
transport payloads, call Application interfaces and map outcomes for the transport.
Do not duplicate controller workflows or access AppDbContext in processors. Propagate
cancellation. Delivery, idempotency, retries and settlement must be explicit when a
trigger arrives. Do not copy the claim that every Service Bus exception immediately
dead-letters a message; verify the chosen trigger's retry/settlement behavior. No
trigger, Service Bus package or business processor is added to the empty host.

## Configuration and secrets

Host defaults load base settings, environment-specific JSON, optional developer
user secrets supported by the host, environment variables and command-line values.
Bootstrap environment/vault name is available before a vault is contacted. The
shared Infrastructure loader adds Key Vault, then reapplies environment variables
and command-line arguments, so their explicit overrides win. Only worker/application
configuration sees secrets added inside Functions Program; future trigger connection
settings must be configured for the Functions host itself (for example via Azure
app settings/Key Vault references), not assumed to come from worker DI configuration.

The vault name is non-secret and determines its HTTPS URI. Per the user's template
setup preference, the loader call remains commented out in each Program.cs. Set a
real KeyVault:Name and uncomment it to connect. There is no enabled flag. Development
uses developer Azure identity; Azure uses system-assigned managed identity. Once
called, invalid bootstrap configuration or vault failures abort startup; SDK error
details are not attached to the sanitized loading error.

ConnectionStrings and Foundation settings are typed and validated on startup.
Validation messages identify missing/invalid keys without echoing values. Connection
validation checks syntax/server/database, not credentials or network connectivity.
Base connection configuration is empty; Development has a non-secret local server
placeholder. Set real credentials through Key Vault or private environment settings.
Never check in passwords, connection strings containing credentials, access tokens,
API keys or production secrets. Never log configuration dumps, credentials, request
bodies or EF sensitive data. Do not enable EF sensitive-data logging in the template.
Production certificates must be validated; the local-only TrustServerCertificate
setting is not a production default.

## Coding and required validation

Use nullable references, file-scoped namespaces, layer-specific GlobalUsings.cs,
4-space C# indentation, braces, method-syntax LINQ and final newlines. All explicit namespace imports belong in each project’s `GlobalUsings.cs`, including
test projects and checked-in EF migration artifacts. Do not add file-local namespace,
static or alias imports. SDK implicit global usings remain enabled. Resource disposal
with `using`/`await using` is unaffected. After generating migrations, move their
imports into Infrastructure’s GlobalUsings.cs and verify the complete artifact set.
Order imports System first, then remaining namespaces alphabetically, matching
the repository formatter.
Use expression bodies only for simple one-line expressions; use block bodies for
multiline queries, projections and object initializers.
Prefer primary constructors for straightforward DI and immutable contracts. Comments
explain decisions rather than narrate code. Retain the commented vault-loading line
as the user's explicit setup switch. Prefer Guid.CreateVersion7 for new GUID entity
identities when the first model requires them; no mandatory identity base class.
Factories and domain methods protect invariants and controlled mutation.

Use asynchronous I/O with cancellation propagated through endpoints, Application and
Infrastructure. Avoid Result, Wait and Task.Run around synchronous I/O. Do not swallow
infrastructure errors as authorization outcomes. Use global HTTP exception handling;
catch only to translate an error safely or add useful context, without duplicate
logging or sensitive details. Keep domain events plain; later durable events need
an outbox or another explicit strategy for failure between commit and publication.

Run solution restore/build, architecture checks and tests for changed behavior.
Source convention tests enforce centralized imports and API contract classes;
controller convention tests enforce operation action names and response metadata.
Architecture tests inspect declared project/package/framework boundaries; they do
not prove runtime serialization or arbitrary future MSBuild imports are safe. Review
those concerns and extend enforcement with real features. Domain tests cover TaskItem invariants. Application service behavior is exercised
through SQL Server HTTP tests; its standalone test project has no placeholder tests. Persistence query/migration/transaction
behavior must be tested against SQL Server, not EF InMemory or SQLite as a substitute.
Context/provider registration checks do not open connections. The separate Tasks
HTTP suite applies the complete migration to a uniquely named local SQL Server test
database, exercises persistence and drops only that test database afterward.

Work on init. Keep README and handover current; report what was actually verified.
Do not commit, push, provision Azure resources or deploy without a separate request.

## Angular Portal communication conventions

Customer-facing Same Page Portal was inspected read-only, including its CLAUDE and
GitHub rules, lazy routing/auth module, HomeSetup facade/action/effect/service/result
flow, UserCouples selectors/template flow and Core HTTP interceptors. BackOfficePortal
and the embedded backoffice feature were not used as implementation references.
The reference has inconsistencies: some components bypass facades, error state uses
any, some reads/mutations use blanket mergeMap, and some rules conflict with newer
standalone Angular. Carry the intentional boundaries across, not those defects.

The destination remains Angular 22.2.4 and RxJS 7.8; only matching NgRx Store/Effects
22.0.1 packages were added. Root composition provides one HttpClient, the API URL
token and empty root Store/Effects infrastructure. `TASKS_ROUTES` (`tasks.routes.ts`) is
loaded through a dynamic import. State, effects, HTTP service and facade are provided
once on the lazy feature route. No Tasks implementation is eagerly imported at root.
Standalone OnPush components live in features/tasks/components/{task-list,task-create,
task-detail,task-edit-form,task-delete-confirmation}; contracts, services and store files
remain feature-local. Core contains only app-wide configuration/infrastructure; importing
its DI token is intentional. Shared is reserved for code with real reuse across features.
No generic CRUD/store factories.

Components use TasksFacade intent methods and typed observable view models. They do
not inject Store or HttpClient, and raw HTTP transport contracts do not leak into
component templates. Keep route components strictly focused on view orchestration, and
extract focused feature UI (`TaskEditFormComponent`, `TaskDeleteConfirmationComponent`)
into presentational components using signal `input()` and `output()`. Render observable
state with async pipe and modern @if/@for/@let blocks. Signals hold local confirmation
state, not server state. Extract reactive form construction, validation limits,
single-responsibility validators and explicit request mapping into dedicated form
modules (`task-create.form.ts`, `task-edit.form.ts`) rather than inlining validators,
magic numbers or payload normalization inside components. Construct request, error and
state operation models through explicit typed factory functions (`createTaskRequest`,
`createGetTaskRequest`, `createReplaceTaskRequest`, `createDeleteTaskRequest`,
`createApiError`, `createValidationError`, `createDeleteOperation`) rather than untyped
ad-hoc object literals. Avoid per-control `*Invalid` getters on component classes and
ternary ARIA attribute bindings in templates; use static `aria-describedby` hint IDs,
template `@let` control aliases (`control.touched && control.invalid`) for conditional
error messages and `.ng-touched.ng-invalid` CSS rules for invalid control styling. Place
field hints above controls, reserve role="alert" for critical submission/request errors,
and include role="list" on lists styled with list-style: none.
Use takeUntilDestroyed for component-owned manual subscriptions. The facade uses
`Store.selectSignal` for synchronous state guards (avoiding manual `take(1)`
subscriptions in facade intent methods); if an unfiltered `Store.select + take(1)` guard
is used elsewhere, do not generalize it to filtered or asynchronous streams. This replaces the reference's custom Destroyable inheritance using
the destination's supported Angular lifecycle APIs. Imports are Angular, libraries,
then application; avoid unused imports, any, contract-hiding casts and production
URLs/credentials. Entra native authentication is owned by core/auth; do not copy Firebase interceptors.

Actions use createActionGroup; createFeature/createReducer declare every state field;
selectors compose narrow feature child selectors (never the whole feature state object
when only specific slices are needed) to map endpoint responses (`GetTaskResponse`,
`ListTaskResponse`) into dedicated view models (`TaskDetailItemViewModel`,
`TaskRowViewModel`) with pre-formatted display labels, empty/loading states, update
view models and per-ID deletion view models without unnecessary recomputation.
Effects call the operation-specific service methods, catch errors inside the HTTP
observable and map them through the service-layer error mapper to plain ApiError
(including explicit 401/403/404/500 messages).
The ProblemDetails guard accepts null/optional fields without dropping validation errors.
Do not put HttpErrorResponse instances into state. Runtime immutability and
serializability checks are enabled. Pure immutable reducers own list/detail/create/update
statuses/errors independently without retaining unread creation snapshots, and maintain
deletion status/errors per task ID.

List/detail reads switchMap to the latest request. Detail data clears on ID changes;
leaving cancels the old read. List reads are cancelled on leaving or successful
mutations so stale snapshots cannot restore old data. Create and update use exhaustMap;
the facade also rejects duplicate pending submits. Deletes group by ID with an
exhaust gate per ID and merge groups for independent concurrent deletes. Groups
close on success/failure so subscriptions do not accumulate indefinitely. There are
no automatic mutation retries. Navigate only on successful create/detail-delete,
and only if the initiating route path (ignoring query strings, fragments and matrix
parameters) is still current.

A list reloads on every entry and explicit refresh, not on selector subscriptions.
Duplicate pending refreshes are guarded. Successful mutations invalidate the list;
a visible list reloads, and a later visit fetches fresh data. The approved list API
is GET /tasks returning TaskResponse[], without pagination/filter/query inputs.
The operation-specific list method therefore has no fabricated query/request DTO.
Create/Get/Replace/List response type names share TaskFields because the actual API
shares that shape. Replace (`PUT /tasks/{id}`) sends a typed replacement body (`title`,
`description`, `isCompleted`) and updates the active detail state in place on success.
Delete uses a typed route request and Observable<void>, with no body or response
envelope.

The API URL is configured by environment.apiBaseUrl and injected through API_BASE_URL.
Local development calls http://localhost:5111 directly (matching the API launch
profile); no Angular development proxy is used. API Cors:AllowedOrigins is an
explicit array: base settings allow no origins; Development allows
http://localhost:4200. CORS middleware runs after routing and before
authentication/authorization. Configure deployed API URLs and allowed portal origins
explicitly for each environment (see [ASP.NET Core CORS](https://learn.microsoft.com/en-us/aspnet/core/security/cors?view=aspnetcore-10.0)). Do not enable wildcard origins or credentialed
requests without an actual authentication requirement. Do not register another
feature-level HttpClient that bypasses root interceptors.

Run portal production build, strict TypeScript checking, unit/router-flow tests and
real browser checks against the local API/SQL Server. Check the separate Tasks lazy
chunk. Distinguish HTTP mocks/network failure simulation from actual API persistence.

Official references checked for this implementation:
[Angular HttpClient](https://angular.dev/guide/http/setup),
[Angular takeUntilDestroyed](https://angular.dev/api/core/rxjs-interop/takeUntilDestroyed),
[NgRx Effects](https://ngrx.io/guide/effects),
[NgRx feature effects](https://ngrx.io/api/effects/provideEffects),
[RxJS switchMap](https://rxjs.dev/api/operators/switchMap).
NgRx peer dependencies were also checked against the installed Angular/RxJS versions.


### Portal resource ownership and cleanup

For every subscription, timer, observer, listener, widget, cache or background task,
name its owner and expected lifetime. Lazy module providers and NgRx effects/state
can survive page navigation; feature scope does not mean page scope. Keep the
component → facade → action → effect → HTTP boundary and existing concurrency rules.

Use component DestroyRef with takeUntilDestroyed for each separately created manual
subscription. An async pipe, toSignal or another managed consumer does not clean up
a separate subscribe. Prefer async templates; no Destroyable base class is needed.
If inherited cleanup exists, preserve it when overriding destruction. Avoid nested
subscriptions; select switchMap/concatMap/exhaustMap/mergeMap by required concurrency.
Put lifetime teardown after higher-order work, retry and repeat so it also cancels
active inner work. A filtered take(1)/first may never match and still needs teardown.
A plain Subject destruction notifier does not replay destruction to late subscribers.

Component example (in an injection context; imports from Angular core,
core/rxjs-interop and RxJS):

```ts
private readonly destroyRef = inject(DestroyRef);

constructor() {
  this.facade.vm$.pipe(
    filter((vm) => vm.ready),
    take(1),
    takeUntilDestroyed(this.destroyRef),
  ).subscribe(() => this.onReady());
}
```

Higher-order example (only for component-owned work permitted by the feature's
boundaries; Tasks HTTP work remains in effects):

```ts
this.route.paramMap.pipe(
  map((params) => params.get('id')),
  distinctUntilChanged(),
  switchMap((id) => this.facade.watch(id)),
  takeUntilDestroyed(this.destroyRef),
).subscribe((value) => this.renderLocal(value));
```

Submission-time reads use current form values, local signals or the existing
synchronous unfiltered facade Store select + take(1) guard. Never create a persistent
listener just to obtain the current value. If that source becomes asynchronous or
filtered, revisit ownership and add cancellation. Framework-owned async pipes,
component-context signals/interop/effects and Angular listeners normally clean up;
do not add blanket unsubscribe code. Effects that start resources must register
onCleanup for both reruns and destruction. Custom injectors, manualCleanup and
references escaping into services/registries require explicit disposal analysis.

Async widget example below is a future integration pattern, not a Tasks dependency.
Widget is the provider's typed instance with mount/destroy; loadFactory returns its
typed factory. Register destruction before starting work. Recheck both destruction
and generation after every await; observable unsubscription cannot cancel a Promise.

```ts
private readonly destroyRef = inject(DestroyRef);
private generation = 0;
private widget: Widget | undefined;

constructor() {
  this.destroyRef.onDestroy(() => {
    ++this.generation;
    const widget = this.widget;
    this.widget = undefined;
    widget?.destroy();
  });
}

async initialize(host: HTMLElement): Promise<void> {
  const generation = ++this.generation;
  const previous = this.widget;
  this.widget = undefined;
  previous?.destroy();
  let candidate: Widget | undefined;
  const obsolete = () =>
    this.destroyRef.destroyed || generation !== this.generation;
  try {
    if (obsolete()) return;
    const factory = await this.loadFactory();
    if (obsolete()) return;
    candidate = await factory.create();
    if (obsolete()) return; // finally destroys the late result
    candidate.mount(host);
    if (obsolete()) return;
    this.widget = candidate;
    candidate = undefined; // ownership transferred
  } catch (error: unknown) {
    if (!obsolete()) this.showInitializationError(error);
  } finally {
    candidate?.destroy(); // includes partial mount failure
  }
}
```

Factories must clean partially allocated resources if create rejects before returning
an instance; adapt disposal to the provider's contract. Cancel script readiness
timers/retries on destruction/replacement, use bounded timeout/error paths and guard
late callbacks. Clear intervals/timeouts/animation frames, disconnect observers,
invoke Renderer2 listener teardown functions, and remove native listeners with the
same callback/capture setting. Release global closures/registries holding obsolete
DOM, destroy dynamic components/overlays, revoke object URLs and close sockets/workers
when their owner ends. Element-local cycles alone are not proof of retention.

Tasks reads are page-owned and close actions cancel active HTTP work. Mutations
intentionally settle after navigation (no retry); keep that behavior. Delete groups
close on settlement. Pending deletion records live until settlement; successful
records are removed, and failure records live only while their task is visible on
the active list/detail. Do not turn operation state into an unbounded history.
The latest list and create result are within-application retained snapshots, not
page instances. Future background tasks must specify cancellation, replacement,
completion/error behavior and auth boundaries before implementation.

Authentication now wires logout/account/tenant switching. At that boundary,
reset sensitive feature state, singleton subjects/caches and persisted data at the
same boundary and cancel old requests. Also attach a session generation to requests
and reject stale successes/failures in reducers, including already-running Promises.
Illustrative reducer rules (wire actual identity actions when identity is introduced):

```ts
on(sessionChanged, (state, { generation }) => ({
  ...initialState, generation,
})),
on(loadSucceeded, (state, { generation, response }) =>
  generation === state.generation ? { ...state, data: response } : state),
```

Cancellation belongs inside the effect's active inner request, with sessionChanged
as a cancellation source; apply the same generation guard to errors and mutations.
Disabled mode bypasses real authentication without fabricating a customer identity. For a
reusable developer handover prompt, see
[Entra authentication prompt](prompts/configure-entra-authentication.md).

Bound Maps/Sets, replay buffers and caches by actual ownership/eviction requirements.
For shareReplay specify buffer size, refCount, source completion and observable
ownership; RxJS 7.8 keeps completed replay values even with refCount true.
Document intentional retention that is not obvious, including lazy state lifetime.

Add focused regressions where lifetime risk warrants them: repeated mount/unmount,
inner cancellation, unmatched one-shots, late/replaced widget disposal and session
reset/stale-response rejection when those integrations exist. HTTP normally completes;
pending HTTP work is not automatically a permanent leak. Separate static ownership
evidence, mocked cancellation tests and browser retaining-path evidence. Warm up
browser flows, repeat them, collect garbage where available, compare retained
instances/detached DOM and inspect retaining paths; heap size alone is insufficient.


For lifecycle audits and changes, inspect this repository before applying lessons
from another application. Inventory all apps/libraries and lockfile/installed
Angular, RxJS, NgRx and widget versions, lifecycle/base-class conventions, facade
and state registration, route reuse, identity flows and test tools. Read applicable
agent instructions and referenced rules. Use version-matching official documentation
or installed framework source when behavior is uncertain; preserve the architecture.

Trace each suspected issue from creation through owner/lifetime, actual teardown,
external retaining reference, reachable caller and navigation flow. Inspect every
manual store/facade/service/router subscription independently, nested subscriptions,
repeated initialization, inherited destruction, unmatched one-shots, higher-order
operators and late subscriptions. Check script polling, async replacement and partial
initialization, background work, auth/session caches, global DOM closures and listener
identity, signals/effects and custom injectors, replay subjects/caches, NgRx effects,
dynamic components, overlays, object URLs, sockets and workers. Framework cleanup
(including QueryList destruction) and element-local listener cycles must be considered
before alleging a leak. Short timers, finite polling and application-lifetime resources
are not automatically defects.

Implement only confirmed ownership problems, with the smallest behavior-preserving
fix. Establish requirements before changing intentional background work. Classify
evidence as proven resource survival, plausible permanent retention, intentional
retention, bounded stale data or a profiling hypothesis; report unresolved questions
instead of speculative fixes. For each finding record severity, trigger, creation,
owner, expected lifetime, retaining reference, impact, confidence and exact file/line
references. Report apps/versions, instruction/example changes, correct patterns,
actual test/typecheck/build results, limitations and precise remaining profiling
steps. Do not claim browser confirmation from static inspection or mocks. Avoid
DevTools console variables, selected DOM nodes or measurement collections that
themselves retain inspected instances. Keep all work local unless separately asked.


### Entra customer authentication (2026-11-05)

The user selected public customer signup with custom Angular pages, placeholders,
and authentication disabled by default so the template remains runnable. Native
email one-time codes are the initial method. Any authenticated delegated customer
can use the shared Tasks collection. Paid access, user-owned data, business roles,
app-only callers and Graph provisioning are outside this block.

API Authentication/EntraOptions binds Entra and validates on startup when enabled:
CIAM HTTPS Instance, nonempty tenant/API GUIDs and a v2 Audience matching API ClientId.
Microsoft.Identity.Web composes JwtBearer. All Tasks controllers explicitly use
Authorize(Policy = Customer), which bypasses authorization only when Entra:Enabled
is false. When enabled it requires an authenticated identity, oid and a nonempty scp
claim, excluding app-only tokens. The scope is transport permission for this API,
not per-endpoint business authorization. Add future roles to this shared policy.
Health explicitly remains anonymous. Middleware is routing → explicit-origin CORS
→ authentication → authorization. No current-user abstraction, persistence change,
SQL migration or Application/Domain identity dependency was needed.

Portal core/auth exclusively owns MSAL, configuration, native signup/sign-in UI,
canMatch, token interceptor and session state. This supersedes the original hosted
redirect-flow handover: use @azure/msal-browser/custom-auth directly, without the
@azure/msal-angular hosted-flow wrapper. Native code exchange is an SDK-managed
native flow; do not describe it as a handwritten authorization-code/PKCE flow.
The SDK is dynamically imported only when enabled. A native-auth proxy URL is a
required external integration point because the provider's native endpoints do not
support browser CORS. No proxy or Azure resource is provisioned by this template.
See README for setup and the official proxy guidance.

One root HttpClient uses a functional interceptor with exact URL origin and path
boundary matching; no tokens go to other origins or sibling path prefixes. Tokens
and SDK account objects never enter NgRx. MSAL owns its sessionStorage cache; no
custom token persistence, credential logging or browser-wide localStorage cache is
introduced. Native startup uses handleRedirectPromise once for browser fallback,
not MsalService.handleRedirectObservable. No manual observable subscription is
created; SDK callbacks have DestroyRef removal. The root AuthService owns the one
SDK client and pending native flow. LoginComponent clears code/form flow on departure;
all asynchronous UI/auth continuations check destruction and an operation epoch.
Obsolete completed accounts are signed out before releasing the sign-in gate.

Root sessionChanged carries a strictly increasing generation. A root meta-reducer
resets all registered feature state (including Tasks to initialTasksState) and
preserves the new root generation. Root ownership also covers lazy registration
after login. Each HTTP effect captures generation at subscription time; all async
success/failure actions carry it. Inner requests and delete group durations cancel
on session change. The root reducer rejects stale responses, and effect-driven
navigation, invalidation and refresh filter old generations too. Requests already
accepted by the server may still commit after browser cancellation; there are no
automatic mutation retries. SDK cache identity is checked at startup, guarded
navigation, token acquisition and SDK events; changes of account/tenant reset the
session. Multi-account selection UI and cross-tab sessions are not implemented.
No polling, timers, global DOM listeners, route reuse strategy or widget resource
was added. Resource validation uses mocked cancellation/lifecycle tests; it does
not establish browser heap/GC retention evidence or live Entra correctness.

### Real local Entra configuration

Totality Development Local is a shared development external tenant. Each project
uses separate client/API registrations; production must use separately configured
identity resources. README owns actual IDs and commands. Default template and
production build authentication remain disabled/placeholders. `auth.values.ts`
owns default values; the explicit `local-entra` Angular configuration replaces it
with `auth.values.local.ts`. Validation/DI stay in `auth.config.ts`. API Development
JSON holds public development IDs; `tasks-local.py run-entra` opts in through
Entra__Enabled for that process. Never ship the development tenant as a production
default or copy credentials into either configuration.

`scripts/entra-proxy.mjs` is a local-only native-auth transport helper. It binds to
loopback, fixes upstream tenant/client/origin from public configuration, permits
only known signup/sign-in endpoints and POST with form bodies, checks CORS
preflights, bounds request size and timeout, aborts disconnected upstream work,
validates upstream TLS and refuses redirects. Never log credentials, continuation
tokens or response bodies. This is distinct from business API workflows and must
not gain persistence/Application responsibilities. Production proxying and Bicep
remain outside this setup.

Native authentication explicitly supplies openid/profile/offline_access with the
API scope for sign-in, signup continuation and token acquisition. Unlike an
assumption carried from hosted MSAL, native MSAL uses a nonempty supplied scope
list as-is instead of merging its defaults. A successful token HTTP response is
not proof of an established SDK account: verify ID/refresh token acquisition,
cached account restoration and the subsequent protected API request. Error copy
must distinguish an invalid OTP from failure to establish a session after it.
