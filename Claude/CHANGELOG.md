# Config Changelog

Only lists changes that require project action. Global rules, scripts, and global skills are picked up automatically and not tracked here.

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
