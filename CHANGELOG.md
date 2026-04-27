# Config Changelog

Only lists changes that require project action. Global rules, scripts, and global skills are picked up automatically and not tracked here.

## v1.1.1 — 2026-04-24 — `<ProjectSpecific>` tag + broadened version trigger

`/claude-sync` and the new `scripts/mirror-skill.ps1` now look for `<ProjectSpecific>...</ProjectSpecific>` blocks (cleaner than the old comment-style markers). The version trigger in `sync-config.ps1` now bumps on changes to `rules/`, `skills/`, and `commands/` (in addition to `templates/`) — projects with mirrored/duplicated globals will see more version-mismatch signals.

**Project action:**

- **Migrate `<!-- PROJECT-SPECIFIC: ... --> ... <!-- /PROJECT-SPECIFIC -->` blocks** in any project SKILL.md to `<ProjectSpecific>...</ProjectSpecific>`. Old comment-style blocks won't be recognized — `/claude-sync` will treat them as drift. Find them with: `grep -r "PROJECT-SPECIFIC" .claude/`.
- **New helper for non-template duplicates:** `scripts/mirror-skill.ps1 -Name <skill>` mirrors a global skill into a project, preserving `<ProjectSpecific>` blocks. Drift-detects and refuses to overwrite unmarked changes unless `-Force` is passed.

## v1.1.0 — 2026-04-23 — Structure flatten

The two-directory `Claude/` + `dotclaude/` split is gone. Everything lives flat at the repo root, and the repo is `~/.claude/` directly (no more `~/claude-config/` wrapper, no junction).

**Project action:**

- **Existing machines on the old layout:** run `$env:USERPROFILE\claude-config\scripts\migrate-to-claude-root.ps1` from plain PowerShell (outside a Claude Code session) once you've pulled this commit. The script renames `~/claude-config/` to `~/.claude/` and deletes the junction. Close all Claude Code sessions before running.
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
