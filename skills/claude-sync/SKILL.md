---
name: claude-sync
description: Pull global config and scaffold or sync project-level skills from templates
---

# Claude Sync

Pull global config, then scaffold new project skills or sync existing ones.

Input: `$ARGUMENTS` (optional — `fresh` to force re-scaffold, or skill names to scope)

Templates: `~/.claude/templates/skills/`

## Project Skills (from templates)

Only skills with genuine project-specific content are scaffolded. Generic global skills (`/plan`, `/implement`, `/refactor`, `/refactor-docs`, `/audit-architecture`) read project context from `CLAUDE.md` and `.claude/rules/` at runtime — no scaffolding needed.

| Skill | Notes |
|---|---|
| **build** | Global skill — scaffolds `.claude/local/skills/build/config.md` only |
| **test** | Browser-based smoke tests + optional perf tracking |
| **refactor-code** | Code quality & architecture review |
| **refactor-tests** | Test coverage review |

---

## Step 0 — Pull

Run: `powershell.exe -NoProfile -File "$HOME/.claude/scripts/pull-config.ps1"`

If pull fails: ask user — continue with local templates or abort?

## Step 1 — Detect Mode

`.claude/local/config-version.json` exists? → **Sync** (Step 3). Missing → **Initial Setup** (Step 2).
`$ARGUMENTS = "fresh"` → force Initial Setup. Skill names → scope to those skills in detected mode.

## Step 2 — Initial Setup

### 2.1 Check existing skills in `.claude/skills/`. If overlap, ask: overwrite or skip?

### 2.2 Git workflow

If `.claude/rules/git-workflow.md` already exists, skip this step.

Ask via `AskUserQuestion`: which workflow does this project use?

- **Feature branches (Recommended)** — `/implement` creates `implement/{plan-name}` branch per plan, `/commit` pushes to that branch. PR-based merge to main.
- **Direct to main** — Solo project or prototype. `/implement` works on main directly, `/commit` pushes straight to main. No PR step.
- **Worktree per feature** — Like feature branches, but each plan gets its own worktree for parallel dev.

Write the choice to `.claude/rules/git-workflow.md` using one of the templates below. Other skills (especially `/implement`, `/commit`, `/rebase-on-main`) read this rule to behave correctly.

#### Template — Feature branches

```markdown
# Git Workflow: Feature Branches

This project uses feature branches with PR-based merging to main.

## How to apply

- `/implement` creates a new branch `implement/{plan-name}` before starting work.
- `/commit` pushes to the current feature branch — never directly to main.
- After implementation completes, the user opens a PR to merge into main.
- Use `/rebase-on-main` to keep feature branches current before merging.
```

#### Template — Direct to main

```markdown
# Git Workflow: Direct to Main

Solo project — commits go directly to main, no branches.

## How to apply

- `/implement` does NOT create a branch. It works on main directly.
- `/commit` pushes to main without confirmation (it's already the working branch).
- Skip `/rebase-on-main` — there are no feature branches to rebase.
- Worktrees are still allowed for parallel work, but each writes back to main on merge.
```

#### Template — Worktree per feature

```markdown
# Git Workflow: Worktree per Feature

This project uses git worktrees + feature branches for parallel development.

## How to apply

- `/implement` defaults to creating a worktree (with branch `implement/{plan-name}`).
- `/commit` pushes to the worktree's branch.
- After implementation completes, user opens a PR.
- `/rebase-on-main` cleans up the worktree after merge.
```

### 2.3 Select skills via `AskUserQuestion` (multiSelect):
build (Recommended), test, refactor-code, refactor-tests.

### 2.4 Gather project info

Read CLAUDE.md for context. Ask per-skill info via `AskUserQuestion`:

- **build**: build command, dev server (command, port, URL), kill method
- **test**: preview server name, test script (JS for `preview_eval`), perf tracking (yes/no + baseline path), testing conventions
- **refactor-code**: architecture principles (derive from CLAUDE.md if possible)
- **refactor-tests**: test framework files, test mapping

