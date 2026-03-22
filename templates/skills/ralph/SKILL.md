---
name: ralph
description: Autonomous development loop — implements a plan task-by-task with build/refactor/test gates
---

# Ralph Loop

Autonomous development loop that works through a structured plan, implementing one task at a time with build, refactor, and test gates between each. Each completed task is committed as a single commit for a clean git history.

## Input

`$ARGUMENTS` should be a path to a plan file (markdown). If empty, look for an active plan in the project's plans directory. If no plan exists, stop and ask the user to provide one.

## Phase 0 — Setup

Before touching any code:

1. Check if we're on `main`. If so, create and checkout a new branch: `ralph/{plan-name}` (derive from plan filename, e.g. `ralph/add-depth-coloring`).
2. If already on a non-main branch, use it as-is.
3. Verify clean working tree (`git status`). If dirty, ask the user whether to stash or continue.
4. Read the plan file. Find the first task where `- [ ] Done` is unchecked — this is where to resume. Skip any fully checked-off tasks (they were completed in a previous session).

## Plan Format

The plan must have tasks as markdown checkboxes. Each task should be atomic and independently testable:

```markdown
## Task 1: Short description
- [ ] Implement
- [ ] Refactor
- [ ] Docs & tests
- [ ] Done

Context: what this task does and why
Files: likely files to touch
Acceptance: what "done" looks like
Test: how to verify (new test, existing tests pass, visual check)
Dependencies: Task N (if this task builds on a previous one)
```

If a task has a **Dependencies** field and the dependency was skipped, log a note in **Decisions & Review Items** and attempt the task anyway. If it fails because of the missing dependency, skip it with a note.

## Loop

For each unchecked task in order:

### 1. Read & Understand

Read the current task **and scan the remaining tasks** in the plan. Every implementation decision should account for what's coming next — don't paint yourself into a corner that a later task will undo. If the current task could be implemented in multiple ways, prefer the approach that aligns with or enables future tasks.

Read all files listed under `Files:`. Understand the existing code before changing anything.

### 2. Implement

Make the changes. Follow all project conventions from CLAUDE.md.

If the task adds new user-facing functionality or modifiable state, add tests following the project's testing conventions. If the task is a refactor or internal change with no new observable behavior, existing tests are sufficient.

### 3. Build & Test

Run `/test`. Check the verdict:

- **ALL GOOD** or **NEW BEST** — tests pass, continue to refactor
- **TEST FAILURE** — enter fix loop (see below)
- **PERF REGRESSION** — assess if expected. If the task inherently adds load, note it and continue. If unexpected, enter fix loop.
- **THROTTLED** — warn user, re-run `/test`. Don't count as an attempt.

**Fix loop** (max 3 attempts per task):

1. Diagnose the failure from the test output
2. Fix the code
3. Re-run `/test`
4. If ALL GOOD: exit fix loop, continue
5. If still failing after 3 attempts: `git stash` to save the work, skip task, note stash ref in plan

Check off `- [x] Implement`. Do not commit yet.

### 4. Refactor Pass

Run `/refactor` on the uncommitted changes. All implementation work is still uncommitted at this point, so `/refactor` sees the full task diff.

Based on the verdict:

- **Ship it** — no changes needed, continue to docs
- **Minor tweaks** or **Refactor recommended** — before applying, `git stash` the current working state as a safe point. Apply the suggested fixes, then re-run `/test`:
  - If tests pass: drop the stash (`git stash drop`), continue
  - If tests fail: restore the pre-refactor state (`git stash pop`), continue with the code that already passed. Note the failed refactor attempt in **Decisions & Review Items**.
- **Rethink** — log the concern in **Decisions & Review Items** with the suggested alternative. Keep the current implementation (it passes tests) and move on.

The refactor/test cycle repeats until `/refactor` returns "Ship it" or "Minor tweaks" applied cleanly (max 3 refactor iterations per task).

**Feature parity check:** Before moving on, re-read the task's **Acceptance** criteria and verify every listed behavior still works. Refactoring must not accidentally remove or alter intended functionality.

