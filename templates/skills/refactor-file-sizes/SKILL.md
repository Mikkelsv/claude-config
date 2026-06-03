---
name: refactor-file-sizes
description: Audit + execute file-size refactors. Identifies violators and their coupling, dispatches Sonnet sub-agents per batch (rules in each agent's prompt for drift protection), build-verifies, and proposes candidate rules from observed gotchas. Companion to /audit-file-sizes.
disable-model-invocation: true
---

# Refactor File Sizes

Sweep the codebase for files over the project's 800-line hard cap and split them. The audit phase identifies violators + cross-file coupling. The execute phase fans out parallel Sonnet sub-agents — each batch is one sub-agent with the language-specific rule in its prompt — so per-agent context stays fresh and drift is bounded. The skill does not commit; review the diff first, then `/commit`.

## Mode

- **`/refactor-file-sizes`** (no args) — whole-tree sweep.
- **`/refactor-file-sizes <path>`** — scope to a directory.

## Phase 1 — Audit

1. **Resolve `check-file-sizes.ps1`.** Prefer project-local (`.claude/scripts/check-file-sizes.ps1`) if present, else fall back to global (`~/.claude/scripts/check-file-sizes.ps1`). Per `meta-project-local-skill-copies`, project copies are deliberate forks that may carry a customized extension list.
2. Run the script (mode A: changed files; mode C: full tree per scope above). Parse the JSON.
3. **Drop** `justified` entries (SIZE-EXEMPT) and `soft` entries — only hard-cap violators (>800 lines) are in scope.
4. **Coupling detection.** For each pair of violators, `Grep` the basename (no extension) of one in the other's file content. If matched, mark them coupled. Coupled violators group into a single batch; standalone violators are their own batch.
5. Report: `N violators in M batches` (e.g., "10 violators in 8 batches; 2 coupled pairs").

## Phase 2 — Scope decision

If `M > 8`, ask the user via `AskUserQuestion`: "Found M batches. How many to address now?" with options like "All", "Top 5 by size", "Top 3", "Let's discuss." Otherwise proceed with all batches.

## Decomposition strategy — choose per batch

Before splitting, pick *how* to split by looking at the file's **entrypoints** (who imports/references it). This determines the shape of the result, so decide it up front.

- **Default: true split (redistribute references).** Break the file into sub-modules and update each consumer to import the specific sub-module it needs. No aggregator left behind. Cleaner dependency graph, no cross-module wiring glue. **Prefer this.**
- **Facade/barrel only when fan-in is high.** If many consumers reach the file through one stable surface and rewriting all those imports is large churn, keep the original path as a thin re-export/orchestrator over the new sub-files so consumer imports stay put.
- **Determiner:** few consumers, or consumers referencing disjoint subsets → true split. Many consumers through one broad surface → facade. When torn, lean true split — the facade's wiring is a bug surface (below).

### Facade wiring is a bug surface

If a facade splits a module whose pieces call *each other*, every internal cross-sub-module reference needs an explicit injector wired in the orchestrator after load — not a direct import. A dropped injection compiles and boots fine, then throws only when the stitched path first runs. After any facade split, grep the moved function's call sites for cross-module refs, confirm each has an injector + orchestrator wiring, and **exercise each stitched runtime path — not just app boot.**

<ProjectSpecific>
{FACADE_GOTCHAS}
</ProjectSpecific>

## Phase 3 — Parallel sub-agent fan-out

For each batch in parallel:

1. **Determine languages** from file extensions in the batch. Map to playbook rules:

   <ProjectSpecific>
   {LANGUAGE_PLAYBOOKS}
   </ProjectSpecific>

2. **Spawn Sonnet agent** (`model: "sonnet"` per `wf-agents-on-sonnet`) with a prompt that:
   - Lists the batch files + line counts + coupling notes.
   - Names the language playbook rule(s) to read **first** before any edits — sub-agent sessions don't auto-load project rules.
   - States the **Decomposition strategy**: default to true split (redistribute imports so consumers reference sub-modules directly); use a facade only for high fan-in through one surface. If the batch produces a facade with cross-sub-module calls, wire injectors explicitly in the orchestrator and report which runtime paths must be exercised to verify (not just boot).
   - States project conventions (build-file ordering, public surface preservation, etc.) — do not modify files outside this batch unless a consumer breaks (then list it in the report).
   - **DO NOT run the build** — parallel agents would fight build outputs. Defer to skill's Phase 4.
   - **DO NOT commit.** Leave changes unstaged.
   - Return: file list with new line counts, grouping rationale (1 sentence per new file), any consumer files touched + why, any *new* gotchas hit that weren't already in the rule.

## Phase 4 — Consolidated build verify

Invoke `/build` once all sub-agents finish. If errors, list them by file; don't auto-retry — surface to the user for decision (per design: failure recovery is the orchestrator's job, not the skill's). `/build` no-ops gracefully in no-build repos.

## Phase 5 — Rule capture

Collect "new gotchas" reported by sub-agents. For each distinct pattern observed twice or more across this run (or once on a high-confidence call), draft a candidate rule via the **content** suitable for `/rule-candidate`. Don't auto-invoke `/rule-candidate` — surface the proposals in the final report so the user triages.

## Phase 6 — Report

```text
Refactor File Sizes — N batches processed

Splits:
  - <batch summary, 1 line each>

Build: <PASS / FAIL — N errors>

Candidate rule proposals (from this run's observations):
  - <slug> — <one-line directive>

Next: /commit to land, or revert via `git checkout .` if anything looks off.
```

## Notes

- The audit step's "coupling-by-basename-grep" is loud + cheap. False positives (comment mentions, doc references) are fine — over-grouping is harmless; under-grouping risks broken consumers.
- SIZE-EXEMPT files are skipped entirely; the script handles this. To exempt a file, add `// SIZE-EXEMPT: <reason>` in its first 10 lines.
- Path-scoped project rules load in the main session when matching files are read, but **not** in sub-agent sessions — so the agent prompt must name the rule path explicitly.
- Drift protection comes from each sub-agent starting with a fresh context plus the rule in its prompt. The skill itself doesn't need to "restate rules between iterations" — the parallel-with-rules-in-prompt pattern handles it.

---

## Customization Guide

Replace these placeholders at scaffold time:

- `{LANGUAGE_PLAYBOOKS}` — bullet list mapping file extensions to project-specific split-pattern rules (e.g. `.fs / .fsi / .fsx → .claude/rules/cq-fsharp-cross-file-split.md`). Only include languages your project actually uses.
- `{FACADE_GOTCHAS}` — project-specific facade/barrel-wiring war stories (concrete example of a dropped injector or cross-sub-module ref that bit you). Helps the next sub-agent recognize the pattern before reproducing the bug.

Both `<ProjectSpecific>` blocks are preserved by `/claude-sync` re-syncs; layer additional notes there without losing them on update.
