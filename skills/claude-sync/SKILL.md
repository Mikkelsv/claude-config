---
name: claude-sync
description: Pull global config and scaffold or sync project-level skills from templates
---

# Claude Sync

Pull global config, then scaffold new project skills or sync existing ones.

Input: `$ARGUMENTS` (optional — `fresh` to force re-scaffold, or skill names to scope)

Templates: `~/.claude/templates/skills/`

## Project Skills (from templates)

Only skills with genuine project-specific content are scaffolded. Generic global skills (`/plan`, `/implement`, `/audit-branch`, `/audit-architecture`, `/refactor-docs`, `/study`) read project context from `CLAUDE.md` and `.claude/rules/` at runtime — no scaffolding needed **unless** the project is shared with colleagues who lack `~/.claude/` (see Forked-Global Skills below).

| Skill | Notes |
|---|---|
| **build** | Global skill — scaffolds `.claude/local/skills/build/config.md` only |
| **test** | Browser-based smoke tests + optional perf tracking |
| **refactor-code** | Code quality & architecture review |
| **refactor-tests** | Test coverage review |

## Forked-Global Skills (project-local copies)

Per `meta-project-local-skill-copies.md`, some projects ship local copies of generic global skills in `.claude/skills/<name>/` so colleagues without `~/.claude/` get the workflow on clone. These are **forks of global skills**, distinct from templated skills above.

### Classification

For each `.claude/skills/<name>/SKILL.md`:

- **Templated** — `~/.claude/templates/skills/<name>/SKILL.md` exists. Handled by existing template flow.
- **Forked-global** — `~/.claude/skills/<name>/SKILL.md` exists AND no template. Handled by fork flow (new logic).
- **Project-unique** — neither global nor template exists. Leave alone.

### Transformations (applied when syncing global → project)

- `(~|$HOME)/.claude/` → `.claude/` (project-relative paths).
- `powershell.exe` → `pwsh` (cross-platform per the rule).

Applied to both SKILL.md content and script content. Use a single transform helper across all sync paths so behavior stays consistent.

### Script sync (wholesale by directory)

Forks depend on scripts at `.claude/scripts/*.ps1` and `.claude/skills/<fork>/scripts/*.ps1`. For each directory: sync every script present in the project from its `~/.claude/...` counterpart, **and** copy any script present in claude-config but missing in the project (new dependencies the fork pulls in).

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

### 2.3b Forked-globals (optional, for shared repos)

Ask via `AskUserQuestion`: **Is this a shared repo where colleagues may not have `~/.claude/` set up?**

- **No** (Recommended for solo projects) — skip to 2.4.
- **Yes** — colleagues will rely on local copies. Continue.

If yes, compute the list of generic globals via the Forked-Global Classification (skills in `~/.claude/skills/` with no template). Present via `AskUserQuestion` (multiSelect, no pre-selection): which to scaffold as project-local forks? Per `meta-project-local-skill-copies.md`, prefer skills integral to colleague workflow (plan, implement, commit, rebase-on-main, etc.).

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

### 2.6b Scaffold forked-globals

For each fork selected in 2.3b:

1. Read `~/.claude/skills/<name>/SKILL.md`, apply Forked-Global Transformations, write to `.claude/skills/<name>/SKILL.md`.
2. If `~/.claude/skills/<name>/scripts/` exists, copy each script with transformations applied to content, to `.claude/skills/<name>/scripts/`.

After all forks scaffolded, ensure `.claude/scripts/` has the shared utility scripts forks commonly depend on (`git-diff-scope.ps1`, `git-preflight.ps1`, `kill-port.ps1`). Copy from `~/.claude/scripts/` with transformations. Skip files the project already has (no overwrite without prompting).

Compute hash of each fork's **transformed** content — stored in 2.8 under the `forks` map.

### 2.7 Create `.claude/launch.json` if test selected + preview server configured and file doesn't exist.

### 2.8 Stamp `.claude/local/config-version.json` with global version, date, skill template hashes (under `skills`), and fork hashes (under `forks`).

### 2.9 Report: list created files (including `git-workflow.md`). Remind about `.claude/local/` in .gitignore, editing in `.claude/skills/`, and CLAUDE.md for architecture docs.

---

## Step 3 — Sync

### 3.1 Compare versions. If match and no specific skills requested → "All current." Done. If differ → read CHANGELOG, summarize project-action entries.

### 3.2 Per-skill: compute current hash, compare to stored. Categorize: **Changed**, **Current**, or **New** (source exists but not in project). Apply to both **templates** (hash the regenerated template content) and **forks** (hash the transformed `~/.claude/skills/<name>/SKILL.md` per Forked-Global Transformations).

### 3.3 Ask via `AskUserQuestion` (multiSelect, pre-select Changed+New — templates and forks shown in one list, labeled by category).

### 3.4 Drift check (parallel Haiku fanout)

Before applying any update, compute drift per Changed skill — independently. For each Changed skill (template **or** fork), spawn a Haiku agent (`model: "haiku"`):

> Given the current project SKILL.md and the regenerated content (template + filled placeholders + reinserted `<ProjectSpecific>` blocks **for templates**, or transformed global + reinserted `<ProjectSpecific>` blocks **for forks**), return JSON `{ skill, drift: bool, lines: N, sample: [first 20 +/- lines outside <ProjectSpecific> blocks] }`. Strip `<ProjectSpecific>` blocks from both before comparing.

Wait for all to return.

### 3.5 Apply updates per skill

For each Changed skill, based on its drift result:

- **No drift** → apply silently (regenerate + reinsert blocks).
- **Drift** → ask via `AskUserQuestion`: **Apply (overwrite drift)** / **Show full diff** / **Skip this skill**. If full diff requested, emit it as text and re-prompt.

For **New** skills: check existing configs for reusable values, ask for the rest, scaffold normally (no drift check — file doesn't exist yet).

**Forks** use the same disposition logic (No drift / Drift / New) with fork-specific mechanics:

- **Apply** → read `~/.claude/skills/<name>/SKILL.md`, apply Forked-Global Transformations, reinsert `<ProjectSpecific>` blocks, write to project. Also sync scripts per Forked-Global Script sync — unconditional resync, no per-script drift tracking.
- **Missing matching global** → if a project fork has no `~/.claude/skills/<name>/SKILL.md` counterpart (global removed/renamed), warn ("Local fork `<name>` has no matching global — was it removed or renamed?") and skip. User decides whether to delete the orphan.

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
- **No forks map in version file** (first run after v1.1.3): scan `.claude/skills/` for forked-globals (per Forked-Global Classification), register all as **New**, ask user to accept; subsequent runs handle drift normally.
- **New placeholder in template**: detect, ask user, update config.
- **Manual edits**: drift check (Step 3.4) detects them. User can wrap edits in `<ProjectSpecific>...</ProjectSpecific>` blocks to preserve across syncs without prompting.
- **Fork has no matching global**: warn ("Local fork `<name>` has no matching global — was it removed or renamed?") and skip. User decides whether to delete the orphan.
- **Project-unique skills**: skills in `.claude/skills/` that have neither a template nor a matching global are left alone — never treated as forks.
- **Pull fails**: offer to continue with local templates.
