# Angular API Template

A .NET 10 foundation and Angular 22 portal, developed on `init`.

## Prerequisites

- .NET SDK **10.0.403** (pinned in `AngularApiTemplate.Api/global.json`; later patches in this feature band are allowed).
- For the existing portal: Node.js **22.22.3+ in the 22 series**, **24.15.0+ in the 24 series**, or **26+**, and npm.
- Azure Functions Core Tools v4 with .NET 10 isolated-worker support (verified with 4.7.0).
- Azure CLI and access to the intended development vault only when enabling Key Vault.

This machine has an isolated SDK installation. Select it in each terminal:

```sh
export DOTNET_ROOT="$HOME/.local/share/angular-template-dotnet"
export PATH="$DOTNET_ROOT:$PATH"
```

On other machines, install the pinned SDK normally instead.

On this Windows checkout the pinned SDK is installed per user at
`C:\Users\Anon\.dotnet`. Select it in each PowerShell terminal before running
restore/build/tests (the machine-wide installation has older SDKs):

```powershell
$env:DOTNET_ROOT = Join-Path $env:USERPROFILE '.dotnet'
$env:PATH = "$env:DOTNET_ROOT;$env:PATH"
dotnet --version # Run from AngularApiTemplate.Api to apply its SDK pin.
```

Expected version: `10.0.403`. Use `python` instead of `python3` for the local SQL
helper on this Windows machine. The clone's local Git `core.autocrlf=input` setting
preserves the LF line endings required by `.editorconfig`.

## Layout

```text
AngularApiTemplate.Api/
  AngularApiTemplate.slnx
  Directory.Build.props
  global.json
  dotnet-tools.json
  src/
    AngularApiTemplate.Domain/
    AngularApiTemplate.Application/
    AngularApiTemplate.Infrastructure/
    AngularApiTemplate.Api/
    AngularApiTemplate.Functions/
  tests/
    AngularApiTemplate.Domain.Tests/
    AngularApiTemplate.Application.Tests/
    AngularApiTemplate.Infrastructure.IntegrationTests/
    AngularApiTemplate.Api.IntegrationTests/
    AngularApiTemplate.Architecture.Tests/
AngularApiTemplate.Portal/
  src/
```

Shared documentation, agent guidance and orchestration scripts remain at the root.
Run SQL/Entra helpers from the repository root; they select the backend directory
automatically. Private `.local` data remains at the root.

Application references Domain; Infrastructure references Application and Domain;
API and Functions reference Application and Infrastructure. See [engineering rules](AGENTS.md),
the [architecture decisions](docs/architecture.md) and the [foundation handover](docs/foundation-block-one.md).

## Restore, build and check

From `AngularApiTemplate.Api` (run `cd AngularApiTemplate.Api` first):

```sh
dotnet restore AngularApiTemplate.slnx
dotnet tool restore
dotnet build AngularApiTemplate.slnx --no-restore
dotnet format AngularApiTemplate.slnx --verify-no-changes --no-restore
```

For all tests, first start the dedicated local SQL Server using the Tasks commands
below, then run `python3 scripts/tasks-local.py test`. SQL HTTP tests deliberately
fail with a setup message if their database connection is missing; they are not
silently skipped. Application service behavior is covered through these real-provider
HTTP tests. Domain has focused invariant tests; Application's separate test project
still has no placeholder tests.

## Run the API locally

From `AngularApiTemplate.Api`:

```sh
dotnet run --project src/AngularApiTemplate.Api --launch-profile http
```

In a second terminal:

```sh
curl --fail http://localhost:5111/health
```

The response is `Healthy`. This is process liveness, not database or vault readiness.
The development OpenAPI document is at `/openapi/v1.json`.

## Run the empty Functions host

Before the first run, create the private local settings file:

```sh
cp AngularApiTemplate.Api/src/AngularApiTemplate.Functions/local.settings.example.json AngularApiTemplate.Api/src/AngularApiTemplate.Functions/local.settings.json
```

From `AngularApiTemplate.Api`:

```sh
dotnet run --project src/AngularApiTemplate.Functions --launch-profile local
```

This starts the real Azure Functions isolated worker via
Core Tools. Expect `0 functions found (Worker)` and `Job host started`: no triggers
are implemented yet. Press Ctrl+C to stop. To choose a port, append `-- --port 7075`.
The project normalizes the SDK run directory so root-level launches find the built
worker artifacts. No AzureWebJobsStorage setting or emulator is needed for this
empty host; add storage/bootstrap configuration with the first trigger that needs it.
Do not run the worker DLL directly: it requires the Functions host's gRPC arguments.

