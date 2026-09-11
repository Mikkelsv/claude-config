---
name: test
description: "Build, then run the project's test tiers and report one verdict (ALL GOOD, TEST FAILURE / REGRESSION / DRIFT / NEEDS REVIEW). Use whenever the user wants to run tests, verify the build, or check everything works before merging — 'run the tests', 'is it green', 'check before I merge'. Measures and classifies; it never decides whether a verdict halts anything, and it never edits a test. Runs in a sub-agent by default so bulk output stays out of the caller's context; pass \"inline\" to see raw output, \"background\" to detach, \"gate\" to run only the offline tiers (a fast per-task check, e.g. from /implement)."
---

# Test

Build, run every configured test tier, classify each result against the baseline, report one verdict.

`/test` **measures**. `/verify` **decides** — it routes these classifications and owns test-edit provenance. This skill never edits a test and never writes its own baseline.

## Config

Reads `.claude/skill-config/test.md` — **committed**, so colleagues cloning the repo get it too — for project specifics: the **build command**, a **tier table** (name → command → result shape), the **baseline path**, and optionally a **per-tier drift mapping** (how a touched test file maps to test names — necessarily per-project, since it tracks each framework's declaration syntax: xUnit attributes, `def test_*`, a registering constructor).
**Trust the tier table's commands, but verify its result shapes on first use.** A shape describing what a harness script *assembles* rather than what the underlying call *returns* will parse to zero tests and report a green tally over nothing. If a tier's tally comes back zero while the command clearly ran, suspect the declared shape before suspecting the suite, and correct the config.

**No config → degrade honestly, never guess.** Infer what you can from `.claude/launch.json` and obvious conventions, state plainly in the report which tiers you ran and which you could not find, and treat the baseline as absent (below). Never report ALL GOOD for a tier you never ran.

## Invocation modes

`$ARGUMENTS` carries two independent axes — **delegation** (how the result surfaces) and **scope** (which tiers run). Either may be combined with either, e.g. `gate background`.

### Delegation

**Delegated** (default): run the cycle in a synchronous Sonnet sub-agent (`run_in_background: false`) and surface only the verdict plus every not-passed row. This gates exactly like inline — you have the result before continuing — while keeping the payload out of the caller. That payload is the full per-test arrays, several thousand tokens the caller needs for nothing; the agent's context is discarded, the caller's is carried for the rest of the session.

**Inline** (`inline`): every phase in the caller's context. For debugging the harness itself, where a summary is the thing you're trying to inspect.

**Background** (`background`): same delegation, `run_in_background: true`. Returns immediately; check the completion notification before any step depending on the result.

### Scope

**Full** (default): every tier in the config's table.

**Gate** (`gate`): build plus every tier that needs no preview server — inferred from the tier table, never declared (no config field for this; see Phase 1). Tiers needing a server are **skipped, not omitted** — Phase 3's "state which tiers ran" already covers naming them. No tier table to infer from → gate degrades to a full run and says so, per the no-config rule above. Classification is unaffected by scope: a gate run still carries `baseline: <state>` per row exactly as a full run does. Orthogonal to delegation — `/implement`'s per-task check is typically `/test gate` (delegated default).

## Phase 1 — Build and run tiers

1. **In parallel:** stop any running preview server, run the build command, and read the baseline. All three are independent.
2. Build **fails** → fix and rebuild. Still failing after 2 attempts → stop and report.
3. Run each tier from the config's table, **offline tiers first** — those needing no running server or browser, whatever the language: a unit suite, a pytest run, anything driven straight off build output. **In `gate` scope, run only those** — a tier needing a server (one driving `preview_*`, or folded into such a tier's round-trip) is skipped, not run, and named as skipped per Phase 3. Which tier is which is a **judgement call per project**, not a mechanical parse: read the table's command, and where it is opaque, treat the tier as server-dependent and say you did. Guessing a tier is offline gets it run for real; guessing the reverse only costs coverage a full run recovers.
4. A tier exiting non-zero **while reporting zero tests** means a test project contributed nothing — a missing or failed assembly. Treat it as a **build-side failure**, never as a smaller green tally.

`preview_eval` has no top-level `await` — wrap any expression that uses `await` in an IIFE.

## Phase 2 — Classify

`skipped` is neither a pass nor a failure: never classified, never blocks a verdict, always named in the report.

### Baseline freshness

The baseline describes what passes on `main` — not the last run, not per-branch — so freshness is a `main`-relative fact checkable without touching the working tree:

- **Absent** — file missing.
- **Unseeded** — exists with `"seeded": false`, the shape it ships in until someone runs the refresh.
- **Rewritten away** — `git cat-file -e <gitRef>^{commit}` fails; the capture commit no longer exists (a squash rewrote history). Report distinctly from staleness: it needs a fresh capture, not a newer one.
- **Stale** — object exists but `git rev-parse main` ≠ `gitRef`. Split for the report: `git merge-base --is-ancestor <gitRef> main` succeeding means `main` merely advanced; failing means `main` itself was rewritten.
- **Fresh** — `git rev-parse main` equals `gitRef`. Use its `passing` array.

### Failure classification

