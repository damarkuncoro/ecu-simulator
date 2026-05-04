# ECU Simulator Documentation

This directory contains architectural decision records (ADRs) and guiding documentation for the ECU simulator project.

## Architecture Decision Records (ADRs)

ADR documents significant architectural choices, their context, and consequences. They are written in Markdown and kept under version control.

| ID | Title | Status | Date |
|----|-------|--------|------|
| [ADR-001](adr/001-clean-architecture.md) | Adopt Clean Architecture with DDD | Accepted | 2026-05-04 |
| [ADR-002](adr/002-unknown-over-any.md) | Use `unknown` Instead of `any` for Protocol Frame Types | Accepted | 2026-05-04 |
| [ADR-003](adr/003-handler-map-ocp.md) | Handler Map Pattern for Open/Closed Protocol Routers | Accepted | 2026-05-04 |
| [ADR-004](adr/004-domain-error-hierarchy.md) | Domain Error Hierarchy | Accepted | 2026-05-04 |

## Contributing

To propose an architectural change:
1. Copy the [ADR template](../../template.md) (if available).
2. Fill in Status, Context, Decision, Consequences.
3. Submit a PR with the ADR and implementation.

## Further Reading
- [Clean Architecture](https://www.oreilly.com/library/view/clean-architecture/9780134494272/) by Robert C. Martin
- [Domain-Driven Design](https://domainlanguage.com/ddd/) by Eric Evans
- [Patterns of Enterprise Application Architecture](https://martinfowler.com/books/eaa.html) by Martin Fowler
