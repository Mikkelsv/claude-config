---
paths:
  - "**/*.cs"
  - "**/*.csproj"
---

# No Large Managed Allocations on the WASM Client

Never allocate a **large block of managed memory** for bulk data on a Blazor WASM client. Use unmanaged memory and **stream** large I/O. "Large" means it scales with the dataset; bounded metadata (names, logs, reference arrays, a fixed staging buffer) is fine.

**Client-only constraint.** Server and harness code runs on desktop CoreCLR, where large managed allocations are fine and often *faster*. Don't apply this to server, extraction, benchmark or harness projects.

## Why

The browser caps WASM linear memory at roughly 2 GB — a hard wall, shared by the managed GC heap, native, and the JS heap. A large managed array needs a contiguous large-object-heap block, so it can OOM on a fragmented heap even with free memory overall; it doubles transiently if built through a `MemoryStream` then copied out; and it is rarely reclaimed under the Mono WASM GC. Unmanaged buffers sidestep the GC entirely.

## How

- **Bulk data** → an unmanaged buffer type, never `new float[bigN]` / `new byte[bigN]` at dataset scale.
- **Large response** → `ReadAsStreamAsync()` with `ResponseHeadersRead`, parsed incrementally. Never `ReadAsByteArrayAsync` / `GetByteArrayAsync`.
- **Large request** → pack into an unmanaged buffer behind a streaming `HttpContent` with request streaming enabled. Gate that flag on an **https** host: over plaintext http it forces h2c and fails ALPN, so buffer there instead.
- Reach unmanaged memory through `AsSpan()` plus `BinaryPrimitives` / `MemoryMarshal` rather than raw pointers, so `AllowUnsafeBlocks` can stay off.

Tier: always do — a large managed allocation on a WASM client is a latent OOM.
