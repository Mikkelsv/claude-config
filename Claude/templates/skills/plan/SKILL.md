---
name: plan
description: Plan out a new feature through collaborative discovery and create an implementation plan
---

# Feature Planning

Collaborative discovery → structured implementation plan.

## Input

> $ARGUMENTS

If empty, ask what to plan.

## Phase 1 — Understand

Read the input. Explore the codebase for context:

- **Broad features** (multiple areas): launch parallel agents — (1) read CLAUDE.md, rules, docs for conventions, (2) find relevant code files and patterns, (3) check plans directory for overlapping plans. Synthesize findings.
- **Narrow features** (single area): read relevant files directly.

Present the synthesis at the start of Phase 2.

## Phase 2 — Discovery

Use `AskUserQuestion` to clarify the feature. Prefer clickable options with 2-3 choices plus a "Let's discuss" escape hatch. Ask 2-4 questions per round, usually 2-3 rounds total.

Draw from these dimensions as needed: **Functional** (what, inputs/outputs, edge cases), **Philosophy** (problem being solved, fit with app vision), **Technical** (where in architecture, DB changes, perf), **Future** (design for now vs leave door open).

Guidelines:
- Offer your own suggestions — make one option your recommendation
- Flag conflicts with existing patterns constructively
- Raise edge cases the user hasn't mentioned

## Phase 2.5 — Scope Check

Evaluate if the feature should be split. **Split** if: 3+ unrelated areas, >8 tasks, distinct shippable capabilities, natural foundation piece. **Keep together** if: single user story end-to-end, <8 tasks, splitting leaves broken intermediate states.

If splitting: propose sub-features with names, order, and dependencies. Each gets its own plan file.

## Phase 3 — Draft

Create a plan file in the project's plans directory. Read `plan-template.md` from the implement skill directory for the task format.

Include sections: **Context** (before tasks), **Design Decisions** (before tasks), **Future Considerations** (after tasks), **Decisions & Review Items** (empty, for implementation).

Task guidelines:
- Atomic and independently testable
- First task = smallest vertical slice (end-to-end)
- DB/model changes early (others depend on them)
- One component/page per UI task
- Last task = polish and cleanup
- Populate `**Dependencies:**` and `**Parallel group:**` (Phase 3.5)

## Phase 3.5 — Parallel Analysis

Skip if <4 tasks or clearly sequential. Find task pairs with no dependency and disjoint `**Files:**` lists. Disqualify tasks sharing infrastructure (DI registration, shared CSS, migrations). Present proposed groups via `AskUserQuestion` — user approves, adjusts, or declines. Tag approved groups with letters (A, B, C); others get `—`.

## Phase 4 — Present

Show: feature summary, plan location, task count, open questions/risks. Ask if adjustments needed.

---

## Customization Guide

- **Plan directory**: Default `plans/`. Adjust per project.
- **Feature board**: Add a phase to update if project uses one (e.g., `plans/FEATURES.md`).
- **Plan template location**: Default references implement skill dir.
- **Parallel disqualifiers** (Phase 3.5): Add project-specific shared infrastructure beyond defaults.
