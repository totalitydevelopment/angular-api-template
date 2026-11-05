# Configure a domain entity

Copy the prompt below and supply the entity name and agreed persistence requirements.

> Configure persistence for `<Entity>` in this template. Read AGENTS.md, CLAUDE.md,
> docs/architecture.md, README.md and applicable .github instructions first. Inspect
> the entity, its callers, request contracts, existing configurations, AppDbContext,
> migration snapshot and tests. Follow TaskItemConfiguration as the working example.
>
> Create or update Infrastructure/Persistence/Configurations/<Entity>Configuration.cs
> implementing IEntityTypeConfiguration<Entity>. Configure the actual table, key,
> generated values, required/optional fields, lengths/precision, indexes, relationships
> and delete behavior justified by the agreed requirements. Report missing decisions;
> do not invent limits, indexes, cascades or business rules from property names.
> Use the existing assembly discovery; do not create a second registration mechanism.
>
> Keep storage metadata and length validation out of the domain entity. Preserve real
> business invariants, normalization and controlled mutation. Put HTTP field validation
> on explicit API request contracts, sharing request limits within that API feature.
> Do not couple API contracts to Infrastructure or duplicate storage-length checks in
> Domain/Application. Inspect non-HTTP callers and explain their input-validation needs.
> Keep frontend feedback consistent when a corresponding form exists.
>
> Add focused contract/model alignment checks and behavioral regressions. Determine
> whether the relational model changes: if it does, generate and inspect the complete
> migration, Designer and snapshot; if not, verify snapshot alignment without adding
> an empty migration. Centralize imports in project GlobalUsings.cs. Run available
> build/format/tests, using SQL Server for persistence behavior; report blockers and
> distinguish model inspection from live database verification. Update the architecture
> and implementation history. Stay on init; do not commit, push, deploy, apply migrations
> or provision resources without separate authorization.