## SQL Server foundation

`IApplicationDbContext` is owned by Application and implemented by Infrastructure's
`AppDbContext`. Both hosts register one scoped context backed by the SQL Server
provider. The Tasks feature is the first implemented use case and supplies the
TaskItem entity, Tasks DbSet and complete CreateTasks migration. See
[architecture](docs/architecture.md) for transaction ownership and model/mapping rules.

`ConnectionStrings:ApplicationDatabase` is required and startup-validated. The
Development settings contain a non-secret localhost/database placeholder with
Integrated Security. It permits host startup without opening a connection, but
Integrated Security requires a suitable identity setup and is not a working SQL login
on this Mac by itself. For actual SQL access, provide a real connection string via
`ConnectionStrings__ApplicationDatabase` privately, or Key Vault secret
`ConnectionStrings--ApplicationDatabase` when vault loading is enabled. Do not put
SQL passwords in checked-in settings. Base settings are intentionally empty, so
non-Development hosts require an explicit connection setting.

The dedicated local SQL Server setup below is used for relational verification.
Startup never calls EnsureCreated, Migrate or SaveChanges; migrations are applied
only by explicit tooling or the isolated local test fixture.

## Tasks CRUD example

The operation-named controllers (`GetTask.cs`, `CreateTask.cs`, `ReplaceTask.cs`
and `DeleteTask.cs`) live under `Controllers/Tasks`. Each has one action,
uses ITaskService, and declares the shared Customer policy. Entra authentication
is disabled by default, so local template requests still work anonymously. Request validation uses
DataAnnotations and `TrimmedMaxLengthAttribute` on `CreateTaskRequest` and
`ReplaceTaskRequest` so `[ApiController]` rejects invalid inputs before reaching
the action. Enable the Entra integration below to require an authenticated customer.

| Method | Route | Success | Missing record |
| --- | --- | --- | --- |
| GET | /tasks | 200 TaskResponse array | — |
| GET | /tasks/{id} | 200 TaskResponse | 404 |
| POST | /tasks | 201 TaskResponse + Location | — |
| PUT | /tasks/{id} | 200 TaskResponse | 404 |
| DELETE | /tasks/{id} | 204, no body | 404 |

GET /tasks returns an unpaginated array; filtering/query parameters are not supported. Invalid fields, malformed IDs and omitted required JSON
properties return HTTP 400 ValidationProblemDetails with an `errors` dictionary.
Title is trimmed and must contain 1–200 characters afterward; Description may be
null and has a 2,000-character limit. POST defaults IsCompleted to false. PUT requires
all editable fields, including explicit `description: null` to clear it and an
explicit `isCompleted: false` or `true`; omission is rejected.

### Dedicated local SQL Server

Prerequisites: Python 3 and running Docker Desktop, in addition to the SDK above.
The script runs SQL Server 2022 Developer in its own amd64 container (emulated on
this Apple Silicon machine), bound only to 127.0.0.1:11433. The local run has been
verified; it is not a production platform-support claim. The generated credential
file `.local/tasks-sql.json` is ignored and permission-restricted. Do not share it.

From the repository root, after selecting the SDK:

```sh
python3 scripts/tasks-local.py up
python3 scripts/tasks-local.py migrate
python3 scripts/tasks-local.py test
python3 scripts/tasks-local.py smoke
python3 scripts/tasks-local.py run
```

`migrate` targets only **AngularApiTemplate_Tasks_Development** on that dedicated
server. The migration `20261105112714_CreateTasks` creates Tasks with a GUID primary
key, nvarchar(200) Title, nullable nvarchar(2000) Description and bit IsCompleted.
The migration, Designer file and model snapshot are all included source artifacts.
`test` creates a uniquely named local Tasks test database, applies the same migration,
runs the HTTP tests and drops that test database afterward. The fixture refuses
remote servers or other ports. Tests never migrate the development/shared database.
`smoke` launches a separate API process, checks the full CRUD lifecycle over HTTP,
then removes its task and stops that API. Port 5111 must be free. `run` leaves the
API running for manual requests. Stop it with Ctrl+C.

To stop the dedicated container afterward (keeping its development data):

```sh
python3 scripts/tasks-local.py stop
```

