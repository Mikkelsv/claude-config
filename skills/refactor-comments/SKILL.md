---
name: refactor-comments
description: "Sweep code comments against the arch-docs-over-inline rubric — mechanical inline edits via parallel Sonnet agents in non-overlapping file partitions, build-verified after; supports --dry-run for review-only. Use whenever the user wants comment cleanup or hygiene, says comments are stale/noisy/redundant, or as part of a branch audit."
disable-model-invocation: true
---

# Refactor Comments

Sweep source files for verbose, stale, or low-density comments per `arch-docs-over-inline` (rubric) and `cq-comments-track-code` (protection list). Both rules auto-load; this skill orchestrates the sweep. Agents edit comments only; build verifies after. The skill does not commit — review the diff first, then `/commit`.

**Orchestrator-only** — it must spawn the partition sub-agents, never run the sweep inline; `disable-model-invocation` reflects that.

## Mode

- **`/refactor-comments`** (no args) — whole-codebase sweep. 4 Sonnet agents in parallel, two rounds.
- **`/refactor-comments <path>`** — scoped sweep. 1–2 Sonnet agents, one or two rounds based on scope size.
- **`/refactor-comments --dry-run`** — report-only. Same partitions and agents, but agents return structured findings instead of editing. Use for the inaugural run; switch to default once you trust the output.

## Partitions (non-overlapping; no two agents touch the same file)

Derive them at runtime: glob the project's top-level source directories and group them into 2–6 roughly balanced partitions. **They must not overlap** — two agents editing one file will clobber each other. If `.claude/skill-config/refactor-comments.md` names a partition table, use it instead of deriving; a curated split usually balances better than a mechanical one.

Excluded everywhere: `bin/`, `obj/`, `node_modules/`, generated CSS and build output, and files whose first 10 lines contain `SIZE-EXEMPT:` (intentionally large; defer comment hygiene to their own audit).

## Steps

1. **Determine scope + partition.** Path mode narrows to that path; no-args uses the partitions above. For `--dry-run`, partition strategy is identical.
2. **Spawn Sonnet agents in parallel** (one per partition), `model: "sonnet"` per `wf-agents-on-sonnet`. Each agent's prompt must include:
   - **Rubric** — read `arch-docs-over-inline` for the 5 practices (link don't inline, why-only, name identifiers as greppable anchors, invariants as checkable claims, no history prose).
   - **Protection list** — read `cq-comments-track-code`, plus any project overlay in the project's own `.claude/rules/`. Load-bearing comments must NOT be cut. Sub-agents don't auto-load project rules, so name the rule paths explicitly in the prompt.
   - **Action only when unambiguous.** **CUT**: WHAT-narration, signature paraphrase, migration history ("Phase 3 introduced…", "Stage N retires…"), typos in comments, PR/task/issue references. **SLIM**: load-bearing line buried in restatement (keep the why, cut the rest). **KEEP**: protection list + invariants + cross-file links + workarounds-with-condition.
   - **Stay strictly in your partition** — don't read or edit files outside it.
   - **Comments only** — never edit code. If a "comment" looks like commented-out logic, leave it.
   - **Return a one-paragraph summary**: "Cut N comments, slimmed M, kept K; flagged X borderline (with brief `file:line` list)."
   - For `--dry-run`: return structured `file:line | verdict (CUT/SLIM/KEEP) | proposed | rationale` instead of editing.
3. **(Default) Round 2** — re-spawn the same agents on the same partitions. Same prompt; LLM non-determinism alone surfaces more candidates, and Round 2 sees Round 1's cleaned state. Skip on `--dry-run`.
4. **Build verify** — invoke `/build`. A break signals an agent slipped from comments into code; report it and stop before commit. `/build` no-ops gracefully in no-build repos.
5. **Report** — collate agent summaries + totals across rounds. Per `wf-check-the-artifact-not-the-self-report`, read the diff before trusting those summaries: confirm the touched-file set stayed inside each partition and that no code changed.

## A stale doc citation needs diagnosis before you "fix" it

A comment citing a `plans/*.md` or `docs/*.md` path that no longer exists has two possible causes that a grep cannot distinguish, and they need **opposite** treatment. Run `git log --oneline -- <deleted-path>` and read the deletion commit's diff:

- Content moved **into another named document** in the same commit → **merge-deletion**. Citations elsewhere are genuinely stale; repoint each to the new home.
- The deletion **stands alone**, often paired with a note like "implemented — phase plan removed, see git history" → **completion-deletion**. Leave every citation alone. It is a deliberate, git-recoverable pointer, and "fixing" it severs that.

Both occur on the same branch, so this is not a rare edge: one audited branch had 6 citations needing repointing from a merge-deletion alongside 25+ correctly left untouched from a completion-deletion.

## Notes

- Path scope is your lever for risk control — start narrow, expand once confidence is established. `--dry-run` on a single partition is the safest first validation.
- If agents repeatedly cut something you wanted kept, add a `cq-comments-track-code` clause naming the pattern rather than fighting it per-file.
- Called by `/refactor-code` as an optional post-step: scope = files in the refactor's diff; 1 agent, 1 round, same rubric.
