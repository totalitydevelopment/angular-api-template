# Project instructions

Read and follow [docs/architecture.md](docs/architecture.md), the maintained source
of architecture, boundary, coding and validation rules. Follow [README.md](README.md)
for startup commands and [docs/foundation-block-one.md](docs/foundation-block-one.md)
for current implementation scope and verification status.

The user-authorized design intentionally makes Application EF-aware through
IApplicationDbContext. Do not move workflows back into controllers or Functions.
Use Same Page only as read-only reference material; do not copy its product code,
secrets, Firebase assumptions or contradictory architecture rules.

Work on init. Angular feature work follows the Portal section of docs/architecture.md,
including its mandatory resource ownership, lifecycle cleanup and audit rules. Do not commit,
push, deploy or provision Azure resources unless separately instructed.
