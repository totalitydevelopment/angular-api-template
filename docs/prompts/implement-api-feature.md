# Implement a backend API feature

Copy the prompt below and supply the feature specification (entity/aggregate, invariants, persistence requirements, and HTTP operations).

> Implement the `<Feature>` backend slice in this template. Read `AGENTS.md`,
> `docs/architecture.md`, `README.md` and applicable `.github` instructions first.
> Inspect the `Tasks` vertical slice under `AngularApiTemplate.Api/` (`Domain/Tasks`,
> `Application/Tasks`, `Infrastructure/Persistence/Configurations/TaskItemConfiguration.cs`,
> `Api/Controllers/Tasks`, and `tests/AngularApiTemplate.Api.IntegrationTests/Tasks`)
> as the working reference before making changes.
>
> Feature specification:
> - Domain model & business invariants: `<describe entity fields, required normalization, and real business rules>`
> - Persistence & storage limits: `<describe table, key, nullability, column max lengths/precision, indexes, relationships>`
> - Application use cases: `<describe operations, e.g. List, Get, Create, Replace/Update, Delete>`
> - HTTP endpoints & authorization: `<describe routes, methods, request/response fields, status codes, and policy (default: CustomerPolicy)>`
>
> Clarification gate:
> - If any required field limit, nullability rule, delete behavior, status code or
>   business invariant is missing or ambiguous, stop and ask before inventing rules.
>
> Implementation rules:
> - Domain: Keep entities framework-independent. Enforce real business invariants and
>   normalization through factory/mutation methods (`Guid.CreateVersion7()` for new GUID
>   identities). Do not put storage column lengths or EF attributes in Domain.
> - Application: Add explicit `DbSet<TEntity>` properties to `IApplicationDbContext` and
>   `AppDbContext`. Write focused Application service interfaces/implementations using
>   direct EF LINQ projections (`AsNoTracking` for reads, tracked entities for mutations,
>   explicit `SaveChangesAsync` transaction boundaries). Use records for Application
>   request/result contracts. Do not introduce generic repositories, mediators or AutoMapper.
> - Infrastructure: Add `<Entity>Configuration : IEntityTypeConfiguration<TEntity>` under
>   `Infrastructure/Persistence/Configurations` (discovered via assembly scanning). If the
>   relational schema changed, generate the complete migration (`.cs`, `.Designer.cs`, and
>   `AppDbContextModelSnapshot.cs`) and move all explicit imports into project
>   `GlobalUsings.cs` files.
> - API: Create one operation-named controller class per HTTP action (`<Operation>.cs` with
>   `<Operation>Async` action method) under `Api/Controllers/<Feature>`. Apply
>   `[Authorize(Policy = AuthenticationExtensions.CustomerPolicy)]` (unless explicitly
>   specified otherwise) and accurate `ProducesResponseType` attributes (`200`/`201`/`204`/
>   `400`/`401`/`403`/`404`). Use classes with `init` properties for HTTP contracts, shared
>   feature-local `<Feature>RequestLimits`, and DataAnnotations (`Required`, `MaxLength`,
>   `TrimmedMaxLength`). Map explicitly between HTTP contracts and Application contracts;
>   never serialize Domain entities or Application results directly.
> - Conventions: Centralize all `using` directives in each project's `GlobalUsings.cs`
>   (System first, then alphabetical). Use 4-space indentation, file-scoped namespaces, and
>   block bodies for multiline expressions.
>
> Verification gate:
> - Add Domain invariant unit tests, API/EF model-limit alignment tests, controller
>   convention checks, and real SQL Server HTTP integration tests covering the full CRUD/
>   validation/not-found lifecycle.
> - Run `dotnet build AngularApiTemplate.Api/AngularApiTemplate.slnx --no-restore`,
>   `dotnet format AngularApiTemplate.Api/AngularApiTemplate.slnx --verify-no-changes --no-restore`,
>   and the test suites (`python scripts/tasks-local.py test` when local SQL Server is
>   running).
> - Update `docs/architecture.md`, `README.md`, and `docs/foundation-block-one.md`. Stay on
>   `init`; do not commit, push, deploy, or provision Azure resources without separate
>   authorization.
