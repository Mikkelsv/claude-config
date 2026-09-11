---
name: claude-sync
description: Pull global config, scaffold per-project Tier-3 skill configs, sync project-local forks of global skills for shared repos, and migrate a project off the retired template tier
---

# Claude Sync

Pull global config, then set up or refresh the two things a project can legitimately carry: **Tier-3 skill configs** and **project-local forks of global skills**.

Input: `$ARGUMENTS` (optional — `fresh` to force re-scaffold, or skill names to scope)

**There is no longer a template tier.** Every skill is global and discovers project context at runtime from `CLAUDE.md`, the project's `.claude/rules/`, and an optional committed `.claude/skill-config/<name>.md`. See `rules/meta-skill-tiers.md`.

## Tier-3 skill configs

Global skills that need project-specific values read `.claude/skill-config/<name>.md`, **committed** so colleagues get it on clone. Currently `/build` (build command, preview server) and `/test` (build command, tier table, baseline path, drift mapping); `/refactor-comments` optionally takes a curated partition table. The config is always optional — every skill degrades honestly without one — so scaffold on request rather than by default.

There is one location, and it is committed. If a project has a config in the old gitignored `.claude/local/skills/<name>/config.md`, move it — nothing reads that path any more.

## Forked-Global Skills (project-local copies)

Per `meta-project-local-skill-copies.md`, some projects ship local copies of global skills in `.claude/skills/<name>/` so colleagues without `~/.claude/` get the workflow on clone.

### Classification

For each `.claude/skills/<name>/SKILL.md`:

- **Forked-global** — `~/.claude/skills/<name>/SKILL.md` exists. Handled by the fork flow.
- **Project-unique** — no matching global. Leave alone; never treat as a fork.

### Transformations (applied when syncing global → project)

- `(~|$HOME)/.claude/` → `.claude/` (project-relative paths).
- `powershell.exe` → `pwsh` (cross-platform per the rule).

Applied to both SKILL.md and script content. Use one transform helper across all paths so behavior stays consistent.

### Script sync (wholesale by directory)

Forks depend on scripts at `.claude/scripts/*.ps1` and `.claude/skills/<fork>/scripts/*.ps1`. For each directory: sync every script present in the project from its `~/.claude/...` counterpart, **and** copy any script present in claude-config but missing in the project (new dependencies the fork pulls in).

---

## Step 0 — Pull

Run: `pwsh -NoProfile -File "$HOME/.claude/scripts/pull-config.ps1"`

If pull fails: ask the user — continue against the local global config, or abort?

## Step 1 — Detect Mode

`.claude/local/config-version.json` exists? → **Sync** (Step 3). Missing → **Initial Setup** (Step 2).
`$ARGUMENTS = "fresh"` → force Initial Setup. Skill names → scope to those skills in the detected mode.

## Step 2 — Initial Setup

### 2.1 Git workflow

If `.claude/rules/git-workflow.md` already exists, skip this step.

Ask via `AskUserQuestion`: which workflow does this project use?

- **Feature branches (Recommended)** — `/implement` creates `implement/{plan-name}` per plan, `/commit` pushes to that branch. PR-based merge to main.
- **Direct to main** — solo project or prototype. `/implement` works on main directly, `/commit` pushes straight to main. No PR step.
- **Worktree per feature** — like feature branches, but each plan gets its own worktree.

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

### 2.2 Tier-3 configs

Ask via `AskUserQuestion` (multiSelect): which global skills should get a project config? Offer `build` and `test`; mention `refactor-comments` only if the project is large enough that a curated partition table beats a derived one.

Read `CLAUDE.md` for context first, then gather per skill — build command, dev server name and port, test tiers and their commands, baseline path. Write each to `.claude/skill-config/<name>.md` as headed sections per the schema in `meta-skill-tiers.md`: commands, paths, names, small tables. Never architecture prose. These are **committed** — they are repo-wide truth, not per-machine state.