Check off `- [x] Refactor`. Do not commit yet.

### 5. Docs & Test Hygiene

Review what should be documented or tested:

**Docs** — check if any of these need updating based on what changed:

- `CLAUDE.md` — new patterns, structure, or conventions?
- `.claude/docs/` or `.claude/rules/` — architecture docs affected?
- Code comments — only where the logic isn't self-evident.

Only update docs that are actually affected by the task.

**Tests** — review existing tests in light of the new code:

- Does the new functionality expose edge cases that existing tests don't cover?
- Are existing tests still testing the right thing?
- Could an existing test be strengthened?

If changes are made here, re-run `/test` to confirm everything still passes.

**Design decisions** — reflect on the task as a whole. Were any non-obvious choices made? Add them to the **Decisions & Review Items** section in the plan.

Check off `- [x] Docs & tests`. Do not commit yet.

### 6. Checkpoint

**Commit** all changes from steps 2-5 as a single commit: `FEAT: {task description}` (or `FIX:`, `REFACTOR:` as appropriate). One task = one commit.

- Check off `- [x] Done` in the plan
- Brief one-line status to the user: "Task 3 done: added depth coloring toggle. 5/12 complete."

### 7. When Stuck

The loop should **never stop** unless all tasks are complete. When facing obstacles:

- **3 fix attempts failed on a task** — `git stash` to save the work, skip the task. Log the stash ref and failure reason in **Decisions & Review Items**.
- **Build fails after 2 fix attempts** — same: stash, skip, note.
- **Unclear requirement** — make the best judgment call, implement it, and add a note to **Decisions & Review Items**.
- **Perf regression** — accept it if inherent to new functionality, note it. If unexpected, attempt one fix. If still regressed, note and move on.
- **Dependency was skipped** — attempt anyway. If it fails because of the missing dependency, skip with a note.

Always keep moving forward. The user reviews decisions after the full loop completes.

## Guard Rails

- **One task at a time.** Never start the next task before the current one passes `/test` (or is explicitly skipped).
- **Revert on failure.** If stuck after 3 attempts: `git stash` to save work and restore clean state.
- **Small drive-bys are OK.** If you're in a file and notice something clearly wrong (dead import, stale comment), fix it. Don't go hunting.
- **Test the right thing.** Tests should test observable behavior, not implementation internals.
- **Don't game the tests.** If a test fails, fix the code, not the test (unless the test itself is buggy).
- **Refactor is bounded.** Max 3 refactor iterations per task.
- **One commit per task.** All work for a task is committed together at the checkpoint.

## Decisions & Review Items

At the end of the plan file, maintain a section:

```markdown
## Decisions & Review Items

Items logged during the ralph loop for user review.

- **Task 3 — skipped**: failed after 3 attempts, stash ref `abc1234`. Error: ...
- **Task 5 — ambiguity**: spec said "toggle coloring" but didn't specify scope. Implemented as global. Revisit if per-viewport is needed.
- **Task 7 — perf note**: Category X +12% due to new sampling. Likely inherent.
- **Task 9 — rethink suggested**: /refactor flagged an alternative approach. Kept current since it works. Consider migrating.
```

This section is the handoff to the user. They review it after the loop exits and decide what to revisit.

## Report

When all tasks are processed, report:

- Branch: `ralph/{name}` with N commits
- Tasks completed: X/Y
- Tasks skipped (with brief reason each)
- New tests added
- Refactor passes: how many tasks needed refactoring, how many iterations total
- Perf trend: faster/same/slower than baseline
- Number of decisions/review items logged — remind user to check the plan

---

## Customization Guide

When scaffolding this skill for a project, customize:

- **Test creation** (Step 2): How to add new tests — file locations, test framework patterns, registration. Reference the project's test conventions.
- **Commit prefix convention**: Default is `FEAT:`/`FIX:`/`REFACTOR:`. Adjust if the project uses a different format.
- **Plan directory**: Default looks in project root `plans/`. Change if different.
- **Doc files to check** (Step 5): List the project's specific doc files that might need updating.
