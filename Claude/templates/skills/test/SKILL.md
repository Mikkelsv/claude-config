---
name: test
description: Build, serve, and run tests with optional performance tracking
---

# Test

Build the project, start the server, and run tests.

## Invocation Modes

**Standard mode** (default): Runs the full test cycle inline and reports the verdict. Use when you need to gate on the result before continuing.

**Background mode**: When `$ARGUMENTS` contains `background`, wrap the entire test cycle (all phases) in a single background Agent call and return immediately with "Tests running in background." The agent executes all phases and reports the verdict on completion. Use for fire-and-forget testing when you want to continue working (e.g., reading ahead to the next task) while tests run. The caller should check the agent's completion notification before proceeding with any step that depends on test results.

## Notes

- `preview_eval` does not support top-level `await`. Always wrap async calls in an IIFE: `(async () => { ... })()`
- See `${CLAUDE_SKILL_DIR}/browser-throttling.md` for background tab performance issues.

## Phase 1 — Build & Serve

1. **In parallel:** stop any running preview server (`preview_stop`), build (`{BUILD_COMMAND}`){IF_PERF:, AND read `{BASELINE_PATH}` (if it exists)}. All independent.
2. If the build **fails**, fix the errors and rebuild. If it still fails after 2 attempts, stop and report.
3. Start the server via `preview_start` (name: `{PREVIEW_SERVER_NAME}`).

## Phase 2 — Run All Tests & Gather Data

Run a single `preview_eval` that executes all tests and collects data in one round-trip. Copy the script verbatim from `${CLAUDE_SKILL_DIR}/scripts/smoke-test.js`.

The script should return an object with at minimum:
- `ready` — server readiness info (including `loadMs`)
- `tests` — array of test results (`{name, passed, message}`)
{IF_PERF:- `perf` — array of performance entries (`{label, totalMs, cpuMs, ioMs}`)}
{IF_PERF:- `metrics` — frame timing data (optional)}

## Phase 3 — Baseline Management (Performance Tracking)

> **This phase is optional.** Include it only for projects where performance is a key concern (3D rendering, data processing, real-time applications). Skip for simpler apps (CRUD, forms, quizzes).

The baseline represents the **best known run**. After Phase 2, compare and conditionally update:

1. Compare current `perf` results against the baseline read in Phase 1. Flag regressions where `current / baseline > 1.5`.
2. If current `totalLoadMs` is **faster** (lower) than the baseline: silently overwrite with current results.
3. If current is **slower** and there are no >1.5x regressions: keep the existing baseline, note the difference in the report.
4. If current is **slower** with >1.5x regressions: keep the existing baseline, flag the regressions, and ask the user: "Perf regressions detected. If this is expected (new functionality), should I update the baseline to accept the new numbers?"
5. If no previous baseline exists: write current results as the first baseline.

Write the baseline as JSON:

```json
{
  "timestamp": "<ISO 8601>",
  "totalLoadMs": 5600,
  "entries": [
    { "label": "Category Name", "totalMs": 3200, "cpuMs": 3100, "ioMs": 100 }
  ]
}
```

## Phase 4 — Report

Report results concisely:

- Smoke test summary: X/Y passed, list any failures

**If performance tracking is enabled:**
- Perf baseline comparison: only show categories where `current / baseline > 1.05`. If all within 5%, report "Perf within baseline." Flag any >1.5x as regressions.
- Load time table:

```text
Category              Total    CPU     IO
─────────────────────────────────────────
Category A            13575ms  8200ms  5375ms
Category B                8ms     8ms     0ms
─────────────────────────────────────────
Total                 13583ms
```

- Frame timing from metrics (if samples exist):

```text
Frame interval: 16.2ms avg (61 fps)
```

- If `ready.loadMs > 15000`, warn user — see `${CLAUDE_SKILL_DIR}/browser-throttling.md`.

End the report with a single bold verdict line:

**With performance tracking:**
- **ALL GOOD** — all tests passed, perf within baseline
- **NEW BEST** — all tests passed, new baseline saved
- **PERF DRIFT** — all tests passed, but >5% slower (no >1.5x regressions)
- **PERF REGRESSION** — >1.5x regression detected
- **THROTTLED** — `ready.loadMs > 15000`, results unreliable
- **TEST FAILURE** — one or more smoke tests failed

**Without performance tracking:**
- **ALL GOOD** — all tests passed
- **TEST FAILURE** — one or more smoke tests failed

---

## Customization Guide

When scaffolding this skill for a project, replace these placeholders:

| Placeholder | Example | Description |
|---|---|---|
| `{BUILD_COMMAND}` | `dotnet build` | Command to compile the project |
| `{PREVIEW_SERVER_NAME}` | `gridpreview` | Name from `.claude/launch.json` |

**If performance tracking is enabled**, also set:

| Placeholder | Example | Description |
|---|---|---|
| `{BASELINE_PATH}` | `MyProject.Debug/perf-baseline.json` | Where to store perf baseline (gitignore it) |

If performance tracking is **not** needed, remove Phase 3 entirely and simplify Phase 4 to just test pass/fail.

Also generate `scripts/smoke-test.js` with the project's test execution script (the JS expression that runs in `preview_eval`).

Background mode (see Invocation Modes) uses the Agent tool for async test execution. No additional configuration needed.