**Fresh baseline:** failed test in `passing[]` → **REGRESSION**. Absent from it → **FAILURE**.

**Absent, unseeded, rewritten-away, or stale → every failure is FAILURE, never REGRESSION.** A baseline that cannot support "passes on `main`" cannot support the REGRESSION claim either. **Never compute a baseline live** to recover — no temporary worktree, no rebuild at merge-base; that turns a rare deliberate refresh into a silent per-run cost. Carry `baseline: <state>` on every row so `/verify` can see the classification was degraded rather than assuming it held.

Verdict: any REGRESSION → **TEST REGRESSION**; else any FAILURE → **TEST FAILURE**. Both present → primary is TEST REGRESSION, with FAILUREs in the body.

### Drift detection (only when nothing failed)

Catches "we relaxed an assertion and it still passes."

1. **Union the committed range with the working tree**: `git diff --name-only $(git merge-base HEAD main)..HEAD`, plus plain and `--cached` when dirty. Say which inputs you used. **The committed range alone is a blind spot, not a clean result** — `/implement` calls this *before* the task's commit, so a committed-only scan evaluates drift against a range excluding the changes under test, silently disabling this tier during the loop it exists to guard.
2. Map touched files to test names using the config's per-tier rule.
3. **Unmapped is not drift-free.** A touched test file yielding zero names must be reported as **unmapped by name** — a name-extraction miss is indistinguishable from a real drift the rule failed to catch.
4. **Split by provenance — the load-bearing step.** A touched file means nothing; what matters is whether the edit came *before* execution or *after* seeing red. **Requires a fresh baseline** — against a degraded one every passing test looks "was failing at baseline", flooding NEEDS REVIEW with false positives, so skip the split and report plain TEST DRIFT.
   - Was **failing** at baseline, file touched, **now passes** → **NEEDS REVIEW**. The failure may have supplied the content of the edit.
   - Was **passing** at baseline, file touched, still passes → ordinary **TEST DRIFT**. A contract changed and the assertion followed.
   - **Did not exist** at baseline → neither. Absence from `passing[]` covers *was failing* AND *did not exist yet*, and a new test that passes is the normal outcome of writing one. Check whether its declaration line is an addition in the diff. Reporting new tests as NEEDS REVIEW trains the reader to wave the verdict through, costing you the one case it exists to catch.

Verdict: any NEEDS REVIEW → **NEEDS REVIEW** (excluded from the pass count); else any drift → **TEST DRIFT**; else **ALL GOOD**.

## Caller routing — this skill reports, it does not decide

Whether a verdict halts anything is the caller's call, so never assert a pause here. `/implement`'s per-task gate **carries forward** — a failure surviving its short fix loop is recorded and handed on, no stash, no mid-loop pause. `/verify` Phase C **does** pause, on TEST REGRESSION and NEEDS REVIEW, with the whole branch in view. Same verdict, different handling.

## The baseline

Committed, not gitignored — so its `gitRef` is a shared verifiable fact every run compares against, and staleness is something `git` can prove rather than something a per-machine file silently misses. One `passing[]` spans all tiers; fully-qualified names across frameworks don't collide, and one set keeps one classifier.

```json
{ "schemaVersion": 1, "gitRef": "<main tip SHA at capture>", "timestamp": "<ISO 8601>", "seeded": true, "passing": ["Test1", "Test2"] }
```

**`/test` never writes this file** — not by a fix loop, not by a milestone, not by `/implement` finishing a plan. Freshness is *reported* by an ordinary run, never *repaired* by one; rewriting it after a task is exactly the rolling per-run baseline this design replaces. Refreshing is deliberate and manual:

1. **Trigger:** `main` moved — `git rev-parse main` ≠ the file's `gitRef`. Nothing else.
2. Check out `main`'s current tip in a clean worktree, not the branch under test.
3. Run the full cycle there.
4. Collect `name` from every result with `outcome === "passed"` across all tiers. A `skipped` test must **never** enter the set — a vacuous pass here turns a later genuine failure into a false REGRESSION.
5. Write the file with that `gitRef`, a fresh timestamp, `"seeded": true`, and the computed array.
6. Commit it, so every subsequent run everywhere sees it.

Never fabricate `passing[]` to skip the seeding run — a made-up list is a silent false baseline, the exact bug this design removes. If `main`'s own run isn't clean, that is a real problem on `main`; fix it there rather than laundering a failing run into the baseline.

## Phase 3 — Report

State **which tiers ran**, plainly, rather than leaving the caller to infer scope from tallies. Then per tier: `N passed, M failed, K skipped`, with failures by name + reason + classification + baseline state, and skips by name. Call out any test that was `passed` at baseline and now `skipped` — its fixture likely disappeared; informational, no verdict change. For drift, give each test's name and a 1–3 line diff hunk.

End with one bold verdict line, most severe first:

- **NEEDS REVIEW** — a touched test file was failing at baseline and now passes.
- **TEST REGRESSION** — a failure that was passing at baseline.
- **TEST FAILURE** — a failure that was not passing at baseline, *or* any failure under a degraded baseline.
- **TEST DRIFT** — nothing failed, but a test file in the diff changed.
- **ALL GOOD** — nothing failed, no drift. Reachable with skips present.
