---
paths:
  - "**/*.csproj"
  - "**/*.js"
---

# No WasmEnableThreads in a Web Worker

Never boot `WasmEnableThreads=true` inside a dedicated Web Worker. The .NET runtime hangs indefinitely on startup.

## Why

Emscripten's pthread implementation hard-wires `new Worker()` creation to the **main browser thread**. When .NET boots inside a Web Worker the proxy channel doesn't exist — sub-worker `.mjs` fetches issue but never complete. The proxy isn't just a worker spawner; it also handles DOM event marshaling, `fetch` cancellation, and module teardown, so removing it cascades through other Emscripten subsystems. Every variant deadlocks: `{ type: 'module' }`, classic worker, AOT, interpreter, a zero-sized pthread pool, env spoofing.

## How

- `WasmEnableThreads` belongs on the main Blazor client project only, never in a `wasmbrowser` worker project.
- For parallel CPU work **and** off-main-thread isolation, pick one — they cannot combine in the browser today.
- Workers can still own I/O paths (e.g. synchronous OPFS via `createSyncAccessHandle`) without booting WASM at all.

Tier: never do.
