---
name: implement
description: "Autonomous development loop — implements a plan task-by-task with build/refactor/test gates, branching, squashing, and Final Audit. Use when a plan file exists and the user wants it executed — \"implement this\", \"go build it\", \"start the work\", \"run the plan\". No plan yet? Run /plan first."
---

# Implementation Loop

Work through a plan task-by-task with build, test, refactor gates. One task = one commit during the loop; **all tasks squash to one commit per plan / per phase before Final Audit** (see Squash section below).

## Input

`$ARGUMENTS` = path to plan file. If empty, look in the project's plans directory. No plan → ask user.

## Phase 0 — Setup

1. **Read project context**: `CLAUDE.md`, `.claude/rules/` (including `git-workflow.md` if it exists), and `docs/` if it exists. These set the conventions you must follow during implementation.
2. **Branch / worktree** — branch on the `git-workflow.md` rule:
   - **Direct to main**: skip branch creation. Work on main directly.
   - **Worktree per feature**: create a worktree for `implement/{plan-name}` without asking.
   - **Feature branches** (or rule missing): default to the current directory — do NOT ask about worktrees. If on `main`, create branch `implement/{plan-name}` and `git checkout` it. Only create a worktree if the user explicitly asks for one in their request.
3. Verify clean working tree. If dirty, ask: stash or continue?
4. Read and validate plan format (see below). **Detect plan type:**
   - **Managing plan** (has `## Phases`): enter Phase Chain mode (see below).
   - **Task plan** (has `## Tasks`): enter normal Loop mode.

   **Resolve execution mode** (inline vs agentic) in this priority order:

   - CLI flag in `$ARGUMENTS`: `--inline` or `--agentic` wins outright.
   - Plan front matter: `mode: agentic` (or `inline`) — sticky per-plan.
   - Auto-detect: **agentic** when task count > 5, else **inline**.

   Print one line: `Mode: <inline|agentic>`. In agentic mode, each task runs in a fresh Sonnet sub-agent so context doesn't drift across the loop; the plan file becomes durable cross-task state via the sub-agent's `**Implementation notes:**` mandate (see Loop step 2).
5. Flag vague tasks — ask targeted questions. **Don't start until user approves.**
6. **Record squash base** — `git rev-parse HEAD` **before any plan-file commit**, so the plan-add and the later plan-delete both fold into the squash. Keep the SHA in working memory.
   - Plan file **uncommitted**: record current `HEAD`, then commit it as `[Docs] Add {plan-name} plan.`.
   - Plan file **already the last commit** (resumed session): record `HEAD~1`, don't re-commit.
   - **`plans/` gitignored**: record current `HEAD`; there is no plan commit to make.
7. Find first unchecked `- [ ] Done` task (or phase). Print: "Resuming at Task/Phase N. M/T done."

## Phase Chain (Managing Plans)

When the plan has `## Phases` instead of `## Tasks`, process phases sequentially:

