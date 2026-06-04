---
name: plan-optimizer
description: Second-pass refinement of a plan — adds depth on data flow, perf realism, testability, and risk sequencing
---

# Plan Optimizer

A focused second pass over a plan. Goal: sharpen and de-risk by reconsidering the plan freshly — across data flow, caching contracts, perf realism, GPU/CPU fit, testability, and risk sequencing, but also the obvious-looking decisions the first pass may have skipped past.

Be constructive, but don't defer. The plan author works fast through a structured loop and frequently misses obvious things — questioning a choice that "looks fine" is welcome when there's a real reason. Skeptical teeth land hardest on unverified performance claims, but every lens is fair game. Substantial code is fine when each piece earns its keep (see `wf-overengineering-not-volume`); the target is hand-waved difficulty, not size.

## Step 1: Locate plan

Argument is a path or slug → resolve to `plans/<arg>.md` or the literal path. No argument → most recent file in `plans/` (last edit < 1h), else ask via `AskUserQuestion`. Abort if nothing resolves.

## Step 2: Build context

Read the plan, `CLAUDE.md`, project-specific `.claude/rules/`, and 2-3 of the files named in the plan's `**Files:**` lists to ground task realism. Global rules are already auto-loaded.

## Step 3: Refine across lenses

Walk each lens. Reconsider the obvious — the first pass often skipped past it. But don't manufacture critique; "looks fine" is a valid finding when nothing's actually wrong.

**Shape** — architecture, simplification, file splitting:

- Reinventing a pattern the codebase already has?
- Overengineered per `wf-overengineering-not-volume` (abstractions without a current consumer, speculative configurability)?
- Tasks touching > 5 files or that would blow the 400/800 line cap should be split — separately from any design critique.

**Data** — flow & caching:

- Redundant copies, transforms, or round-trips in the data path?
- Every cache names its invalidation rule. Without expiry, it's a future stale-data bug.

**Performance — reality check** (lean skeptical here):

- Unverified perf claim → mark `**Needs baseline.**` or add a profiling task before the optimization.
- GPU candidacy needs a workload-shape argument: parallel, low branching, predictable memory, batch large enough to dwarf transfer cost. Without that, CPU usually wins.

**Risk & feasibility** — scope, reversibility, sequencing:

- Schema or breaking API change? Migration order and rollback path should be named.
- Highest-risk task scheduled early enough to fail fast?

**Verifiability** — testability:

- Each task has a concrete `**Acceptance:**` — unit test, build pass, manual check, profile-measured? "It works" doesn't count.

## Step 4: Apply

Overwrite the plan file in place. Preserve title, context, and design decisions made in `/plan`. Revise task list, file lists, `**Acceptance:**` lines, risks, and perf claims where the lenses surfaced something. Log substantive changes in `## Decisions & Review Items` (e.g. "split task 3 — original lacked acceptance check").

If no lens surfaced anything actionable, leave the file untouched and say so.

## Step 5: Summarize

3-6 bullets: what changed and why. End with `Run \`git diff plans/<name>.md\`.` Skip the summary if nothing changed.

## Project rules

Project-specific plan critique criteria — performance baselines, known anti-patterns, testability conventions.

<ProjectSpecific>
</ProjectSpecific>
