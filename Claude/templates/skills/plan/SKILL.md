---
name: plan
description: Plan out a new feature through collaborative discovery and create an implementation plan
---

# Feature Planning

Collaborative feature discovery and planning. Takes a rough feature idea, explores it through questions, and produces a structured implementation plan.

## Input

> $ARGUMENTS

If empty, ask the user what feature they'd like to plan.

## Phase 1 — Understand the Idea

Read the input and form an initial understanding of what the user wants. Then explore the codebase to build context.

**For broad features** (touching multiple areas, or relevant code isn't immediately obvious), launch parallel explore agents to build context quickly:

- **Agent 1 — Architecture context**: Read `CLAUDE.md` and any relevant `.claude/rules/` and `Claude/docs/` files. Summarize the conventions and constraints that apply to this feature.
- **Agent 2 — Codebase exploration**: Identify which parts of the codebase are most relevant to the feature idea. Read those files. Report relevant files, current patterns, and extension points.
- **Agent 3 — Existing plans**: Check the project's plans directory for existing plans that this feature overlaps with or depends on.

Wait for all agents to return, then synthesize their findings.

**For narrow features** (touching a single file or a small, obvious area), skip the parallel agents and read the relevant files directly — the overhead isn't worth it.

Present the synthesis to the user at the start of Phase 2 — it grounds the conversation and shows which areas need the most exploration.

## Phase 2 — Discovery Questions

Use `AskUserQuestion` to ask clarifying questions. The goal is to fully understand the feature before planning it. Use your Phase 1 findings to prioritize — a database-heavy feature needs more technical depth, a UX feature needs more functional detail. Draw from these dimensions as relevant:

### Functional

- What exactly should the user be able to do?
- What are the inputs and outputs?
- What are the edge cases and error states?
- What should happen when things go wrong?

### Philosophy & Goals

- What problem does this solve for the user?
- How does this fit into the broader vision for the app?
- Is this a core feature or a nice-to-have?
- Are there existing patterns in the app this should follow or intentionally break from?

### Technical

- Where in the architecture does this belong?
- What existing services, models, or components does it touch?
- Are there database changes needed?
- What are the performance implications?

### Future

- What future extensions should we design for now?
- What should we explicitly NOT build yet but keep the door open for?
- Are there related features that might follow?

**Important guidelines for this phase:**

- **Prefer clickable options over open-ended questions.** Use `AskUserQuestion` with 2–3 concrete options plus a "Let's discuss" escape hatch for when the user wants to explain something custom. Only use free-text questions when the answer is truly unpredictable (e.g., "Describe the user flow you have in mind").
- Ask 2–4 questions at a time, not all at once. Group related questions.
- After each round of answers, synthesize what you've learned and ask follow-up questions.
- Offer your own suggestions and opinions — don't just ask. Make one option your recommendation and explain why.
- If the user's idea conflicts with existing patterns or conventions, flag it constructively: "The codebase currently does X — should we follow that pattern or is this a good reason to diverge?"
- If you spot potential issues or edge cases the user hasn't mentioned, raise them.
- Continue until you have enough clarity to write a confident plan. Usually 2–3 rounds of questions.

## Phase 2.5 — Scope Check

Before writing the plan, evaluate whether the feature is a single cohesive unit or should be split:

**Split signals** — the feature likely needs multiple plans if:

- It touches 3+ unrelated areas of the codebase (e.g., new model + new page + new API + new service)
- It bundles distinct user-facing capabilities that could ship independently
- The task list would exceed ~8 tasks
- There's a natural "foundation" piece that other parts depend on (e.g., a new data model that enables both a UI and an API)
- Different parts have different risk profiles or could be deferred

**Keep together signals** — one plan is fine if:

- All tasks serve a single user story end-to-end
- Splitting would leave non-functional intermediate states
- The total scope is under ~8 tasks

If splitting is warranted, propose the breakdown to the user:

- Name each sub-feature and explain what it covers
- Identify the order (which plan should be implemented first)
- Note dependencies between plans
- Ask the user to confirm or adjust the split

Each sub-feature gets its own plan file. Proceed to Phase 3 for each.

## Phase 3 — Draft the Plan

Once discovery is complete, create a plan file in the project's plans directory. Read `plan-template.md` (in the implement skill directory) for the task format — tasks must follow that structure exactly so `/implement` can parse them.

Add these feature-specific sections around the tasks:

- **`## Context`** (before tasks) — what this feature does, why it matters, how it fits into the app.
- **`## Design Decisions`** (before tasks) — key decisions made during discovery. What was considered and why.
- **`## Future Considerations`** (after tasks) — things explicitly deferred. What to keep in mind for later.
- **`## Decisions & Review Items`** (after tasks) — empty, populated during implementation.

**Plan guidelines:**

- Tasks should be atomic and independently testable.
- Order tasks so each builds on the previous where possible.
- First task should be the smallest possible vertical slice — get something working end-to-end before expanding.
- Include database/model changes early since other tasks depend on them.
- Keep UI tasks focused — one component or page per task, not "build the whole UI."
- The last task should be polish and cleanup.
- If two tasks touch the same files, one should depend on the other — never put them in the same parallel group.
- Populate `**Dependencies:**` for any task that builds on a previous task's output. Populate `**Parallel group:**` in Phase 3.5 below.

## Phase 3.5 — Parallel Execution Analysis

After drafting tasks, analyze whether any could safely run in parallel during `/implement`. This is optional — skip it entirely if the plan has fewer than 4 tasks or all tasks are clearly sequential.

**Candidate identification:**

1. Find pairs of tasks that have **no dependency relationship** (neither depends on the other, directly or transitively).
2. Among those, check the `**Files:**` lists. Tasks with **disjoint file sets** are candidates. Tasks that share any files are not.
3. **Disqualify** tasks that touch shared infrastructure even if not listed in each other's Files — common disqualifiers include DI registration, navigation/layout components, shared CSS/config, and database migrations (ordering matters).

**Present to the user:**

Use `AskUserQuestion` to propose parallel groups. For each proposed group, show:

- Which tasks would run together
- Which files each task touches
- Why they're safe to parallelize (disjoint files, no shared state)

The user can approve, adjust (move tasks between groups), or decline (keep everything sequential). Only tag tasks the user explicitly approves.

**Tagging:**

- Approved parallel tasks get `**Parallel group:** A` (or `B`, `C`, etc.) — one letter per group
- All other tasks stay `**Parallel group:** —`
- Tasks within a group must have no dependency on each other

## Phase 4 — Present

Show the user:

- A brief summary of the feature as understood
- The plan file location(s)
- Number of tasks and rough scope
- Any open questions or risks flagged during discovery
- If split: the recommended implementation order

Ask if they want to adjust anything before considering the plan final.

---

## Customization Guide

When scaffolding this skill for a project, customize:

- **Feature board**: If the project uses a feature tracker file (e.g., `plans/FEATURES.md`), add a phase to update it after plan creation.
- **Plan directory**: Default looks in project root `plans/`. Adjust if different.
- **Plan template location**: Default references `plan-template.md` in the implement skill directory. Update if the project stores it elsewhere.
- **Parallel group disqualifiers** (Phase 3.5): The default disqualifiers (DI registration, navigation, shared CSS, migrations) are generic. Add project-specific shared infrastructure files that should prevent parallel grouping.
