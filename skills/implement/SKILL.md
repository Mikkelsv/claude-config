---
name: implement
description: Autonomous development loop — implements a plan task-by-task with build/refactor/test gates
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
   - **Feature branches** (or rule missing): ask via `AskUserQuestion`: **Worktree (Recommended)** or **Current directory**. If on `main`, create branch `implement/{plan-name}` (worktree creates its own).
3. Verify clean working tree. If dirty, ask: stash or continue?
4. Read and validate plan format (see below). **Detect plan type:**
   - **Managing plan** (has `## Phases`): enter Phase Chain mode (see below).
   - **Task plan** (has `## Tasks`): enter normal Loop mode.
5. Flag vague tasks — ask targeted questions. **Don't start until user approves.**
6. **Record squash base** — capture `git rev-parse HEAD` **before any plan-file commit**. The squash folds in both the plan-add and the cleanup-time plan-delete so neither appears in main's history once merged.
   - If the plan file is **uncommitted** (just authored by `/plan` in this session): record current `HEAD` as squash base, then commit the plan via `git commit -m "[DOCS] Add {plan-name} plan."`.
   - If the plan file is **already committed** as the last commit (e.g. resuming a session): record `HEAD~1` as squash base. Do not re-commit.
   - Stash the SHA in your working memory.
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

```markdown
## Task 1: Short description
- [ ] Implement
- [ ] Refactor
- [ ] Docs & tests
- [ ] Done

**Context:** what and why
**Files:** files to touch
**Acceptance:** what done looks like
**Test:** how to verify
**Dependencies:** Task N (if any)
**Parallel group:** A (or — for sequential)
```

## Loop

Runs until all tasks completed or skipped. After each checkpoint, pick next unchecked task.

### Parallel Groups

If task has a group letter, collect all unchecked tasks in that group. Main thread takes one (prefer most downstream dependents). Others launch as background agents with `isolation: "worktree"`, `model: "sonnet"` — implement, build, must run `/refactor-code` (skip only if < 20 lines changed), no `/test`, no commit. After all return, merge one at a time (`git merge --no-ff`). Resolve conflicts or re-queue failed tasks. Run `/test` once on combined result. Commit each via `/commit`.

### 1. Read & Understand

Read current task + scan remaining tasks (don't paint into a corner). Read all `Files:` listed. Take `preview_screenshot` if task touches UI.

### 2. Implement

Make changes following CLAUDE.md conventions. Add tests for new user-facing functionality.

### 3. Build & Test

Run `/test`. **ALL GOOD/NEW BEST** → continue. **TEST FAILURE** → fix loop (max 3: diagnose, fix, re-test; after 3: stash, skip, note). **PERF REGRESSION** → assess if expected, fix if not. **THROTTLED** → re-run.

Check off `- [x] Implement`.

### 4. Refactor (with read-ahead)

**Must run `/refactor-code`** unless the task changed < 20 lines total (sum of insertions + deletions). Check with `git diff --stat` against the last commit.

- **≥ 20 lines:** Run `/refactor-code` as background agent (`model: "sonnet"`). While it runs, read ahead to next task's Context/Files/Acceptance. Process verdict: **Ship it** → continue. **Minor tweaks/Refactor recommended** → stash, apply fixes, re-test (if tests fail: pop stash, keep passing code). **Rethink** → log in Decisions, keep current. Max 3 iterations.
- **< 20 lines:** Skip per-task refactor — Final Audit catches it. Still read ahead to next task. Check off `- [x] Refactor` with note "(deferred — < 20 lines)".

Check off `- [x] Refactor`. Verify acceptance criteria still met. Take "after" screenshot if UI task.

### 5. Design Decisions

Log non-obvious choices to **Decisions & Review Items** in the plan. Check off `- [x] Docs & tests`.

### 6. Checkpoint

Run `/commit {task description}`. Check off `- [x] Done`. One-line status. **→ Next task.**

### When Stuck

Never stop unless all done. 3 fix failures → stash + skip + note. Unclear requirement → best judgment + note. Failed dependency → attempt anyway. Always keep moving.

## Guard Rails

- One task at a time (except parallel groups). Agents build, main thread tests.
- Merge worktrees sequentially, `/test` after all merges.
- Stash on failure after 3 attempts. Max 3 refactor iterations.
- Small drive-bys OK. Test behavior, not internals. Fix code, not tests.

## Final Audit

After all tasks committed (but before Cleanup + Squash):

1. Run `/audit-branch` on the full branch diff. Since this runs at the tail of an implementation, prefer **Defer to plan** for any major architectural rework — it belongs in its own focused plan, not folded into this one. `/audit-branch` handles rule candidates internally.
2. If `/audit-branch` applied fixes inline: run `/test`. If passing, `/commit "[REFAC] Apply Final Audit fixes"`. If failing, stash, note in report, leave to user.
3. If `/audit-branch` deferred to a plan, mention its path in the Report so the user can pick it up via `/implement` next.

## Cleanup

Delete the implemented plan file (and managing plan if applicable). Commit as `[DOCS] Remove implemented {plan-name} plan.`. The deferred-plan from Final Audit, if any, is preserved — it's the next implementation's input. Plans are working documents, not permanent artifacts; the commit history tells the story.

This runs **before Squash** so the plan-delete (and the plan-add committed at Phase 0) both fold into the implementation squash. Net effect on main's history: no plan-file noise.

## Squash

After all tasks + Final Audit + Cleanup committed. **Always run** — collapses the per-task commits, audit-fix commits, plan-add, and plan-delete into one clean implementation commit.

In Phase Chain mode, this runs at the end of each phase's Loop (per-phase squash → one commit per phase). Final Audit + Cleanup still run once at the end of the whole chain.

1. **Compose subject + body.** Subject = imperative summary of the plan (or phase) title. Body = `Squashed from N tasks:` + bullet list of completed task subjects.
2. **Invoke `/squash` automated mode** via the Skill tool with args:

   ```text
   base=<sha-recorded-at-Phase-0>
   message=<subject>\n\n<body>
   push=true
   ```

   `/squash` skips its interactive confirmation when `base=` and `message=` are present, executes via `git-squash-execute.ps1 -Base <sha> -Message "..." -Push`.
3. **Skip** if `git rev-list --count <base>..HEAD` returns 0 or 1 (nothing to squash, or already a single commit).
4. **On error**: report and continue anyway. Don't block on squash failure — the per-task commits remain valid history.

After squash, the branch is one commit ahead of where it was at Phase 0 (or where the previous phase ended in Phase Chain mode).

## Report

Branch name + N commits, tasks completed/skipped, tests added, refactor iterations, perf trend, parallel stats, decisions count, architecture audit findings.

