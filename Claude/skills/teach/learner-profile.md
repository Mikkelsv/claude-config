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
- 2026-04-20: Grid realization / circulant embedding — FFT eigenvalue trick, kriging SVD, normal score, SIMD (mode: contextual)

## Quiz History
<!-- Add entries as: - YYYY-MM-DD: topic keyword — correct/incorrect/skipped -->
- 2026-03-31: Azure Managed Identity Q1 (RBAC role assignment) — correct
- 2026-03-31: Azure Managed Identity Q2 (local vs prod permission gap) — incorrect
- 2026-04-01: Azure Managed Identity Q3 (system-assigned lifecycle on redeploy) — incorrect
- 2026-04-13: Emscripten pthreads Q1 (deadlock on Parallel.For in worker) — correct
- 2026-04-13: Emscripten pthreads Q2 (main-thread proxy handles DOM + lifecycle, not just spawn) — correct
- 2026-04-13: Emscripten overview Q1 (dotnet.native.js is Emscripten runtime glue) — correct
- 2026-04-13: Emscripten overview Q2 (EM_ASM extracted to JS glue, indexed imports) — correct
- 2026-04-20: Grid realization Q1 (why circulant embedding is fast — FFT eigenvalues, not truncation) — incorrect
- 2026-04-20: Grid realization Q2 (SVD over Cholesky for near-singular kriging) — correct
- 2026-04-20: Grid realization Q3 (2N-1 padding prevents wraparound negative eigenvalues) — correct
- 2026-04-20: Grid realization Q4 (FFTW planning slow on primes due to Rader's recursion) — correct
- 2026-04-20: Grid realization Q5 (MKL VML vs WASM managed normal score — wrapper overhead argument) — incorrect
- 2026-04-20: Grid realization Q6 (plan caching negligible, confirmed by benchmark) — incorrect
- 2026-04-20: Grid realization Q7 (convolution theorem underlies frequency-domain coloring) — correct
- 2026-04-20: Grid realization Q8 (per-realization 2 forward + 1 inverse FFTs, setup separate) — incorrect
- 2026-04-20: Grid realization Q9 (real + imaginary parts are two independent realizations) — incorrect
- 2026-04-20: Pipeline Q10 (inputs: grid + covariance model + wells + seed) — correct
- 2026-04-20: Pipeline Q11 (flow: noise → color → condition → output) — correct
- 2026-04-20: Pipeline Q12 (output is full 3D field honoring wells exactly) — correct
- 2026-04-20: Pipeline Q13 (many realizations = uncertainty quantification, not averaging) — correct

## Topics to Review
<!-- Topics where the user got a quiz wrong, seemed uncertain, or asked to revisit -->
- DefaultAzureCredential auth chain — how it resolves differently in local vs production environments
- System-assigned identity lifecycle — identity is destroyed on resource redeploy, breaking RBAC assignments
- Circulant embedding: why it's fast is algebraic structure (exact eigenvalues via FFT), not numerical truncation. The distinction between "exact trick" vs "approximation trick" applies broadly in numerical methods.
- Measure-before-assuming in performance work: intuition about "X must be expensive" (plan caching, wrapper overhead) often contradicts measured reality. Applied repeatedly in this investigation.
- Circulant embedding "two realizations per FFT" property: complex noise input → real and imaginary parts of output are independent valid realizations. Production takes only real part (simplicity over doubling throughput).
- Distinguish per-setup vs per-realization cost in performance analysis: eigenvalue FFT is amortized (once per property), realization FFTs are per-run. Different optimization strategies apply to each.
