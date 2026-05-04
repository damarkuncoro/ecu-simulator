# ADR-001: Adopt Clean Architecture with Domain-Driven Design

## Status
**Accepted** — Implemented in v2.0.0

## Context
The original ECU simulator codebase had tangled dependencies across layers:
- Domain entities depended on infrastructure details.
- Protocol routers contained business logic mixed with transport handling.
- DTC category detection was duplicated in multiple files.
- No clear separation of concerns, making testing and extension difficult.

## Decision
We adopted a **Clean Architecture** layered structure with **Domain-Driven Design** (DDD) principles:

```
┌─────────────────────────────────────────┐
│  Apps (cli-diag, desktop-ui, cloud-gw)  │
├─────────────────────────────────────────┤
│  Application Services (ECUService,      │
│  DTCService) — Use-case orchestration   │
├─────────────────────────────────────────┤
│  Domain (Entities, Value Objects,       │
│  Domain Errors, Repository Ports)       │
├─────────────────────────────────────────┤
│  Infrastructure (Adapters, Factories,   │
│  Protocol Handlers, Transports)         │
└─────────────────────────────────────────┘
```

**Key elements:**
- **Domain layer** is pure TypeScript, zero external dependencies.
- **Application layer** orchestrates domain objects via repository interfaces.
- **Infrastructure** implements ports (interfaces) defined in domain.
- **Dependency Rule**: Inner layers define interfaces; outer layers implement them.
- **VirtualEcuFactory** provides a single entry point for constructing configured ECUs.

## Consequences

### Positive
- **Testability**: Domain and application logic can be unit-tested without infrastructure.
- **Maintainability**: Each layer has a single, well-defined responsibility (SRP).
- **Swappable implementations**: TCP, Serial, WebSocket transports can be swapped by providing new `ITransport` adapters.
- **Clear boundaries**: New protocols (e.g., UDS) extend via handler registration (OCP).

### Negative
- **Increased boilerplate**: More classes and interfaces to write.
- **Learning curve**: Team must understand layered architecture and DDD concepts.
- **Initial complexity**: Simple operations now pass through more layers.

## Implementation Notes
- Created `@ecu/dtc-utils` and `@ecu/protocol-constants` to eliminate duplication (DRY).
- Introduced `DomainError` hierarchy (11 specific errors) to replace generic `Error`.
- `DTCStatus` is now a fully immutable value object; all mutations return new instances.
- VirtualEcu exposes `getDtcEngine()` only for testing; production code uses application services.
- Handler maps (`Map<number, ServiceHandlerFn>`) replace switch statements in KWP2000 and UDS routers, conforming to OCP.

## References
- [Clean Architecture](https://www.oreilly.com/library/view/clean-architecture/9780134494272/) by Robert C. Martin
- [Domain-Driven Design](https://domainlanguage.com/ddd/) by Eric Evans

---

*Documented by Kilo — 2026-05-04*
