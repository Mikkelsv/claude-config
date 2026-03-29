# Claude Code Setup

Personal Claude Code configuration with slash commands, skills, and PowerShell automation, stored in a git repo. Commands handle the decision-making while PowerShell scripts do the mechanical execution, communicating via JSON.

## For Humans

### Commands

#### `/claude-setup [skills]`

Scaffold project-level skills from global templates. Creates thin shells in `.claude/skills/` (for skill discovery) and full implementations in `Claude/skills/` (for frictionless editing). Also creates `Claude/docs/` for architecture documentation. Available skills: build, test, refactor, plan, implement.

- `/claude-setup` — asks which skills to scaffold
- `/claude-setup all` — scaffolds everything
- `/claude-setup build test` — scaffolds specific skills

#### `/rebase-on-main`

Full rebase workflow: checks for uncommitted changes, fetches and rebases onto main, resolves conflicts autonomously, verifies the build, and force-pushes with lease. Optionally merges the feature branch back into main with branch cleanup and worktree cleanup.

#### `/claude-refactor`

Audit all skills, commands, scripts, rules, and templates across the global config and the current project. Checks for bugs, stale references, misplaced items, missing permissions, script extraction opportunities, template drift, and underused parallelization.

#### `/claude-push`

Commit and push all pending changes in the config repo. Automatically generates a commit message based on the diff.

#### `/claude-pull`

Pull the latest changes from the remote config repo (fast-forward only).

#### `/todo [text]`

Capture a question, prompt, or to-do item for Claude to remember and surface in future conversations.

#### `/handoff`

Write a session handoff summary to project memory so the next session can pick up where this one left off.

#### `/pickup`

Resume from a previous session's handoff.

#### `/allow [prompt]`

Parse a blocked permission prompt and add a generalized allow rule to `settings.json`.

### Setup

Config is a git repo at <https://github.com/Mikkelsv/claude-config.git>, stored at `~/Documents/Code/claude-config/`. A Windows junction makes `~/.claude/` point to `dotclaude/` so Claude Code finds everything where it expects it. For a fresh machine, run `Claude/setup.ps1` to clone, create junctions, and configure.

### Notifications

When Claude finishes a task or hits a permission prompt, the Claude desktop app flashes its taskbar icon and plays a notification sound (`Claude/scripts/notify.ps1`).

---

## For Claude (Reusable Setup Guide)

### Directory Layout

```text
~/Documents/Code/claude-config/           # Git repo root
  dotclaude/                              # Junction target for ~/.claude/
    .gitignore
    .claude/rules/                        # Meta-config for the config repo
    CLAUDE.md                             # Global instructions
    README.md                             # This file
    settings.json                         # Machine-specific (gitignored)
    settings.template.json                # Portable template (committed)
    commands/                             # Slash commands
    rules/                                # Global rules (always active)
    skills/                               # Thin shells (redirect to Claude/skills/)
    scripts/ -> junction to Claude/scripts/
    templates/ -> junction to Claude/templates/
  Claude/                                 # Freely editable (no permission prompts)
    config-version.json                   # Global config version tracking
    setup.ps1                             # Fresh machine bootstrap
    scripts/                              # PowerShell automation (21 scripts)
    templates/skills/                     # 9 skill templates
    skills/                               # Full global skill implementations
      rebase-on-main/
      claude-refactor/
```

**Junctions:**
- `~/.claude/` -> `~/Documents/Code/claude-config/dotclaude/`
- `dotclaude/scripts/` -> `Claude/scripts/`
- `dotclaude/templates/` -> `Claude/templates/`

### Design Pattern

**Prompts orchestrate, scripts execute.** Commands/skills contain decision logic; PowerShell scripts do mechanical work and return JSON.

- **`dotclaude/`** holds discovery files (rules, commands, skill shells, settings)
- **`Claude/`** holds editable content (scripts, templates, skill implementations)
- Edit through `~/Documents/Code/claude-config/` paths, not `~/.claude/`
- Git operations target `~/Documents/Code/claude-config/` (the repo root)

### Version Tracking

`Claude/config-version.json` tracks the global config version. A pre-commit hook auto-bumps on changes to rules, commands, skills, scripts, or templates. Projects track staleness via their own `Claude/config-version.json`.

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

### Script Catalog

All scripts in `Claude/scripts/`, accessible via `~/.claude/scripts/` through junction chain.

| Category | Scripts |
|----------|---------|
| Worktree | `get-worktrees`, `create-worktree`, `remove-worktree`, `escape-worktree` |
| Launching | `launch-vscode`, `launch-claude-tab`, `launch-worktree`, `launch-dev-server`, `kill-port` |
| Git | `git-preflight`, `git-branch-scope`, `git-diff-scope` |
| File/Process | `remove-path`, `move-path`, `npm-command`, `node-run` |
| Config | `sync-config`, `pull-config`, `settings-add-rule` |
| Notifications | `notify` |

Skill-local scripts in `Claude/skills/rebase-on-main/scripts/`: `git-rebase-onto`, `git-merge-cleanup`.
