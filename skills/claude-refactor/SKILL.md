---
name: claude-refactor
description: Audit and improve Claude skills, commands, scripts, and configuration
---

# Claude Config Audit

Audit skills, commands, scripts, rules, and templates. Fix bugs, stale refs, permission gaps, and misplacements.

Scripts: `~/.claude/scripts`

## Phase 1 — Inventory

Launch 2 parallel agents:

**Agent 1 — Global**: read all `~/.claude/skills/`, `~/.claude/commands/`, `~/.claude/scripts/`, `~/.claude/rules/`, `~/.claude/templates/skills/`, README.md, settings.json, settings.template.json, CLAUDE.md. Record: path, purpose, references.

**Agent 2 — Project** (skip if not in a project): read `.claude/skills/`, `.claude/commands/`, `.claude/rules/`, `.claude/docs/`, CLAUDE.md. Record same, plus which global template each was scaffolded from.

## Phase 2 — Review

Launch 3 background agents with the inventory:

**Agent A — Content Quality**:
- **Correctness**: logic flow, script param mismatches, stale references, JSON output mismatches.
- **Script extraction**: multi-line bash blocks that should be scripts (especially if repeated). Not single-liners.
- **Token efficiency**: rules in `rules/` and CLAUDE.md are loaded into every conversation — flag verbose prose, redundant tables, repeated explanations, and content duplicated across files. Skills/commands are loaded on invocation — flag the same in heavy ones (>100 lines). Lead with the imperative, drop the "why" once it's been established. Aim: every line earns its tokens.

**Agent B — Structure & Permissions**:
- **Permissions**: walk skills/commands, find Bash/Write/Edit calls not covered by settings.json globs. Draft safe patterns. Update template if portable.
- **Placement**: global skills with project-specific assumptions? Project skills that are generic? Commands that should be skills or vice versa?
- **Parallelization**: independent read-only phases that could be parallel agents? Write-independent phases safe for worktrees?

**Agent C — Sync & Docs**:
- **Template sync**: compare project skills to templates. Generic improvements → propagate back. Template updates → pull in. Project-specific divergence → expected.
- **README accuracy**: `~/.claude/README.md`. All items listed? Descriptions accurate? Directory layout correct? Script catalog complete?

## Phase 3 — Fix

**Auto-fix** (apply directly): stale references, script param mismatches, JSON format mismatches, safe permission patterns, README corrections.

**Ask user** (via `AskUserQuestion`): placement changes, script extraction, template sync propagation, parallelization restructuring. Apply confirmed changes immediately.

## Phase 4 — Documentation

Update `~/.claude/README.md` to reflect all Phase 3 changes. Update Global Rules section if rules changed. Note `settings.template.json` changes for cross-machine sync.

## Phase 5 — Summary

| Category | High | Medium | Low |
|---|---|---|---|
| Correctness | N | N | N |
| Script opportunities | N | N | N |
| Permission gaps | N | N | N |
| Placement | N | N | N |
| Parallelization | N | N | N |
| Template drift | N | N | N |
| README accuracy | N | N | N |

List changes made, deferred items, and settings template updates. Ask: **Push now** / **Review first** / **Done**.
