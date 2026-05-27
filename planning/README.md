# Planning — Inertia Protocol Coverage

Tech-agnostic protocol documents for the Inertia features the integration must implement to reach 100% protocol coverage.

Implementation order:

1. [Multiple errors per field](./01-multiple-errors-per-field.md)
2. [Prefetch awareness](./02-prefetch-awareness.md)
3. [Once props](./03-once-props.md)
4. [Rescued deferred props](./04-rescued-deferred-props.md)
5. [Keyed and directional merges](./05-keyed-and-directional-merges.md)
6. [Infinite scroll](./06-infinite-scroll.md) — depends on (5)
7. [Fragment-preserving redirects](./07-fragment-preserving-redirects.md)
8. [Shared props tracking](./08-shared-props-tracking.md)
9. [Flash messages](./09-flash-messages.md)

Each document describes the wire format, server behavior, and client expectation in framework-agnostic terms. No implementation guidance, no API names from any specific adapter.
