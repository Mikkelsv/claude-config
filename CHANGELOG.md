# Config Changelog

Only lists changes that require project action. Global rules, scripts, and global skills are picked up automatically and not tracked here.

## v1.1.15 — 2026-08-31 — Junction layout retired for real

`~/.claude/` is now genuinely the git repo. The junction to `~/claude-config/` is gone and the wrapper directory no longer exists. v1.1.0 claimed this in April but the migration had not actually been run; see the correction on that entry below.

The first attempt today stopped half-way — it removed the junction but its `Move-Item` failed, which orphaned 639 session transcripts and left global config inert for a few hours. `scripts/migrate-to-claude-root.ps1` was hardened to refuse to run while any `claude` process holds a handle, to self-relocate out of the folder being renamed, and to recover the runtime-only `~/.claude/` that Claude Code recreates in the gap. It then completed successfully and has been retired.

**Project action:**

- **None for projects.** This is a per-machine layout change.
- **Any other machine still on the `~/claude-config/` + junction layout:** the migration script was deleted after use. Recover it from git history at commit `80124c2` (`git show 80124c2:scripts/migrate-to-claude-root.ps1`) rather than writing a fresh one — that version carries the handle and resumability guards learned the hard way.

## v1.1.14 — 2026-07-14 — Skill-template descriptions + polish

Trigger-phrase descriptions and generic body polish propagated to five Tier 2 templates: `/refactor-code`, `/refactor-comments`, `/refactor-file-sizes`, `/refactor-tests`, `/test`. Each description now leads with "use when…" trigger phrases (the primary auto-trigger mechanism) and disambiguates confusable siblings. Body polish: `/refactor-code` gains an output-contract line; `/refactor-file-sizes` a "Decide this first" decomposition heading + rule-candidate rationale; `/refactor-tests` an apply-vs-defer intro; `/refactor-comments` an orchestrator-only note.

**Project action:**

- **Projects with any of these scaffolded**: re-sync via `/claude-sync` to pick up the sharper descriptions + polish. No behavior change — descriptions and framing only.
- **No project action needed** otherwise.

## v1.1.9 — 2026-06-03 — Template tightening: `/refactor-code` inline-apply, `/refactor-tests` concretized

Two existing templates updated to match the inline-apply + defer-judgment contract that landed in `/audit-branch` at v1.1.6:

- `/refactor-code` template — new Step 6 "Apply mechanical, defer judgment" + Step 7 report split between `## Applied inline` and the deferred set. Aligns with `/audit-branch` Phase 3 expectations. `{PROJECT_ARCHITECTURE_CHECKS}` placeholder removed; project-specific arch rules now layer in via the `## Project rules` `<ProjectSpecific>` block.
- `/refactor-tests` template — Steps 3–4 concretized (no longer placeholder-only). Step 4 categorizes tests by concern from the actual test source rather than relying on a hardcoded list. `{EXISTING_TEST_MAPPING}` placeholder removed; `{TEST_FRAMEWORK_FILES}` survives only inside the `## Project rules` `<ProjectSpecific>` block.

**Project action:**

- **Projects with `/refactor-code` scaffolded**: re-sync via `/claude-sync` to pick up the inline-apply contract. Behavior change — the skill now applies mechanical fixes in-tree instead of report-only.
- **Projects with `/refactor-tests` scaffolded**: re-sync via `/claude-sync` for tighter Step 3–4 content. Behavior is similar; the template is just less placeholder-shaped now.
- **No project action needed** if you haven't scaffolded these.

## v1.1.8 — 2026-06-03 — New `/refactor-comments` + `/refactor-file-sizes` templates

Two new Tier 2 templates available via `/claude-sync`:

- `/refactor-comments` — orchestrates parallel Sonnet sweep against the `arch-docs-over-inline` rubric (rule now global as of v1.1.5). Partitions, protection-list categories, and project-specific protected-comment notes layer in via placeholders + `<ProjectSpecific>` blocks.
- `/refactor-file-sizes` — companion to the new global `/audit-file-sizes` (v1.1.7). Resolves `check-file-sizes.ps1` project-first, fans out per-batch Sonnet sub-agents with language-specific split playbooks. Customize via `{LANGUAGE_PLAYBOOKS}` and `{FACADE_GOTCHAS}` `<ProjectSpecific>` blocks.

**Project action:**

- **Projects that already have these skills locally** (e.g. forked-global copies): no automatic propagation. To pull the template version side-by-side or to scaffold afresh, run `/claude-sync` and accept the new template offers.
- **Projects without these skills**: run `/claude-sync` to scaffold either or both. Fill in placeholders (`{PARTITIONS}`, `{PROTECTION_LIST_NOTES}`, `{LANGUAGE_PLAYBOOKS}`, `{FACADE_GOTCHAS}`) for your project.
- **No project action needed** if you don't use these workflows.

## v1.1.6 — 2026-06-02 — `/audit-branch` inline-apply contract

Sub-skills invoked by `/audit-branch` now apply mechanical findings (comment hygiene, stale references, typos, unused imports, trivial dead code) inline during their pass instead of being report-only. Each agent returns a structured note with `## Applied inline` (what landed in-tree) and `## Deferred` (judgment findings for orchestrator-side disposition). Phase 5 prompt operates on the deferred set only. New Phase 6 Build Verify runs after fixes land (invokes `/build`; no-op in no-build repos via graceful-skip).

