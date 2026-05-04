# ADR-004: Domain Error Hierarchy

## Status
**Accepted** — Implemented in v2.0.0

## Context
Throughout the codebase, generic `Error` and `string` messages were used for all failure modes:

```ts
throw new Error('ECU not found');
throw new Error('Invalid DTC');
```

This forced callers to parse message strings to determine error type — brittle and internacionalization-unfriendly. It also made it impossible to distinguish error categories programmatically without `instanceof` checks on the base `Error`.

## Decision
Introduce a **domain-specific error hierarchy** rooted in `DomainError`:

```ts
export abstract class DomainError extends Error {
  abstract readonly code: string;
  toJSON(): { name, message, code }
}

export class ECUNotFoundError extends DomainError {
  readonly code = 'ECU_NOT_FOUND';
}
export class InvalidDTCError extends DomainError {
  readonly code = 'INVALID_DTC';
}
// ... 9 more
```

All application and infrastructure layers now throw these typed errors. Callers can handle errors via `instanceof` or by inspecting the `code` property (string constant safe for serialization).

## Consequences

### Positive
- **Type-safe error handling**: `catch (err)` can be narrowed with `if (err instanceof ECUNotFoundError)`.
- **Machine-readable codes**: API responses can include `code` field for clients to react to.
- **Consistent messaging**: Error messages constructed in one place; no string duplication.
- **Extensibility**: New error types can be added without breaking existing `catch` blocks.

### Negative
- **More classes**: 11 new error classes increase file count.
- **Migration effort**: Existing catch blocks that relied on string matching need updating.

## Error Catalog
| Code | Class | Meaning |
|------|-------|---------|
| `ECU_NOT_FOUND` | `ECUNotFoundError` | ECU ID does not exist |
| `ECU_OFF` | `ECUOffError` | Operation requires ECU powered on |
| `INVALID_SESSION` | `InvalidSessionError` | Wrong diagnostic session state |
| `SECURITY_ACCESS_DENIED` | `SecurityAccessDeniedError` | Security level insufficient |
| `INVALID_DTC` | `InvalidDTCError` | Malformed DTC code or status |
| `SESSION_TIMEOUT` | `SessionTimeoutError` | Session expired |
| `DID_NOT_FOUND` | `DIDNotFoundError` | Data Identifier unknown |
| `DID_READ_ONLY` | `DIDReadOnlyError` | Attempted write to RO DID |
| `DID_LENGTH_MISMATCH` | `DIDLengthMismatchError` | Data length mismatch |
| `SERVICE_NOT_SUPPORTED_IN_SESSION` | `ServiceNotSupportedInSessionError` | Service not allowed |
| `INVALID_MESSAGE_LENGTH` | `InvalidMessageLengthError` | Payload size incorrect |

## References
- [Exceptional Exception Handling](https://enterprisecraftsmanship.com/posts/exceptional-exception-handling/)
- [Domain-Driven Design: Bounded Contexts & Exceptions](https://domainlanguage.com/ddd/)

---

*Documented by Kilo — 2026-05-04*
