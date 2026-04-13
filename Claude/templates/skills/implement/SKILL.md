---
name: implement
description: Autonomous development loop — implements a plan task-by-task with build/refactor/test gates
---

# Implementation Loop

Work through a plan task-by-task with build, test, refactor gates. One task = one commit.

## Input

`$ARGUMENTS` = path to plan file. If empty, look in the project's plans directory. No plan → ask user.

## Phase 0 — Setup

1. **Worktree?** Ask via `AskUserQuestion`: **Worktree (Recommended)** or **Current directory**.
2. If on `main`, create branch `implement/{plan-name}`. Worktree creates its own branch.
3. Verify clean working tree. If dirty, ask: stash or continue?
4. Read and validate plan format (see below). **Detect plan type:**
   - **Managing plan** (has `## Phases`): enter Phase Chain mode (see below).
   - **Task plan** (has `## Tasks`): enter normal Loop mode.
5. Flag vague tasks — ask targeted questions. **Don't start until user approves.**
6. Find first unchecked `- [ ] Done` task (or phase). Print: "Resuming at Task/Phase N. M/T done."

## Phase Chain (Managing Plans)

When the plan has `## Phases` instead of `## Tasks`, process phases sequentially:

1. Find the first phase with unchecked `- [ ] Done`.
2. Read that phase's `**Plan:**` path and load the task plan.
3. Run the full Loop (below) on that task plan.
4. After completing all tasks in the phase, check off `- [x] Done` on the phase in the managing plan.
5. Auto-start the next unchecked phase. Repeat until all phases are done.
6. **Final Audit** runs once after all phases complete — not per-phase.

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

If task has a group letter, collect all unchecked tasks in that group. Main thread takes one (prefer most downstream dependents). Others launch as background agents with `isolation: "worktree"` — implement, run `{BUILD_COMMAND}`, must run `/refactor-code` (skip only if < 20 lines changed), no `/test`, no commit. After all return, merge one at a time (`git merge --no-ff`). Resolve conflicts or re-queue. Run `/test` once on combined result. Commit each separately.

### 1. Read & Understand

Read current task + scan remaining tasks (don't paint into a corner). Read all `Files:` listed. Take `preview_screenshot` if task touches UI.

### 2. Implement

Make changes following CLAUDE.md conventions. Add tests for new user-facing functionality.

### 3. Build & Test

Run `/test`. **ALL GOOD/NEW BEST** → continue. **TEST FAILURE** → fix loop (max 3: diagnose, fix, re-test; after 3: stash, skip, note). **PERF REGRESSION** → assess if expected, fix if not. **THROTTLED** → re-run.

Check off `- [x] Implement`.

### 4. Refactor (with read-ahead)

**Must run `/refactor-code`** unless the task changed < 20 lines total (sum of insertions + deletions). Check with `git diff --stat` against the last commit.

- **≥ 20 lines:** Run `/refactor-code` as background agent. While it runs, read ahead to next task's Context/Files/Acceptance. Process verdict: **Ship it** → continue. **Minor tweaks/Refactor recommended** → stash, apply fixes, re-test (if tests fail: pop stash, keep passing code). **Rethink** → log in Decisions, keep current. Max 3 iterations.
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

After all tasks: run `/refactor` (full trio — code, docs, tests; catches anything deferred from small tasks) and `/audit-architecture` on the full branch diff.

## Report

Branch name + N commits, tasks completed/skipped, tests added, refactor iterations, perf trend, parallel stats, decisions count, architecture audit findings.

---

## Customization Guide

- **`{BUILD_COMMAND}`**: Replace with project build command for worktree agents.
- **Test creation**: Document project test patterns for Step 2 if non-obvious.

Commit messages are handled by `/commit`. Plan directory is `plans/`.
