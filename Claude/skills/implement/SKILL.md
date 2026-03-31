---
name: implement
description: Autonomous development loop — implements a plan task-by-task with build/refactor/test gates
---

# Implementation Loop

Autonomous development loop that works through a structured plan, implementing one task at a time with build, refactor, and test gates between each. Each completed task is committed as a single commit for a clean git history.

## Input

`$ARGUMENTS` should be a path to a plan file (markdown). If empty, look for an active plan in the project's plans directory. If no plan exists, stop and ask the user to provide one.

## Phase 0 — Setup

Before touching any code:

1. **Worktree decision:** Ask the user with `AskUserQuestion` whether to work in a worktree or the current working directory:
   - **Worktree (Recommended)** — isolated copy of the repo, keeps main branch clean. Use `EnterWorktree` with the plan name (e.g., `implement-add-depth-coloring`).
   - **Current directory** — work directly in the current checkout.
2. Check if we're on `main`. If so, create and checkout a new branch: `implement/{plan-name}` (derive from plan filename, e.g. `implement/add-depth-coloring`). Skip if using a worktree (it creates its own branch).
3. If already on a non-main branch, use it as-is.
4. Verify clean working tree (`git status`). If dirty, ask the user whether to stash or continue.
5. Read the plan file and **validate its format** against the Plan Format section below. Every task must have the required checkboxes (`Implement`, `Refactor`, `Docs & tests`, `Done`) and fields (`Context`, `Files`, `Acceptance`, `Test`). If the plan doesn't match the expected format, show the user what's missing and ask them to rewrite it.
   - **Content review:** Also assess whether each task has enough detail to implement confidently. Flag tasks with vague or thin descriptions — e.g., a task that just says "add sharing" without specifying scope, behavior, or constraints. For each flagged task, ask the user targeted questions: what does the feature do, what are the inputs/outputs, what edge cases matter, etc. Collect the answers and let the user update the plan before proceeding.
   - **Do not start implementation until the user has reviewed and approved the plan.**
6. Find the first task where `- [ ] Done` is unchecked — this is where to resume. Skip any fully checked-off tasks (they were completed in a previous session).
7. Print a one-line progress summary: "Resuming at Task N. M/T tasks done." This orients both you and the user on where things stand.

## Plan Format

The plan must have tasks as markdown checkboxes. Each task should be atomic and independently testable:

```markdown
## Task 1: Short description
- [ ] Implement
- [ ] Refactor
- [ ] Docs & tests
- [ ] Done

**Context:** what this task does and why
**Files:** likely files to touch
**Acceptance:** what "done" looks like
**Test:** how to verify (new test, existing tests pass, visual check)
**Dependencies:** Task N (if this task builds on a previous one)
**Parallel group:** A (tasks in the same group may execute simultaneously; — means sequential)
```

**Dependencies:** If a task's dependency was skipped, log a note in **Decisions & Review Items** and attempt the task anyway. If it fails because of the missing dependency, skip it with a note.

**Parallel group:** Assigned during `/plan` and validated by the user. Tasks in the same group (e.g., `A`, `B`) have disjoint file sets and no dependency relationship, so they can safely run in parallel. A value of `—` means the task runs sequentially. See "Parallel Group Dispatch" in the Loop for execution details.

## Loop

**This loop runs until every task is completed or skipped. After each checkpoint (Step 6), return here and pick up the next unchecked task.**

For each unchecked task in order:

### Parallel Group Dispatch

Before starting a task, check its `**Parallel group:**` field. If it is `—` (or absent), proceed to Step 1 below as normal.

If it has a group letter (e.g., `A`), collect **all unchecked tasks in the same group**. These tasks were validated as safe to parallelize during `/plan` (disjoint files, no shared dependencies). Execute them as follows:

1. **Main thread** takes one task from the group — prefer the one with the most downstream dependents (to unblock future tasks earliest). Run the full sequential cycle (Steps 1–6) for this task.