**Write project facts and nothing else.** No "generated on <date>", no "derived from <the owner's fork>", no note about global-vs-project precedence. A colleague reads this file and none of that helps them; worse, it reads as authoritative after it goes stale. If the migration produced owner-side context worth keeping, put it in a gitignored `.claude/local/skill-config-notes.md` instead.

### 2.3 Forked-globals (for shared repos)

Ask via `AskUserQuestion`: **is this a shared repo where colleagues may not have `~/.claude/` set up?**

- **No** (Recommended for solo projects) — skip to 2.4.
- **Yes** — colleagues will rely on local copies. Continue.

If yes, list the global skills via the Classification above and present via `AskUserQuestion` (multiSelect, no pre-selection): which to scaffold as project-local forks? Prefer skills integral to colleague workflow (`plan`, `implement`, `commit`, `rebase-on-main`).

Then for each selected fork:

1. Read `~/.claude/skills/<name>/SKILL.md`, apply the Transformations, write to `.claude/skills/<name>/SKILL.md`.
2. If `~/.claude/skills/<name>/scripts/` exists, copy each script with transformations applied.

Afterwards ensure `.claude/scripts/` has the shared utilities forks commonly depend on (`git-diff-scope.ps1`, `git-preflight.ps1`, `kill-port.ps1`), copied with transformations. Skip files the project already has — no overwrite without prompting.

Compute each fork's hash from its **transformed** content, for the `forks` map in 2.5.

### 2.4 Create `.claude/launch.json`

If a build or test config was written, a preview server was named, and the file doesn't exist.

### 2.5 Stamp `.claude/local/config-version.json`

Global version, date, and fork hashes under `forks`. There is no `skills` map any more — if an old one is present, drop it.

### 2.6 Report

List created files (including `git-workflow.md`). Remind about `.claude/local/` in `.gitignore`, and about `arch-claude-md-is-an-index` — `CLAUDE.md` is an orientation index, architecture substance belongs in the project's root `docs/`.

---

## Step 3 — Sync

### 3.1 Compare versions

Match, and no specific skills requested → "All current." Done. Differ → read `CHANGELOG.md` and summarize the **Project action** entries between the two versions.

### 3.1b One-time migration off the retired template tier

**Trigger:** the version file has a `skills` map. That map only ever recorded template-scaffolded skills, so its presence means this project predates v1.1.17 and still carries copies of skills that are now global. Skip this step entirely when it's absent.

**Resolve redirector stubs first.** If a project `SKILL.md` is a thin stub whose body just points at another path (e.g. a capital-`C` `Claude/skills/<name>/SKILL.md`, the pre-v1.1.0 layout), the real content is there. Classify and migrate *that* file — migrating a redirector accomplishes nothing and leaves the real copy orphaned. Offer to collapse the stale layout while you're here.

For each entry in the `skills` map, the named skill now exists globally. Classify its project copy and route:

- **Mechanical scaffold** — nothing beyond placeholder fills and `<ProjectSpecific>` blocks → **safe to delete.** The global skill takes over.
- **Carries hand-written content outside `<ProjectSpecific>`** → **stop and show it.** Report `projectOnlyLines` and the headings it sits under, exactly as 3.5 does for fork drift, and let the user decide: harvest it up to global first, keep the copy as a fork, or delete anyway. Never delete silently — that content is indistinguishable from stale drift to a diff, so the user is the only safeguard.
- **Shared repo whose colleagues lack `~/.claude/`** → **keep it, re-register under `forks`.** It stops being a templated skill and becomes an ordinary fork; drift handling from 3.2 onward then applies.

**Write the Tier-3 config and delete the copy in the same change.** Skill precedence is undocumented — nothing states whether a project copy shadows a global one — so a window where the copy is gone but the config is missing (or vice versa) has undefined behaviour. Gather what the global skill needs first (`/build`: build command, preview server; `/test`: build command, tier table, baseline path, optional drift mapping), write it per the schema in `meta-skill-tiers.md`, then remove the copy.

