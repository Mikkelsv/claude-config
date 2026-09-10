---
paths:
  - "**/*.cs"
---

# A Server-Registered Converter Does Not Reach `ReadFromJsonAsync()`

Registering a `JsonConverter` in the server's `ConfigureHttpJsonOptions` covers **serialization only**. Every client-side `ReadFromJsonAsync<T>()` / `GetFromJsonAsync<T>()` call that omits explicit options falls back to `JsonSerializerOptions.Web`, which carries no converters at all. Pass explicit options at each client call site.

## Why

The asymmetry is invisible to the natural way of writing a serialization test — construct an options object on both ends and assert the round-trip. That proves the *converter* works while saying nothing about whether the *call site* uses it. A real case: a wire type was retyped to a single-case wrapper struct, a converter was written and registered server-side, and a purpose-written shape test passed because it mirrored the server's configuration. The actual client fetch used the parameterless overload, so the converter never applied — build clean, full suite green, and the break would only have surfaced as a wrong or empty value at runtime.

## How

- Adding a converter for a type that crosses the wire → grep every `ReadFromJsonAsync` / `GetFromJsonAsync` / `PostAsJsonAsync` for that type and confirm each passes options. **The parameterless overload is the tell.**
- Prefer one `static readonly JsonSerializerOptions` per client service, built through the same shared registration the server calls — one converter list and two call sites, not two lists that drift.
- Cover the call site, not just the converter: a test that builds its own options can't catch this. Exercise the live endpoint.

Tier: always do — when adding a `JsonConverter` for any type that crosses the HTTP boundary.
