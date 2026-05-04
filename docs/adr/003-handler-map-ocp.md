# ADR-003: Handler Map Pattern for Open/Closed Protocol Routers

## Status
**Accepted** — Implemented in v2.0.0

## Context
The original protocol routers (KWP2000, UDS) used large `switch` statements to dispatch service IDs to handler methods:

```ts
switch (serviceId) {
  case 0x10: return this.handleDiagnosticSessionControl(req);
  case 0x19: return this.handleReadDTCs(req);
  // ... 20+ more cases
}
```

Adding a new service required modifying the `processRequest` method, violating the **Open/Closed Principle (OCP)**. It also made unit testing individual handlers cumbersome.

## Decision
Replace `switch` with a **handler map registry**:

```ts
private readonly serviceHandlers: Map<number, ServiceHandlerFn>;

private initializeHandlers(): Map<number, ServiceHandlerFn> {
  const handlers = new Map();
  handlers.set(0x10, (frame) => this.handleDiagnosticSessionControl(frame));
  // ...
  return handlers;
}

processRequest(frame): Response {
  const handler = this.serviceHandlers.get(frame.serviceId);
  if (handler) return handler(frame);
  return this.createNegativeResponse(NRC.SERVICE_NOT_SUPPORTED);
}
```

Additionally, expose a public `registerHandler(serviceId, handler)` method to allow **runtime extension** without subclassing or modifying the router.

## Consequences

### Positive
- **OCP compliance**: New services register via `registerHandler()`; core router unchanged.
- **Testability**: Handlers can be swapped with mocks/stubs via the map.
- **Clarity**: The set of active services is inspectable via `serviceHandlers` entries.
- **Decoupling**: Handler implementation details are isolated; router only cares about the function signature.

### Negative
- **Slightly more indirection**: One extra map lookup vs direct `switch` (negligible performance impact).
- **Handler lifecycle**: Handlers must be registered before use; requires bootstrapping order awareness.

## Implementation Notes
- Both `@ecu/kwp2000` and `@ecu/uds` now use this pattern.
- The map is initialized in the constructor; third-party plugins can extend after construction.
- Service IDs are validated via `has` check; unknown IDs produce standard NRC.

## References
- [Design Patterns: Strategy Pattern](https://refactoring.guru/design-patterns/strategy)
- [Open/Closed Principle](https://en.wikipedia.org/wiki/Open–closed_principle)

---

*Documented by Kilo — 2026-05-04*