The helper targets only this named local container and database; it never uses the
machine's existing connection configuration. For manual EF commands, the pinned
local `dotnet-ef` tool is restored with `dotnet tool restore`; migrations belong to
Infrastructure and use Api as the startup project. Identify the local connection
explicitly before running database update. Do not target shared/deployed databases.

### Example HTTP requests

With `python3 scripts/tasks-local.py run` running:

```sh
curl -i -X POST http://localhost:5111/tasks \
  -H 'Content-Type: application/json' \
  -d '{"title":"  Learn the template  ","description":"First task"}'

# Copy the ID from the response (Location points to this same GET resource).
TASK_ID='paste-the-returned-id-here'
curl -i "http://localhost:5111/tasks/$TASK_ID"
curl -i -X PUT "http://localhost:5111/tasks/$TASK_ID" \
  -H 'Content-Type: application/json' \
  -d '{"title":"Learned the template","description":null,"isCompleted":true}'
curl -i -X DELETE "http://localhost:5111/tasks/$TASK_ID"
```

## Configuration and Key Vault

Both hosts load ordinary settings through .NET host defaults and validate required
`Foundation` options on startup. Both `appsettings.json` files contain:

```json
"KeyVault": {
  "Name": "angular-template-dev-kv"
}
```

This is a placeholder name. To connect to a real vault:

1. Set `KeyVault:Name` in each host's app settings to the actual vault name (or use
   the `KeyVault__Name` environment variable).
2. Uncomment `builder.AddTemplateConfiguration(args);` in each host's `Program.cs`.
3. Locally, run `az login` with an identity allowed to list/get vault secrets.
   In Azure, grant the host's system-assigned managed identity those permissions
   and allow network access.
4. Start the hosts with the commands above.

The loader builds `https://{Name}.vault.azure.net/`. Development uses the developer's
Azure identity through DefaultAzureCredential, with managed identity excluded;
other environments use system-assigned managed identity. A missing/invalid name or
inaccessible vault fails startup. Azure failure details and secret values are not
included in the loader's error message.

Key Vault stores credentials and API keys; checked-in settings contain non-secrets.
Vault secret names such as `ExampleService--ApiKey` map to `ExampleService:ApiKey`.
Environment variables and command-line arguments are reapplied after vault loading
so explicit overrides win. No enabled flag or stored vault-access password is needed.

The loading calls are currently commented out in both hosts, so local startup needs
no Azure connection. Real-vault verification is deferred until a vault is provisioned.

## Portal

```sh
cd AngularApiTemplate.Portal
npm ci
npm start
```

Open http://localhost:4200. To build or test it, use `npm run build` or
`npm test -- --watch=false`. The Tasks feature calls http://localhost:5111 directly using environment.apiBaseUrl.
The API Development settings allow the portal origin http://localhost:4200 through
Cors:AllowedOrigins.

## Next blocks

Entra authentication → local Angular/API connection →
background processing and durable events → deployment and template instantiation.

## Angular Tasks communication example

With the local SQL Server started/migrated using the commands above, run
`python3 scripts/tasks-local.py run` in one terminal and `npm start` from
AngularApiTemplate.Portal in another. Open http://localhost:4200/tasks. Static
/tasks/create precedes /tasks/:taskId; detail URLs work directly and after refresh.
Browser requests call http://localhost:5111/tasks directly. Configure the Angular
API URL and the API Cors:AllowedOrigins array for other environments; no deployment
was performed.

| Portal operation | API | Inputs | Result |
| --- | --- | --- | --- |
| List | GET /tasks | None; no pagination/filtering | 200 array of TaskResponse |
| Create | POST /tasks | Title and optional nullable Description | 201 TaskResponse and Location |
| Detail | GET /tasks/{id} | GUID route ID, no body | 200 TaskResponse or 404 |
| Edit | PUT /tasks/{id} | GUID route ID, Title, nullable Description and IsCompleted | 200 TaskResponse, 400 or 404 |
| Delete | DELETE /tasks/{id} | GUID route ID, no body | 204 with no payload, or 404 |

TaskResponse has id/title/description/isCompleted. Invalid input returns 400
ValidationProblemDetails. These endpoints explicitly allow anonymous access until
the identity block (see [Entra authentication prompt](docs/prompts/configure-entra-authentication.md)).
OpenAPI annotations for create/get/replace/delete/list match these statuses/shapes.