2. **Background agents** take the remaining tasks in the group. For each, launch a background Agent with `isolation: "worktree"` and these instructions:
   - Read the task's Context, Files, and Acceptance
   - Implement the task following all project conventions from CLAUDE.md
   - Read `Claude/local/skills/build/config.md` for the build command. Run it to verify compilation. If it fails, fix and retry (max 3 attempts).
   - Run `/refactor` on the changes (reviews the worktree diff)
   - Do **not** run `/test` (no preview server access in a worktree)
   - Do **not** commit
   - Report back: what was implemented, build result, refactor verdict, any issues

3. **After all agents return**, merge each worktree branch into the working branch one at a time (`git merge --no-ff <branch>`):
   - If a merge conflict occurs: attempt auto-resolution. If unresolvable, log in **Decisions & Review Items** and re-implement that task sequentially after the group completes.
   - After all successful merges: run `/test` once on the combined result.
   - If tests fail: diagnose which task's changes broke things. Fix the issue or revert that task's merge and re-queue it for sequential execution. Max 3 fix attempts on the combined result.
   - Commit each task separately via `/commit {task description}` (one commit per task).

4. Check off all completed tasks in the group, then proceed to the next unchecked task in the plan.

### 1. Read & Understand

Read the current task **and scan the remaining tasks** in the plan. Every implementation decision should account for what's coming next — don't paint yourself into a corner that a later task will undo. If the current task could be implemented in multiple ways, prefer the approach that aligns with or enables future tasks.

Read all files listed under `Files:`. Understand the existing code before changing anything.

**Visual baseline:** If the task touches UI (pages, components, styles), take a `preview_screenshot` before making any changes. This is the "before" image for comparison later. Skip for backend-only tasks (models, services, APIs with no UI impact).

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

### 4. Refactor Pass (with read-ahead)

Launch `/refactor` as a **background Agent** on the uncommitted changes. All implementation work is still uncommitted at this point, so `/refactor` sees the full task diff. `/refactor` spawns three parallel sub-skills: `refactor-code` (code quality), `refactor-docs` (documentation sync), and `refactor-tests` (test coverage).

**While refactor runs**, start reading ahead to the next task: read its `**Context:**`, `**Files:**`, and `**Acceptance:**` fields, and read all files listed under `**Files:**`. This loads context so you're ready to implement as soon as the current task is fully committed. If this is the **last task** in the plan, skip the read-ahead and wait for refactor inline.

**When refactor returns**, process the verdict:

- **Ship it** — no changes needed, continue
- **Minor tweaks** or **Refactor recommended** — before applying, `git stash` the current working state as a safe point. Apply the suggested fixes, then re-run `/test`:
  - If tests pass: drop the stash (`git stash drop`), continue
  - If tests fail: restore the pre-refactor state (`git stash pop`), continue with the code that already passed. Note the failed refactor attempt in **Decisions & Review Items**.
- **Rethink** — log the concern in **Decisions & Review Items** with the suggested alternative. Keep the current implementation (it passes tests) and move on.

The refactor/test cycle repeats until `/refactor` returns "Ship it" or "Minor tweaks" applied cleanly (max 3 refactor iterations per task).

> **Important:** Never start *implementing* the next task while the current task's refactor is still pending. Read-ahead is read-only preparation. Implementation of the next task only begins after the current task is fully committed in Step 6.

Check off `- [x] Refactor`. Do not commit yet.

> **Feature parity gate:** Before moving to Step 5, re-read the task's **Acceptance** criteria and verify every listed behavior still works. If refactoring broke or altered intended functionality, fix it now and re-run `/test`. Do not proceed until acceptance is met.

**Visual diff:** If a baseline screenshot was taken in Step 1, take an "after" `preview_screenshot` now and compare the two images. Check for:

- Unintended layout shifts or broken styling
- Missing or displaced elements
- Visual regressions unrelated to the task's intended changes

If something looks wrong that isn't an intentional change, fix it and re-run `/test`. Note any intentional visual changes in **Decisions & Review Items**.

### 5. Design Decisions

Documentation and test coverage are handled by `/refactor` (via its `refactor-docs` and `refactor-tests` sub-skills in Step 4). This step is for reflection only.

Were any non-obvious choices made during implementation or refactoring? Things like:

- Chose approach A over B — why?
- Accepted a trade-off (performance vs simplicity, etc.)
- Deviated from the plan's suggested approach
- Noticed something that affects future tasks in the plan

