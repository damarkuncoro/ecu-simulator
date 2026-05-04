# ADR-002: Use `unknown` Instead of `any` for Protocol Frame Types

## Status
**Accepted** — Implemented in v2.0.0

## Context
The `IProtocolHandler` interface originally used `any` for frame and response types:

```ts
parseFrame(data: Buffer): any;
formatResponse(response: any): Buffer;
processRequest(request: any): any;
```

This allowed implementations to bypass type checking entirely, defeating TypeScript's safety guarantees and enabling runtime errors from mismatched shapes.

## Decision
Replace `any` with `unknown` in all `IProtocolHandler` method signatures:

```ts
parseFrame(data: Buffer): Promise<unknown | null>;
formatResponse(response: unknown): Promise<Buffer>;
processRequest(request: unknown): Promise<unknown>;
```

Implementations (e.g., `Kwp2000ProtocolHandlerAdapter`) perform explicit type assertions (`as any`) only at the boundary between the typed protocol router and the DI container. This forces:

1. **Type narrowing** before use: Consumers must narrow `unknown` to concrete types (`Kwp2000Frame`, `Kwp2000Response`) via `instanceof` or type guards.
2. **Single escape hatch**: The adapter pattern isolates `any` casts to one place rather than scattering them.
3. **Compile-time safety**: Mismatched types now produce errors at the boundary instead of silently propagating.

## Consequences

### Positive
- **Stronger type safety**: Protocol implementations must validate or assert types.
- **Self-documenting**: `unknown` signals "this is untyped; handle carefully."
- **Easier refactoring**: Changing frame shape triggers errors at type assertion sites.

### Negative
- **Slight verbosity**: Requires type guards or casts at boundaries.
- **Adapter boilerplate**: Each protocol adapter needs explicit type conversions.

## Alternatives Considered
- Keep `any` and rely on code reviews — rejected due to history of undetected mismatches.
- Use generics (`IProtocolHandler<F, R>`) — more flexible but adds complexity; could be future enhancement.

## References
- [TypeScript: `unknown` vs `any`](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#unknown)
- [Effective TypeScript](https://effectivetypescript.com/) — Item 55: Prefer `unknown` over `any`

---

*Documented by Kilo — 2026-05-04*
