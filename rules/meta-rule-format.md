# Rule Format

Rules live in `~/.claude/rules/` (global) or `<project>/.claude/rules/` (project). Both auto-load.

## Format

- Title (sentence case, matches filename slug).
- One imperative directive at top. For voicing see `wf-three-tier-boundaries`.
- Optional `## Why` (1–2 sentences on the failure mode — only if non-obvious).
- Optional `## How` (concise application guidance — only if non-obvious).
- Optional `## Exceptions` (legitimate carve-outs, named).

Keep them tight — see `wf-tight-claude-config`.

## Prefix by category

- `arch-` — module boundaries, dependencies, file organization, architectural invariants.
- `cq-` — code-quality idioms (naming, error handling, control flow, framework usage).
- `wf-` — how Claude behaves (when to ask, output format, judgment).
- `meta-` — config, file placement, tooling, rule-authoring itself.

## Capture flow

Use `/rule-candidate` to stage a candidate; `/rule-review` promotes and triages. See `wf-surface-rule-candidates`. Don't write directly to the rules folder.