**Check `.gitignore` covers `.claude/local/`** before writing any config — Tier 3 requires it, and a project that never had a local config may not have the entry. Offer to add it.

Finally, drop the `skills` map from the version file on the 3.6 stamp. Keep `forks`.

### 3.2 Per-fork drift categorization

For each fork: compute the hash of the transformed `~/.claude/skills/<name>/SKILL.md` and compare to the stored one. Categorize **Changed**, **Current**, or **New** (a global exists that the project doesn't fork yet — only offer these if the project already forks something).

### 3.3 Selection

Ask via `AskUserQuestion` (multiSelect, pre-select Changed + New).

### 3.4 Drift check (parallel Haiku fanout)

Before applying anything, compute drift per Changed fork independently. For each, spawn a Haiku agent (`model: "haiku"` — mechanical per-item comparison, per `wf-agents-on-sonnet`):

> Given the current project SKILL.md and the regenerated content (transformed global + reinserted `<ProjectSpecific>` blocks), return JSON `{ skill, drift: bool, lines: N, projectOnlyLines: N, sectionsAtRisk: [headings], sample: [first 20 +/- lines outside <ProjectSpecific> blocks] }`. Strip `<ProjectSpecific>` blocks from both before comparing.
>
> `projectOnlyLines` counts lines present in the project copy but absent from the regenerated content — the work an overwrite would destroy. `sectionsAtRisk` names the headings those lines sit under.

Wait for all to return.

### 3.5 Apply updates per fork

- **No drift** → apply silently (regenerate + reinsert blocks).
- **Drift** → ask via `AskUserQuestion`: **Apply (overwrite drift)** / **Show full diff** / **Skip this skill**.

**Name the loss in the prompt.** State `projectOnlyLines` and `sectionsAtRisk` in the Apply option's description — "discards 82 project-only lines under Phase 6.5, Phase 8", not a bare "overwrite drift". Project content never wrapped in `<ProjectSpecific>` is indistinguishable from stale drift to the diff, so the user is the only safeguard and needs the magnitude up front.

When `projectOnlyLines` exceeds ~25, default the selection to **Skip**. A fork that far ahead of global is an unmerged feature branch, not drift — reconcile it deliberately rather than inside a sync.

Applying a fork also syncs its scripts per Script sync above — unconditional resync, no per-script drift tracking.

**Missing matching global** → a project fork with no `~/.claude/skills/<name>/SKILL.md` counterpart means the global was removed or renamed. Warn and skip; the user decides whether to delete the orphan.

#### `<ProjectSpecific>` block preservation

Project forks carry custom additions wrapped in:

```markdown
<ProjectSpecific>
...content...
</ProjectSpecific>
```

Each block is anchored to the most recent heading above it. When regenerating:

1. Scan the project file for `<ProjectSpecific>` blocks, capturing each block's anchor heading.
2. For each, find that anchor in the regenerated content and re-insert the block immediately after it.
3. If the anchor no longer exists, append the block under a `## Project additions` section at the end and warn.

`scripts/mirror-skill.ps1` implements this algorithm; prefer calling it over re-deriving. See `rules/wf-project-specific-blocks.md`.

### 3.6 Update the version stamp

### 3.7 Report

Updated, added, skipped, current forks. New version number.

---

## Edge Cases

- **No `forks` map in the version file**: scan `.claude/skills/` per Classification, register all as **New**, ask the user to accept; later runs handle drift normally.
- **A stale `skills` map** from the retired template tier: handled by Step 3.1b, not here. Don't drop the map without running that migration — it is the only signal that a project still carries copies of now-global skills.
- **Manual edits**: the drift check catches them. Wrapping edits in `<ProjectSpecific>` preserves them across syncs without prompting.
- **Project-unique skills**: no matching global → left alone, never treated as forks.
- **Pull fails**: offer to continue against the local global config.