1. Find the first phase with unchecked `- [ ] Done`.
2. **Re-record squash base** for this phase = current `git rev-parse HEAD` (the commit before this phase's work starts; differs per phase).
3. Read that phase's `**Plan:**` path and load the task plan.
4. Run the full Loop (below) on that task plan, **including the Squash step at end**. Each phase produces one squashed commit.
5. After completing all tasks in the phase, check off `- [x] Done` on the phase in the managing plan.
6. Auto-start the next unchecked phase. Repeat until all phases are done.
7. **Final Audit** runs once after all phases complete — not per-phase.

Phase-level decisions are logged in the managing plan's **Decisions & Review Items**. Task-level decisions go in each phase's task plan.

## Plan Format

Optional front matter at the top of the file pins the execution mode (otherwise auto-detected by task count):

```yaml
---
mode: agentic  # or inline; omit for auto-detect
---
```

Task block:

```markdown
## Task 1: Short description — **milestone** (marker optional; Step 3 reads it)
- [ ] Implement
- [ ] Refactor
- [ ] Docs & tests
- [ ] Done

**Context:** what and why
**Files:** files to touch
**Acceptance:** what done looks like
**Verify:** one instrument per acceptance criterion — the ladder is in `/plan`'s "The `**Verify:**` field"; `human:` is first-class
**Test:** how to verify
**Dependencies:** Task N (if any)
**Parallel group:** A (or — for sequential)
**Implementation notes:** (appended by the executing sub-agent in agentic mode)
- <gotcha, deviation, or cross-cutting flag>
```

## Loop

Runs until all tasks completed or skipped. After each checkpoint, pick next unchecked task.

### Parallel Groups

If a task has a group letter, collect every unchecked task in that group. Main thread takes one (prefer most downstream dependents); the rest run as background agents, `isolation: "worktree"`, `model: "sonnet"`.

- Each agent: implement, build, must run `/refactor-code` (skip only if < 20 lines changed), no `/test`, no commit.
- **Give each agent its expected base SHA and require it to confirm the worktree matches before editing.** A diff from an unexpected parent is internally correct and applies to the wrong tree — the merge then conflicts confusingly or silently drops the change.
- **A write-capable agent re-reads live state** (the file, the diff range) rather than trusting what it got at spawn time. Siblings edit concurrently, so a frozen snapshot goes stale and acting on it clobbers their work.
- Where the partition is genuinely disjoint, a shared tree is acceptable if no agent runs a git write — but verify the touched-file set afterwards either way, per `wf-check-the-artifact-not-the-self-report`.
- After all return: merge one at a time (`git merge --no-ff`), resolving conflicts or re-queuing failures. Run the Step 3 gate once on the combined result — full `/test` if any task in the group was a milestone. Commit each via `/commit`.

### 1. Read & Understand

Scan remaining tasks in the plan (don't paint into a corner). Take `preview_screenshot` if task touches UI.

**Inline mode**: also read all `Files:` listed before implementing.
**Agentic mode**: skip the `Files:` read — the sub-agent reads them itself with a fresh context.

### 2. Implement

**Inline mode**: make changes following CLAUDE.md conventions. Add tests for new user-facing functionality. Before returning, run each `**Verify:**` instrument for the task's acceptance criteria — the plan already committed to each one being checkable, so if the instrument doesn't exist yet, build it first.

**Agentic mode**: spawn a Sonnet sub-agent via the `Agent` tool (`model: "sonnet"`) with a brief containing:

- Full plan file contents (carries prior tasks' `**Implementation notes:**`)
- Target task ID + its `Context:` / `Files:` / `Acceptance:` / `Verify:` / `Test:` block
- Project root path
- Mandate:
  1. Implement the task following `CLAUDE.md` + project rules. Add tests for new user-facing functionality.
  2. **Before returning, run each `**Verify:**` instrument for the task's acceptance criteria.** If the instrument doesn't exist yet, build it — the plan already committed to it being checkable.
  3. **Before returning, append a `**Implementation notes:**` bullet list under this task in the plan file** — gotchas, deviations from plan, helpers/types introduced, anything future tasks need to know.
  4. DO NOT run `/test` (orchestrator handles).
  5. DO NOT commit.
  6. Return a brief structured summary: files touched, work summary, any cross-cutting flags affecting future tasks.

Read the agent's returned summary. Don't re-read the touched files — trust the summary + the Implementation notes in the plan.

### 3. Build & Test

Pick this task's gate, most specific rule first:

1. **Task heading carries the literal ` — **milestone**` marker, or this is the plan's last task** → re-ground first (re-read the plan file and its `## UI Contract`), then run the `Test:` instrument if one is named, then full `/test`. A milestone **adds** the suite, never replaces a named check — a task-written scenario may not be in `/test`'s tier table at all.
2. **Task's `Test:` field names a browser or UI instrument** (a standing scenario, a task-written scenario, the integration suite, or `human: <what to look at>`) → run that instrument alone. Never broaden it to a full `/test`.
3. **Otherwise (default)** → `/test gate` — build plus every tier needing no preview server; `/test` alone owns which tiers that resolves to.

Route on the verdict:

- **ALL GOOD** → continue.
- **TEST DRIFT** → continue, and log the touched test plus its diff hunk in `Decisions & Review Items`.
- **TEST FAILURE** → short fix loop, max 3 (diagnose, fix, re-test). If it survives all three, record it in `Decisions & Review Items` and **carry forward** — no stash, no mid-loop pause.
- **TEST REGRESSION** or **NEEDS REVIEW** → don't attempt a fix and don't pause. Record the verdict, the failing test names and `/test`'s reported baseline state, then carry forward. `/verify` pauses on both at end-of-plan with the whole branch in view; stopping here would block the loop on a judgment this gate can't make.

If `/test` reports `baseline: none`, its classification is degraded — every failure arrives as TEST FAILURE regardless of history. Note that next to the verdict rather than treating the class as established.

Check off `- [x] Implement`.

### 4. Refactor (with read-ahead)

**Must run `/refactor-code`** unless the task changed < 20 lines total (sum of insertions + deletions). Check with `git diff --stat` against the last commit.

- **≥ 20 lines:** Run `/refactor-code` as background agent (`model: "sonnet"`). While it runs, read ahead to next task's Context/Files/Acceptance. Process verdict: **Ship it** → continue. **Minor tweaks/Refactor recommended** → stash, apply fixes, re-test (if tests fail: pop stash, keep passing code). **Rethink** → log in Decisions, keep current. Max 3 iterations.
- **< 20 lines:** Skip per-task refactor — Final Audit catches it. Still read ahead to next task. Check off `- [x] Refactor` with note "(deferred — < 20 lines)".

Check off `- [x] Refactor`. Verify acceptance criteria still met. Take "after" screenshot if UI task.

### 5. Design Decisions

Log non-obvious choices to **Decisions & Review Items** in the plan. In agentic mode, also promote any cross-cutting items from the sub-agent's `**Implementation notes:**` (issues that affect future tasks, not just local quirks) into Decisions & Review Items so they're visible at plan-level, not buried under one task. Check off `- [x] Docs & tests`.

### 6. Checkpoint

Run `/commit {task description}`. Check off `- [x] Done`. One-line status. **→ Next task.**

### When Stuck

Never stop unless all done — unless the user explicitly pauses the loop. 3 fix failures → stash + skip + note. Unclear requirement → best judgment + note. Failed dependency → attempt anyway. Always keep moving.

## Guard Rails

- One task at a time (except parallel groups). Agents build, main thread tests.
- Merge worktrees sequentially, `/test` after all merges.
- Stash on failure after 3 attempts. Max 3 refactor iterations.
- Small drive-bys OK. Test behavior, not internals. Fix code, not tests — a red-driven change to an existing assertion routes through `/verify`, which records provenance per edit.

## Verify

After all tasks are committed: run `/verify {plan-path}`. Confirms the work holds **before** auditing its quality — a criterion `/verify` reports `fail` or `can't-tell` on is unfinished work, not a Final Audit style nit. `/verify` owns its own routing, including pausing on a regression; this step is only the call site.

In Phase Chain mode this runs once after the whole chain completes, alongside Final Audit — not per phase.

**`/verify` runs twice by design — don't collapse them.** This call asks "did we build it," before six audit sub-agents run against unfinished work. `/audit-branch`'s trailing call (its Phase 8) asks "did the audit break it," after the fleet has edited more code.

## Final Audit

After all tasks committed (but before Cleanup + Squash):

1. Run `/audit-branch` on the full branch diff. Since this runs at the tail of an implementation, prefer **Defer to plan** for any major architectural rework — it belongs in its own focused plan, not folded into this one. `/audit-branch` handles rule candidates internally.
2. If `/audit-branch` applied fixes inline: run `/test`. If passing, `/commit "[Refac] Apply Final Audit fixes"`. If failing, stash, note in report, leave to user.
3. If `/audit-branch` deferred to a plan, mention its path in the Report so the user can pick it up via `/implement` next.

## Cleanup

Delete the implemented plan file (and managing plan if applicable). Commit as `[Docs] Remove implemented {plan-name} plan.`. Preserve any plan deferred by Final Audit — it's the next implementation's input.

Runs **before Squash**, so plan-add and plan-delete both fold in and main carries no plan-file noise. **Where `plans/` is gitignored, delete without committing** — there is nothing to fold.

## Squash

After all tasks + Final Audit + Cleanup committed. Collapses per-task commits, audit-fix commits, plan-add and plan-delete into one implementation commit. In Phase Chain mode it runs per phase; Final Audit + Cleanup still run once for the whole chain.

1. **Compose subject + body.** Subject = imperative summary of the plan (or phase) title. Body = `Squashed from N tasks:` + the completed task subjects.
2. **Invoke `/squash`** with `base=<sha-recorded-at-Phase-0>`, `message=<subject>\n\n<body>`, `push=true`. Those arguments skip its interactive confirmation.
3. **Skip when the commits are already pushed to a shared branch** — on `main`, or any branch someone else may have pulled. Rewriting there needs a force-push, which is never worth a tidier history; per-task commits stand.
4. **Skip** if `git rev-list --count <base>..HEAD` is 0 or 1 — nothing to squash.
5. **On error**: report and continue. The per-task commits remain valid history.

## Report

Branch name + N commits, tasks completed/skipped, tests added, refactor iterations, parallel stats, decisions count, architecture audit findings.

