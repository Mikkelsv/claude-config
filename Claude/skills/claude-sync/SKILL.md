---
name: claude-sync
description: Pull global config and scaffold or sync project-level skills from templates
---

# Claude Sync

Pull global config, then scaffold new project skills or sync existing ones.

Input: `$ARGUMENTS` (optional — `fresh` to force re-scaffold, or skill names to scope)

Templates: `~/claude-config/Claude/templates/skills/`

## Project Skills (from templates)

| Skill | Notes |
|---|---|
| **build** | Global skill — scaffolds `Claude/local/skills/build/config.md` only |
| **test** | Browser-based smoke tests + optional perf tracking |
| **refactor-code** | Code quality & architecture review |
| **refactor-tests** | Test coverage review |

## Optional Teammate Copies (global skills scaffolded for teammates)

plan, implement, refactor, refactor-docs, audit-architecture

---

## Step 0 — Pull

Run: `powershell.exe -NoProfile -File "$HOME/claude-config/Claude/scripts/pull-config.ps1"`

If pull fails: ask user — continue with local templates or abort?

## Step 1 — Detect Mode

`Claude/local/config-version.json` exists? → **Sync** (Step 3). Missing → **Initial Setup** (Step 2).
`$ARGUMENTS = "fresh"` → force Initial Setup. Skill names → scope to those skills in detected mode.

## Step 2 — Initial Setup

### 2.1 Check existing skills in `.claude/skills/`. If overlap, ask: overwrite or skip?

### 2.2 Select skills via `AskUserQuestion` (multiSelect):
- Project skills: build (Recommended), test, refactor-code, refactor-tests
- Teammate copies: plan, implement, refactor, refactor-docs, audit-architecture

Store teammate choice in `Claude/local/skills/sync-config.md`.

### 2.3 Gather project info

Read CLAUDE.md for context. Ask per-skill info via `AskUserQuestion`:

- **build**: build command, dev server (command, port, URL), kill method
- **test**: preview server name, test script (JS for `preview_eval`), perf tracking (yes/no + baseline path), testing conventions
- **refactor-code**: architecture principles (derive from CLAUDE.md if possible)
- **refactor-tests**: test framework files, test mapping
- **audit-architecture**: boundary rules (from CLAUDE.md) — scaffold-time only, baked into the template
- **plan**: no config — plans live in `plans/` by convention
- **implement**: no config — `/commit` handles commit format

### 2.4 Store values in `Claude/local/skills/{name}/config.md` (markdown with clear headings).

### 2.5 Generate skills

For each selected skill:
1. Read template, compute SHA256 hash (first 8 hex)
2. Generate customized version (replace `{PLACEHOLDER}` markers)
3. Write full implementation to `Claude/skills/{name}/SKILL.md`
4. Write thin shell to `.claude/skills/{name}/SKILL.md` (frontmatter + redirect). Include `$ARGUMENTS` for skills that accept args.
5. Copy supporting files from template

**build exception**: scaffolds only `Claude/local/skills/build/config.md` — no project skill files (global skill reads config at runtime).

**test**: also generate `Claude/skills/test/scripts/smoke-test.js`.

Replace `${CLAUDE_SKILL_DIR}` refs with `Claude/skills/{name}/` in generated files.

### 2.6 Create `.claude/launch.json` if test selected + preview server configured and file doesn't exist.

### 2.7 Stamp `Claude/local/config-version.json` with global version, date, and skill template hashes.

### 2.8 Report: list created files. Remind about `Claude/local/` in .gitignore, editing in `Claude/skills/`, and CLAUDE.md for architecture docs.

---

## Step 3 — Sync

### 3.1 Compare versions. If match and no specific skills requested → "All current." Done. If differ → read CHANGELOG, summarize project-action entries.

### 3.2 Per-skill: compute current template hash, compare to stored. Categorize: **Changed**, **Current**, or **New** (template exists but not in project).

### 3.3 Ask via `AskUserQuestion` (multiSelect, pre-select Changed+New).

### 3.4 Apply updates:
- **Changed**: read config file for stored values, re-generate from new template. Ask for new placeholders.
- **New**: check existing configs for reusable values, ask for the rest, scaffold normally.

### 3.5 Update version stamp.

### 3.6 Report: updated, added, skipped, current skills. New version number.

---

## Edge Cases

- **No skills map in version file**: scan for installed skills, treat all as unknown hash, offer re-sync.
- **New placeholder in template**: detect, ask user, update config.
- **Manual edits**: re-generation overwrites. User can skip individual skills.
- **Pull fails**: offer to continue with local templates.
