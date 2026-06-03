---
name: refactor-comments
description: Sweep code comments against the arch-docs-over-inline rubric. Mechanical inline edits via parallel Sonnet agents in non-overlapping file partitions; build-verifies after. Supports --dry-run for review-only mode.
disable-model-invocation: true
---

# Refactor Comments

Sweep source files for verbose, stale, or low-density comments per `arch-docs-over-inline` (rubric) and `cq-comments-track-code` (protection list). Both rules are auto-loaded globally; this skill orchestrates the sweep. Agents edit comments only; build verifies after. The skill does not commit — review the diff first, then `/commit`.

## Mode

- **`/refactor-comments`** (no args) — whole-codebase sweep. 4 Sonnet agents in parallel, two rounds.
- **`/refactor-comments <path>`** — scoped sweep (single directory or area). 1–2 Sonnet agents, one or two rounds based on scope size.
- **`/refactor-comments --dry-run`** — report-only mode. Same partition + agents, but agents return structured findings instead of editing. Use for the inaugural run before trusting full inline-edit; switch to default mode once you trust the output.

## Partitions (non-overlapping; no two agents touch the same file)

For whole-codebase sweep:

{PARTITIONS}

Excluded everywhere: `bin/`, `obj/`, generated CSS / build output, and files whose first 10 lines contain `SIZE-EXEMPT:` (intentionally large; defer comment hygiene to their own audit).

## Steps

1. **Determine scope + partition.** Path mode narrows to that path; no-args uses the partition table above. For `--dry-run`, partition strategy is identical.
2. **Spawn Sonnet agents in parallel** (one per partition), `model: "sonnet"` per `wf-agents-on-sonnet`. Each agent's prompt must include:
   - **Rubric** — read `arch-docs-over-inline` (auto-loaded globally; also in `.claude/rules/` if project has an overlay) for the 5 practices (link don't inline, why-only, name identifiers as greppable anchors, invariants as checkable claims, no history prose).
   - **Protection list** — read `cq-comments-track-code` (auto-loaded). Load-bearing comments must NOT be cut. Project-specific protected categories:

     <ProjectSpecific>
     {PROTECTION_LIST_NOTES}
     </ProjectSpecific>

   - **Action only when unambiguous.** **CUT**: WHAT-narration, signature paraphrase, migration history ("Phase 3 introduced…", "Stage N retires…"), typos in comments, PR/task/issue references. **SLIM**: load-bearing line buried in restatement (keep the why, cut the rest). **KEEP**: protection list + invariants + cross-file links + workarounds-with-condition.
   - **Stay strictly in your partition** — don't read or edit files outside it.
   - **Comments only** — never edit code. If a "comment" looks like commented-out logic, leave it.
   - **Return a one-paragraph summary**: "Cut N comments, slimmed M, kept K; flagged X borderline (with brief `file:line` list)."
   - For `--dry-run`: return structured `file:line | verdict (CUT/SLIM/KEEP) | proposed | rationale` instead of editing.
3. **(Default) Round 2** — re-spawn the same agents on the same partitions. Same prompt; LLM non-determinism alone surfaces additional candidates, and Round 2 sees the cleaned state from Round 1. Skip on `--dry-run`.
4. **Build verify** — invoke `/build`. A break signals an agent slipped from comments into code; report it and stop before commit. `/build` no-ops gracefully in no-build repos.
5. **Report** — collate agent summaries + total counts across rounds. Diff is the review surface.

## Notes

- Path scope is your lever for risk control — start narrow (one partition or directory) on first runs, expand once confidence is established. `--dry-run` on a single partition is the safest first-time validation.
- If agents repeatedly cut something you wanted kept, the right fix is to add a `cq-comments-track-code` clause naming the pattern (project overlay or global rule update), not to fight it per-file.
- Called by `/refactor-code` post-step (optional integration): scope = files in the refactor's diff; 1 agent, 1 round; same rubric.

---

## Customization Guide

Replace these placeholders at scaffold time:

- `{PARTITIONS}` — a numbered list of 2–6 non-overlapping file-glob partitions covering the project. Two agents must never touch the same file, so partitions don't overlap. Aim for roughly balanced size.
- `{PROTECTION_LIST_NOTES}` — project-specific protected-comment categories (e.g. doc claims about specific rendering props that must match the code body, command/handler behavior notes that must stay in sync with a particular doc, framework-specific load-bearing patterns).

The `<ProjectSpecific>` block under "Protection list" is preserved by `/claude-sync` re-syncs; layer additional project notes there without losing them on update.