Tasks is a lazy standalone route configuration (`tasks.routes.ts`) with standalone
OnPush components, feature-scoped NgRx state/effects and a facade. The lifecycle is
component → facade → action → effect → typed HTTP service → success/failure → reducer →
narrow selectors → observable view model → async template. Loading/errors are independent
per operation; deletions track each ID. Read effects cancel stale requests, create
ignores duplicate pending submissions, and deletes of different IDs run concurrently.
There are no mutation retries.

From AngularApiTemplate.Portal:

```sh
npm ci
npm run typecheck
npm run format:check
npm test -- --watch=false
npm run build
```

The production output includes a separate tasks-routes lazy chunk. Tests include
HTTP contracts, state/selector transitions and memoization, effect recovery/concurrency
and routed create/delete/list user flows. See the Portal section of docs/architecture.md
for reference decisions and conventions. Dependencies were not upgraded; matching
NgRx 22.0.1 Store/Effects were added to the existing Angular 22 application.

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

## Domain entity configuration

See [entity configuration and validation ownership](docs/architecture.md#entity-configuration-and-validation-ownership)
and the [reusable entity configuration prompt](docs/prompts/configure-domain-entity.md).
TaskItemConfiguration owns storage lengths; API contracts validate HTTP input;
TaskItem retains only business invariants and normalization.


## Customer authentication: Entra External ID

The template includes custom email-code signup/sign-in at `/login`, a lazy-route
customer guard, API bearer tokens and a shared Customer endpoint policy. Both
applications default to authentication disabled; no Entra request, secret or working
Azure tenant is required to start them. Tasks remains one shared test collection.
Authentication disabled means the API is intentionally anonymous, including outside
Development. Enable it explicitly before exposing customer data.

API integration: `AngularApiTemplate.Api/src/AngularApiTemplate.Api/appsettings.json` contains non-secret
`Entra` placeholders. Set `Enabled` to true only after replacing `Instance` with
`https://<tenant-subdomain>.ciamlogin.com/`, `TenantId` with the external tenant GUID,
and `ClientId` plus `Audience` with the API registration GUID. The API expects v2
access tokens. Environment overrides use `Entra__Enabled`, `Entra__TenantId`, etc.
Enabled placeholders fail startup validation. Disabled placeholders are accepted.
No client secret is needed to validate API bearer tokens.

Portal integration: set `enabled` in `src/app/core/auth/auth.values.ts` to true after
replacing `clientId`, `authority`, `apiScope` and `nativeAuthProxyUrl`. Keep these
non-secret. The API scope example is `api://<api-client-id>/access_as_customer`.
This is a single delegated permission for the Portal to call this API, not an
endpoint permission matrix or paid-customer role. API authorization currently checks
a valid delegated customer identity, with no business roles required. Role checks
can later be added centrally to the Customer policy.

Native sign-in, signup-to-sign-in continuation and token acquisition explicitly
request `openid`, `profile` and `offline_access` alongside the API scope. The native
SDK replaces its default scopes when custom scopes are supplied; requesting only
the API scope can return an access token without the ID/refresh tokens needed to
complete the SDK session. Do not remove these OIDC scopes when configuring an API.

The corresponding Azure setup must already exist when enabled:

1. An Entra **external tenant**, API registration exposing that delegated permission
   with v2 access tokens, and a Portal public-client registration permitted to use
   native authentication. Link the Portal to its signup/sign-in user flow and grant
   its API permission according to the tenant's consent configuration.
2. An email one-time-passcode user flow, without extra mandatory signup attributes.
   This scaffold handles email-code signup and sign-in, rather than passwords,
   social federation, MFA or additional attribute challenges.
3. A native-auth reverse proxy configured for that tenant. Point the Portal's
   `nativeAuthProxyUrl` at its API prefix. Microsoft native endpoints do not provide
   browser CORS; the ordinary Tasks API CORS policy does not replace this proxy.
   Its upstream must be fixed to the intended tenant and it must support the SDK's
   initiation, challenge, continuation and token endpoints. Restrict proxy origins
   to the Portal, forward only required methods/headers, disable token/body logging
   and response caching, and configure rate limiting/WAF at that public entry point.
4. Register `http://localhost:4200/login` and the hosted equivalent for browser
   fallback as required by the selected registration. Configure deployed URLs and
   `Cors:AllowedOrigins` explicitly; local API/Portal remain 5111/4200.

The initial scaffold did not create Azure resources. The development setup below
now provides real registrations, an email-code flow and a local proxy.
Unsupported provider challenges show a plain retry error; they do not fabricate a
successful session. Session cache uses sessionStorage. Sign out clears application
state before awaiting local SDK sign-out; it is not a global tenant session revoke.

The custom route uses `@azure/msal-browser/custom-auth` directly; the hosted-flow
`@azure/msal-angular` wrapper and its redirect observable are intentionally unused.
The root functional interceptor and canMatch guard remain inside core/auth. See
[architecture and lifecycle ownership](docs/architecture.md) and the updated
[developer handover](docs/prompts/configure-entra-authentication.md).

Official integration references:
[Angular native signup](https://learn.microsoft.com/en-us/entra/identity-platform/tutorial-native-authentication-single-page-app-angular-sign-up),
[native authentication approaches](https://learn.microsoft.com/en-us/entra/external-id/customers/concept-choose-authentication-approach),
[SPA native authentication and proxy prerequisites](https://learn.microsoft.com/en-us/entra/identity-platform/quickstart-native-authentication-single-page-app-sdk-sign-in).

## Totality local Entra development

The shared **Totality Development Local** external tenant is for local projects,
not production. Its directory country is United Kingdom (directory data location
Europe); its Azure resource group is `Totality-Identity-Dev` in UK South, linked to
the existing Totality Pay-As-You-Go subscription. Core authentication is within
Microsoft's free 50,000 monthly active user allowance, aggregated across tenants
linked to the subscription. SMS, Front Door, Azure hosting and premium add-ons
were not provisioned for this setup. A customer's registration in this directory
does not grant business-directory or Azure administrative access.

| Setting | Development value |
| --- | --- |
| Tenant ID | `1992ca53-10eb-45a4-b028-e6c430a6e70e` |
| Domain | `totalitylocaldev.onmicrosoft.com` |
| Authority | `https://totalitylocaldev.ciamlogin.com/` |
| API client ID / v2 audience | `bdc716c2-1a0f-4e37-a304-d9d881c5ef8d` |
| Portal client ID | `3bc9a510-7769-40da-977d-2d08d7199c91` |
| Delegated API scope | `api://bdc716c2-1a0f-4e37-a304-d9d881c5ef8d/access_as_customer` |
| Email-code flow | `LocalEmailSignupSignin` |
| Portal callback | `http://localhost:4200/login` |
| Native-auth proxy | `http://localhost:3001/api` |

Both registrations are single-tenant. The API exposes the scope and requests v2
access tokens. The Portal enables public-client/native authentication, has the
delegated scope granted by the tenant administrator, and is linked to the email
one-time-passcode flow without extra signup attributes. No client secrets were
created. The Portal's unused default Graph User.Read permission was removed.
Each future local project should have its own client/API registrations and scopes;
the tenant's customer directory and some settings remain shared.

Default `npm start`, default/production builds and API settings still leave
authentication disabled. Opt in to real development identity in three terminals:

```powershell
# Repository root: local-only native authentication proxy.
node scripts/entra-proxy.mjs

# Repository root, after selecting the SDK and starting/migrating local SQL.
python scripts/tasks-local.py run-entra

# AngularApiTemplate.Portal directory.
npm run start:entra
```

Open `http://localhost:4200/login` and select **Create an account** for a new customer
or **Sign in** for an existing customer. Use an email you control and enter its code.
This is passwordless email authentication; no password reset is needed for these
accounts. The API's `/health` remains public; anonymous `/tasks` returns 401 in
this mode. Stop an existing API/Portal before switching launch modes on the same
ports. `run-entra` enables authentication through a process environment override
and uses the existing dedicated local SQL configuration.

`auth.values.local.ts` supplies the non-secret Portal values through the opt-in
Angular `local-entra` file replacement. API Development JSON supplies its non-secret
tenant/API values; base settings retain placeholders. The proxy reads
`scripts/entra-local.json`, binds only to 127.0.0.1:3001, permits only the Portal
origin, approved native sign-in/signup POST paths and configured client ID, and
forwards to the fixed tenant over validated HTTPS. It bounds request size/time and
disables caching. Diagnostics include only HTTP status and constrained provider
error codes, never request bodies, codes, tokens or provider error descriptions.
It is a development helper, not a production proxy or identity emulator.

Production needs separate explicit identity/hosting configuration. Bicep work is
deferred; no deployment automation was added by this setup.
