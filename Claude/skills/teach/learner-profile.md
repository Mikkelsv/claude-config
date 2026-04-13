# Learner Profile

## Background
- **Experience:** 6 years .NET development
- **Primary domain:** Unity, mixed reality (MR), spatial computing
- **Language strength:** C#, 3D math, game dev patterns, systems thinking

## Growth Areas
- ASP.NET Core (web APIs, Razor, Blazor)
- Azure cloud services (App Service, Functions, Service Bus, CosmosDB, etc.)
- Frontend web development patterns
- Cloud architecture and DevOps
- Web security fundamentals

## Learning Style Notes
- Learns well from concrete code examples
- Appreciates analogies to Unity/game dev concepts when applicable
- Has the experience to handle advanced topics — don't oversimplify

## Topics Covered
<!-- Add entries as: - YYYY-MM-DD: topic keyword (mode: contextual/explore/random/nugget) -->
- 2026-03-31: Azure Managed Identity, DefaultAzureCredential, RBAC (mode: random)
- 2026-04-13: Emscripten pthreads over Web Workers, main-thread pthread proxy constraint (mode: contextual)
- 2026-04-13: Emscripten overview — toolchain, JS glue, syscall shimming, Asyncify, .NET connection (mode: contextual)
- 2026-04-13: WASM traps — async/Asyncify, Mono vs CoreCLR, interpreter vs AOT, memory limitations (mode: contextual)

## Quiz History
<!-- Add entries as: - YYYY-MM-DD: topic keyword — correct/incorrect/skipped -->
- 2026-03-31: Azure Managed Identity Q1 (RBAC role assignment) — correct
- 2026-03-31: Azure Managed Identity Q2 (local vs prod permission gap) — incorrect
- 2026-04-01: Azure Managed Identity Q3 (system-assigned lifecycle on redeploy) — incorrect
- 2026-04-13: Emscripten pthreads Q1 (deadlock on Parallel.For in worker) — correct
- 2026-04-13: Emscripten pthreads Q2 (main-thread proxy handles DOM + lifecycle, not just spawn) — correct
- 2026-04-13: Emscripten overview Q1 (dotnet.native.js is Emscripten runtime glue) — correct
- 2026-04-13: Emscripten overview Q2 (EM_ASM extracted to JS glue, indexed imports) — correct

## Topics to Review
<!-- Topics where the user got a quiz wrong, seemed uncertain, or asked to revisit -->
- DefaultAzureCredential auth chain — how it resolves differently in local vs production environments
- System-assigned identity lifecycle — identity is destroyed on resource redeploy, breaking RBAC assignments