**Project action:**

- **Projects with mirrored `audit-branch`** (forked-global, per `meta-project-local-skill-copies.md`): re-sync via `/claude-sync` to absorb the inline-apply contract. Behavior change — sub-agents edit the tree directly instead of only reporting.
- **Projects without mirrored copies**: nothing to do; the global skill updates automatically.
- **`audit-architecture` and `plan` skills** got new `## Project rules` anchor headings. Projects that want to layer project-specific arch/planning rules can add a `<ProjectSpecific>` block under either heading; `/claude-sync` preserves it across template updates.
- **`rebase-on-main`** now invokes `pwsh -NoProfile` instead of `powershell.exe`. Windows users with PowerShell 7 see no change; macOS/Linux machines with PowerShell 7 now work natively.

## v1.1.3 — 2026-05-19 — `/claude-sync` handles forked-global skills

`/claude-sync` now discovers and syncs project-local copies of generic global skills (per `meta-project-local-skill-copies.md`). Templates and forks live side-by-side in `.claude/skills/`; both are tracked in `.claude/local/config-version.json` (templates under `skills`, forks under `forks`). Initial Setup gained a "shared repo?" prompt that scaffolds forks; Sync gained drift detection for existing forks.

**Project action:**

- **Projects with existing forks** (shared repos with checked-in `/implement`, `/plan`, etc. copies): run `/claude-sync` once. Existing forks register as **New** on the first post-v1.1.3 run — accept them to start auto-syncing. Subsequent runs drift-detect and update normally.
- **Shared projects without forks yet**: during Initial Setup (`/claude-sync fresh`), answer "Yes" to the new shared-repo prompt and multiSelect which generic globals to fork.
- **Solo projects without forks**: no change. `/claude-sync` behaves identically to pre-1.1.3.

## v1.1.1 — 2026-04-24 — `<ProjectSpecific>` tag + broadened version trigger

`/claude-sync` and the new `scripts/mirror-skill.ps1` now look for `<ProjectSpecific>...</ProjectSpecific>` blocks (cleaner than the old comment-style markers). The version trigger in `sync-config.ps1` now bumps on changes to `rules/`, `skills/`, and `commands/` (in addition to `templates/`) — projects with mirrored/duplicated globals will see more version-mismatch signals.

**Project action:**

- **Migrate `<!-- PROJECT-SPECIFIC: ... --> ... <!-- /PROJECT-SPECIFIC -->` blocks** in any project SKILL.md to `<ProjectSpecific>...</ProjectSpecific>`. Old comment-style blocks won't be recognized — `/claude-sync` will treat them as drift. Find them with: `grep -r "PROJECT-SPECIFIC" .claude/`.
- **New helper for non-template duplicates:** `scripts/mirror-skill.ps1 -Name <skill>` mirrors a global skill into a project, preserving `<ProjectSpecific>` blocks. Drift-detects and refuses to overwrite unmarked changes unless `-Force` is passed.

## v1.1.0 — 2026-04-23 — Structure flatten

The two-directory `Claude/` + `dotclaude/` split is gone. Everything lives flat at the repo root.

> **Correction (2026-08-31):** this entry also claimed the repo was `~/.claude/` directly with no wrapper and no junction. That was the intended end state, not the shipped one — the junction survived until v1.1.15, four months later.

**Project action:**

- **Existing machines on the old layout:** see v1.1.15. The migration landed on 2026-08-31 and the script has since been retired.
- **Fresh machines:** new `setup.ps1` clones directly into `~/.claude/` — no junction step.
- **Per-project scaffolded skills (`refactor-code`, `refactor-tests`, `build`, `test`):** templates moved from `Claude/templates/skills/` to `templates/skills/`. Run `/claude-sync` in each project to refresh scaffolded copies.
- **Per-project local config (Tier 3):** convention moved from `<project>/Claude/local/` to `<project>/.claude/local/`. If you have a local config (e.g. `<project>/Claude/local/skills/build/config.md`), move it to `<project>/.claude/local/skills/build/config.md` and update the project's `.gitignore`.

## v1.0.8 — 2026-04-13

- Removed teammate-copy templates (plan, implement, refactor, refactor-docs, audit) — global skills now read project context directly. Projects that previously scaffolded any of these via `/claude-sync` should delete their `Claude/skills/<name>/` and `.claude/skills/<name>/` files for those skills and use the global versions instead.

## v1.0.7 — 2026-04-13

- Plan template updated: run `/claude-sync` to pull the new Phase 1.5 (external research) into project-scaffolded `/plan` copies

## v1.0.6 — 2026-04-13

- Templates updated (audit, implement, plan): run `/claude-sync` to pull the new strict/skeptical personas, refactor gate, and managing-plan-template into project-scaffolded copies
- New `managing-plan-template.md` added to the implement template — `/claude-sync` will scaffold it for projects with the implement teammate copy

## v1.0.1 — 2026-03-30

- Run `/claude-sync` to scaffold `Claude/local/skills/build/config.md` (new local build reference)
- Add `Claude/local/` to `.gitignore`
- Scaffold `/plan` skill (new project skill)

## v1.0.0 — 2026-03-30

Initial versioned config. Run `/claude-sync` to scaffold all project skills.