If any, add them to the **Decisions & Review Items** section in the plan. Even small notes help — the user reads these to understand the "why" behind the code.

Check off `- [x] Docs & tests`. Do not commit yet.

### 6. Checkpoint

Run `/commit {task description}` to commit and push all changes from steps 2-5. The commit skill picks the TYPE automatically. One task = one commit.

- Check off `- [x] Done` in the plan
- Brief one-line status to the user: "Task 3 done: added depth coloring toggle. 5/12 complete."

**→ Return to the top of the Loop and begin the next unchecked task. Do NOT stop here.**

### 7. When Stuck

The loop should **never stop** unless all tasks are complete. When facing obstacles:

- **3 fix attempts failed on a task** — `git stash` to save the work, skip the task. Log the stash ref and failure reason in **Decisions & Review Items**.
- **Build fails after 2 fix attempts** — same: stash, skip, note.
- **Unclear requirement** — make the best judgment call, implement it, and add a note to **Decisions & Review Items**.
- **Perf regression** — accept it if inherent to new functionality, note it. If unexpected, attempt one fix. If still regressed, note and move on.
- **Dependency was skipped** — attempt anyway. If it fails because of the missing dependency, skip with a note.

Always keep moving forward. The user reviews decisions after the full loop completes.

## Guard Rails

- **One task at a time (sequential).** Never start the next task before the current one passes `/test` (or is explicitly skipped). Exception: tasks in the same parallel group run concurrently — but all must pass `/test` before the next group or sequential task starts.
- **Agents build, main thread tests.** Background agents verify compilation and run `/refactor`, but only the main thread runs `/test`. The preview server is a singleton.
- **Merge sequentially.** When a parallel group completes, merge each agent's worktree one at a time. Run `/test` after all merges, not after each.
- **Revert on failure.** If stuck after 3 attempts: `git stash` to save work and restore clean state.
- **Small drive-bys are OK.** If you're in a file and notice something clearly wrong (dead import, stale comment), fix it. Don't go hunting.
- **Test the right thing.** New tests should test the feature's observable behavior, not implementation internals. A test that breaks on a valid refactor is a bad test.
- **Don't game the tests.** If a test fails, fix the code, not the test (unless the test itself is buggy).
- **Refactor is bounded.** Max 3 refactor iterations per task.
- **One commit per task.** All work for a task is committed together at the checkpoint.

## Final Audit

After all tasks are processed (before the report), run `/audit-architecture` on the full branch diff. This is a holistic architecture review across all committed tasks — it catches overengineering, boundary violations, and structural issues that only become visible when you see the changes together.

Include the audit findings verbatim in the report under **Architecture Audit**.

## Decisions & Review Items

At the end of the plan file, maintain a section:

```markdown
## Decisions & Review Items

Items logged during the implementation loop for user review.

- **Task 3 — skipped**: failed after 3 attempts, stash ref `abc1234`. Error: ...
- **Task 5 — ambiguity**: spec said "toggle coloring" but didn't specify scope. Implemented as global. Revisit if per-viewport is needed.
- **Task 7 — perf note**: Category X +12% due to new sampling. Likely inherent.
- **Task 9 — rethink suggested**: /refactor flagged an alternative approach. Kept current since it works. Consider migrating.
```

This section is the handoff to the user. They review it after the loop exits and decide what to revisit.

## Report

When all tasks are processed, report:

- Branch: `implement/{name}` with N commits
- Tasks completed: X/Y
- Tasks skipped (with brief reason each)
- New tests added
- Refactor passes: how many tasks needed refactoring, how many iterations total
- Perf trend: faster/same/slower than baseline
- Parallel execution: N tasks parallelized across M groups, K merge conflicts resolved (if any parallel groups were used)
- Number of decisions/review items logged — remind user to check the plan
- **Architecture Audit** — full `/audit-architecture` findings across the branch diff (boundary violations, overengineering, alternative approaches)



## Local Config

If `Claude/local/skills/implement/config.md` exists, read it for:
- **Commit prefix convention** (default: `FEAT:`/`FIX:`/`REFACTOR:`)
- **Plan directory** (default: `plans/`)
- **Test creation conventions** (how to add tests for new features)
