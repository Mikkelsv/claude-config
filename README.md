# Claude Code Setup

Personal Claude Code configuration with slash commands, skills, and PowerShell automation, stored in a git repo. Commands handle the decision-making while PowerShell scripts do the mechanical execution, communicating via JSON.

## For Humans

### Config Management

| Command | What it does |
|---|---|
| `/claude-sync [skills\|fresh]` | Pull global config, then scaffold or sync project skills |
| `/claude-refactor` | Audit all skills, commands, scripts, rules, and templates |
| `/claude-push` | Commit and push config changes |
| `/allow [prompt]` | Parse a blocked permission prompt and add an allow rule |

### Global Workflow Skills

Available in every project via the global config.

| Skill | What it does |
|---|---|
| `/build` | Build & serve. Reads project config from `Claude/local/skills/build/config.md`. |
| `/rebase-on-main` | Rebase on main, resolve conflicts, optionally merge/push. |
| `/plan [feature]` | Collaborative discovery + plan. Skeptical persona — flags .NET/web anti-patterns. |
| `/implement [plan]` | Autonomous dev loop with build/test/refactor/audit gates. |
| `/refactor [focus]` | Code quality review orchestrator. |
| `/refactor-docs [focus]` | Documentation sync. |
| `/audit-architecture [focus]` | Strict, skeptical single-pass architecture review. |
| `/teach [mode]` | Interactive programming lesson — contextual, codebase exploration, or random topic. |
| `/commit [hint]` | Stage all changes, craft a typed commit message, and push. |

### Project Skills (via /claude-sync)

Scaffolded per-project from templates. Embed project-specific knowledge.

| Skill | What it does |
|---|---|
| `/test` | Browser-based smoke tests with optional perf tracking. |
| `/refactor-code [focus]` | Code quality & architecture review with project-specific criteria. |
| `/refactor-tests [focus]` | Test coverage review. |

### Utility Commands

| Command | What it does |
|---|---|
| `/todo [text]` | Capture a to-do item for future sessions. |
| `/handoff` | Write session handoff to project memory. |
| `/pickup` | Resume from a previous handoff. |

### Setup

Config is a git repo at <https://github.com/Mikkelsv/claude-config.git>, stored at `~/claude-config/`.

#### How it works

Claude Code expects its config at `~/.claude/`. Instead of editing there directly (which triggers permission prompts on every write), this repo uses **Windows junctions** to make `~/.claude/` point to the repo's `dotclaude/` directory. Edits go through the real repo paths.

```
~/.claude/  ──junction──>  ~/claude-config/dotclaude/   (discovery: rules, commands, skill shells)
                           ~/claude-config/Claude/       (editable: scripts, templates, skill implementations)
```

Scripts and templates live directly in `Claude/scripts/` and `Claude/templates/` — no junctions needed.

#### Fresh machine setup