### 2.5 Store values in `.claude/local/skills/{name}/config.md` (markdown with clear headings).

### 2.6 Generate skills

For each selected skill:
1. Read template, compute SHA256 hash (first 8 hex)
2. Generate customized version (replace `{PLACEHOLDER}` markers)
3. Write full implementation to `.claude/skills/{name}/SKILL.md`
4. Write thin shell to `.claude/skills/{name}/SKILL.md` (frontmatter + redirect). Include `$ARGUMENTS` for skills that accept args.
5. Copy supporting files from template

**build exception**: scaffolds only `.claude/local/skills/build/config.md` — no project skill files (global skill reads config at runtime).

**test**: also generate `.claude/skills/test/scripts/smoke-test.js`.

Replace `${CLAUDE_SKILL_DIR}` refs with `.claude/skills/{name}/` in generated files.

### 2.7 Create `.claude/launch.json` if test selected + preview server configured and file doesn't exist.

### 2.8 Stamp `.claude/local/config-version.json` with global version, date, and skill template hashes.

### 2.9 Report: list created files (including `git-workflow.md`). Remind about `.claude/local/` in .gitignore, editing in `.claude/skills/`, and CLAUDE.md for architecture docs.

---

## Step 3 — Sync

### 3.1 Compare versions. If match and no specific skills requested → "All current." Done. If differ → read CHANGELOG, summarize project-action entries.

### 3.2 Per-skill: compute current template hash, compare to stored. Categorize: **Changed**, **Current**, or **New** (template exists but not in project).

### 3.3 Ask via `AskUserQuestion` (multiSelect, pre-select Changed+New).

### 3.4 Drift check (parallel Haiku fanout)

Before applying any update, compute drift per Changed skill — independently. For each Changed skill, spawn a Haiku agent (`model: "haiku"`):

> Given the current project SKILL.md and the regenerated content (template + filled placeholders + reinserted `<ProjectSpecific>` blocks), return JSON `{ skill, drift: bool, lines: N, sample: [first 20 +/- lines outside <ProjectSpecific> blocks] }`. Strip `<ProjectSpecific>` blocks from both before comparing.

Wait for all to return.

### 3.5 Apply updates per skill

For each Changed skill, based on its drift result:

- **No drift** → apply silently (regenerate + reinsert blocks).
- **Drift** → ask via `AskUserQuestion`: **Apply (overwrite drift)** / **Show full diff** / **Skip this skill**. If full diff requested, emit it as text and re-prompt.

For **New** skills: check existing configs for reusable values, ask for the rest, scaffold normally (no drift check — file doesn't exist yet).

#### `<ProjectSpecific>` block preservation

Project skills can carry custom additions wrapped in:

```markdown
<ProjectSpecific>
...content...
</ProjectSpecific>
```

Each block is anchored to the most recent heading above it (e.g. `## Step 3: Architecture`). When regenerating from template:

1. Scan the current project file for `<ProjectSpecific>` blocks, capturing each block's anchor heading.
2. For each preserved block, find its anchor heading in the regenerated content and re-insert the block immediately after that heading.
3. If the anchor heading no longer exists, append the block under a `## Project additions` section at the end and warn the user.

This lets project-specific rule references (e.g. *"Apply `.claude/rules/arch-core-principles.md`"*) survive template upgrades. Templates stay project-agnostic; projects keep their additions.

### 3.6 Update version stamp.

### 3.7 Report: updated, added, skipped, current skills. New version number.

---

## Edge Cases

- **No skills map in version file**: scan for installed skills, treat all as unknown hash, offer re-sync.
- **New placeholder in template**: detect, ask user, update config.
- **Manual edits**: drift check (Step 3.4) detects them. User can wrap edits in `<ProjectSpecific>...</ProjectSpecific>` blocks to preserve across syncs without prompting.
- **Pull fails**: offer to continue with local templates.