1. Install [git](https://git-scm.com/) and ensure it's on PATH.
2. If `~/.claude/` already exists as a regular directory, back it up and remove it.
3. Run the setup script from an elevated PowerShell:
   ```powershell
   git clone https://github.com/Mikkelsv/claude-config.git "$env:USERPROFILE\claude-config"
   powershell -File "$env:USERPROFILE\claude-config\Claude\setup.ps1"
   ```
4. The script clones the repo (if needed), creates all junctions, generates `settings.json` from the template, and registers the toast notification AppID for desktop notifications.
5. Open Claude Code — your rules, commands, and skills should be active immediately.

#### After setup

- **Edit config** through `~/claude-config/` paths (never `~/.claude/`).
- **Sync changes** with `/claude-push` (commit + push).
- **Add project skills** with `/claude-sync` in any project directory.

### Notifications

When Claude finishes a task or hits a permission prompt, `Claude/scripts/notify.ps1` shows a Windows toast banner with a short summary of the task, flashes the Claude desktop app's taskbar icon, and plays a notification sound. Toast registration is handled automatically by `setup.ps1` via `register-toast-appid.ps1` (creates a Start Menu shortcut with embedded AppUserModelID — required by Windows 11).

---

## For Claude (Reusable Setup Guide)

### Directory Layout

```text
~/claude-config/                         # Git repo root
  dotclaude/                             # Junction target for ~/.claude/
    .gitignore
    .claude/rules/                       # Meta-config for the config repo
    CLAUDE.md                            # Global instructions
    README.md                            # Claude-facing docs
    settings.json                        # Machine-specific (gitignored)
    settings.template.json               # Portable template (committed)
    commands/                            # Slash commands
      claude-push.md
      handoff.md
      pickup.md
      todo.md
    rules/                               # Global rules (always active)
    skills/                              # Thin shells (redirect to Claude/skills/)
      allow/
      build/
      claude-refactor/
      claude-sync/
      rebase-on-main/
    scripts/ -> junction to Claude/scripts/
    templates/ -> junction to Claude/templates/
  Claude/                                # Freely editable (no permission prompts)
    CHANGELOG.md                         # Project action changelog
    config-version.json                  # Global config version tracking
    setup.ps1                            # Fresh machine bootstrap
    scripts/                             # PowerShell automation (19 scripts)
    templates/skills/                    # 4 skill templates (build, test, refactor-code, refactor-tests)
    skills/                              # Full global skill implementations
      allow/
      build/
      claude-refactor/
      claude-sync/
      implement/
      plan/
      rebase-on-main/
      refactor/
      refactor-docs/
      audit-architecture/
```

### Design Pattern: Global vs Project-Level

**Global** (in `~/claude-config/`) — generic workflows available in every project:
- Config: `/claude-sync`, `/claude-refactor`, `/claude-push`, `/allow`
- Workflow: `/build`, `/rebase-on-main`, `/plan`, `/implement`, `/refactor`, `/refactor-docs`, `/audit-architecture`
- Utility: `/handoff`, `/pickup`, `/todo`

**Project-level** (in `<project>/.claude/skills/`) — embed project-specific knowledge, scaffolded by `/claude-sync`:
- `/test`, `/refactor-code`, `/refactor-tests`

Global workflow skills (`/plan`, `/implement`, `/refactor`, `/refactor-docs`, `/audit-architecture`) read project context from `CLAUDE.md` and `.claude/rules/` at runtime — they don't need per-project scaffolding.

### Design Pattern: Commands / Skills + Scripts

The core principle: **prompts are Claude orchestration, scripts are mechanical execution**.

- **Commands** (`commands/<name>.md`) — simple orchestration prompts for flows using shared scripts.
- **Skills** (`skills/<name>/SKILL.md`) — complex orchestration with co-located scripts.
- **Templates** (`templates/skills/<name>/SKILL.md`) — generic skill skeletons with `{PLACEHOLDER}` markers. Read by `/claude-sync` to generate project-level skills.
- **Scripts** (`.ps1` files) — shell operations: git commands, file I/O, process management.
- **Communication** is via JSON on stdout. Every script outputs a JSON object so Claude can parse the result.

### Script Catalog

#### Worktree Management

| Script | Params | Output | Used by |
|--------|--------|--------|---------|
| `get-worktrees.ps1` | (none) | `[{name, path, branch, commit, color}]` | `git-merge-cleanup.ps1` |
| `create-worktree.ps1` | `-Name`, `-Branch` | `{path, branch, commit}` | (manual use) |
| `remove-worktree.ps1` | `-Name`, `-DeleteBranch` (switch) | `{removed, branch, branchDeleted}` | `git-merge-cleanup.ps1` |
| `escape-worktree.ps1` | (none) | `{isWorktree, mainRepoRoot, branch}` | (manual use) |

#### Launching

| Script | Params | Output | Used by |
|--------|--------|--------|---------|
| `launch-vscode.ps1` | `-Path`, `-Color` | (none, run in background) | (manual use) |
| `launch-dev-server.ps1` | `-Project`, `-Port` | `{launched, url}` | (template reference) |
| `kill-port.ps1` | `-Port` | `{killed, pids}` or `{killed: false, reason}` | `/build` |

#### Git Operations

| Script | Params | Output | Used by |
|--------|--------|--------|---------|
| `git-preflight.ps1` | (none) | `{branch, isMain, hasChanges, staged, unstaged, untracked}` | (shared utility) |
| `git-branch-scope.ps1` | `-BaseBranch` (default: main) | `{branch, base, hasMergeBase, isAhead, commitCount, commits[], files[]}` | (legacy) |
| `git-diff-scope.ps1` | `-RepoPath`, `-BaseBranch` (default: main), `-StatOnly` | Text: mode + stat + diff | `/refactor`, `/audit-architecture` |

#### Rebase (skill-local: `Claude/skills/rebase-on-main/scripts/`)

| Script | Params | Output | Used by |
|--------|--------|--------|---------|
| `git-rebase-onto.ps1` | `-BaseBranch` (default: main) | `{status, branch, ...}` | `/rebase-on-main` |
| `git-merge-cleanup.ps1` | `-Branch` | `{merged, pushed, branch, localDeleted, remoteDeleted, worktreeRemoved}` | `/rebase-on-main` |

#### File & Process Operations

| Script | Params | Output | Used by |
|--------|--------|--------|---------|
| `remove-path.ps1` | `-Path`, `-Force` (switch) | `{removed, path, type}` | (replaces `rm -rf`) |
| `move-path.ps1` | `-Source`, `-Destination`, `-Force` (switch) | `{moved, source, destination}` | (replaces `mv`) |
| `npm-command.ps1` | `-Command`, `-WorkingDirectory` (optional) | `{success, exitCode, output}` | (replaces `npm ...`) |
| `node-run.ps1` | `-Script`, `-WorkingDirectory` (optional) | `{success, exitCode, output}` | (replaces `node ...`) |

#### Config Sync & Notifications

| Script | Params | Output | Used by |
|--------|--------|--------|---------|
| `sync-config.ps1` | `-Message` | `{committed, pushed, hash, message}` | `/claude-push` |
| `pull-config.ps1` | (none) | `{pulled, before, after, commits}` | `/claude-sync` |
| `notify.ps1` | (none, reads JSON hook input from stdin) | (side-effects: Windows toast banner + taskbar flash + sound) | Stop and Notification hooks |
| `register-toast-appid.ps1` | (none) | (side-effects: registers AppID, Start Menu shortcut, banner permissions) | `setup.ps1` (one-time setup) |

### Settings and Permissions

`settings.json` controls permissions (allow list with glob patterns), default mode (`acceptEdits`), and hooks (notification on stop/permission prompt). Use `settings.template.json` as the portable template — copy to `settings.json` on new machines.

### Version Tracking

`Claude/config-version.json` tracks the global config version. The `/claude-push` command auto-bumps the patch version when changes touch templates. Projects track staleness via `Claude/local/config-version.json` (gitignored) — at session start, Claude compares the two and suggests `/claude-sync` if they differ.

### Global Rules

Rules in `dotclaude/rules/` are always loaded:

- **user-config.md** — Config conventions, repo structure, sync rules
- **config-version.md** — Version staleness detection
- **claude-folder.md** — Use `Claude/` over `.claude/` for editable content
- **no-commit.md** — Never commit (exception: config repo)
- **no-pipes.md** — Avoid chained shell commands
- **plans-location.md** — Plan files in project root `plans/`
- **prefer-clickable-prompts.md** — Clickable options over free-text
- **worktree-cleanup.md** — Auto-remove worktrees after merge
- **todo-surfacing.md** — Surface todo items at natural moments
- **no-read-generated-css.md** — Never read Tailwind output files
- **skill-tiers.md** — 3-tier skill placement (global, project, local config)
- **teach-on-completion.md** — Offer a teaching nugget + quiz after completing dev tasks
- **always-plan.md** — Auto-invoke `/plan` when work warrants a structured plan
