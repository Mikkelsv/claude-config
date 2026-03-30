# Claude Code Setup

Personal Claude Code configuration with slash commands, skills, and PowerShell automation, stored in a git repo. Commands handle the decision-making while PowerShell scripts do the mechanical execution, communicating via JSON.

## For Humans

### Commands

#### `/claude-setup [skills]`

Scaffold project-level skills from global templates. Creates thin shells in `.claude/skills/` (for skill discovery) and full implementations in `Claude/skills/` (for frictionless editing). Also creates `Claude/docs/` for architecture documentation. Available skills: build, test, refactor (+ refactor-code/docs/tests), audit, plan, implement.

- `/claude-setup` — asks which skills to scaffold
- `/claude-setup all` — scaffolds everything
- `/claude-setup build test` — scaffolds specific skills

#### `/rebase-on-main`

Full rebase workflow: checks for uncommitted changes, fetches and rebases onto main, resolves conflicts autonomously. Then offers options: merge into main (with build verification and branch cleanup), force-push the rebased branch (with lease), build and test, or revert.

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

Config is a git repo at <https://github.com/Mikkelsv/claude-config.git>, stored at `~/claude-config/`.

#### How it works

Claude Code expects its config at `~/.claude/`. Instead of editing there directly (which triggers permission prompts on every write), this repo uses **Windows junctions** to make `~/.claude/` point to the repo's `dotclaude/` directory. Edits go through the real repo paths.

```
~/.claude/  ──junction──>  ~/claude-config/dotclaude/   (discovery: rules, commands, skill shells)
                           ~/claude-config/Claude/       (editable: scripts, templates, skill implementations)
```

Two inner junctions provide backward-compatible `~/.claude/scripts/` and `~/.claude/templates/` paths:

```
dotclaude/scripts/   ──junction──>  Claude/scripts/
dotclaude/templates/ ──junction──>  Claude/templates/
```

#### Why two directories?

Claude Code protects `.claude/` — writes through the `dotclaude/` junction still trigger prompts because the OS resolves the junction. The `Claude/` directory is outside this protection, so edits there are prompt-free. Discovery files (rules, commands, skill shells, settings) must live in `dotclaude/` for Claude Code to find them, but everything else belongs in `Claude/`.

#### Fresh machine setup

1. Install [git](https://git-scm.com/) and ensure it's on PATH.
2. If `~/.claude/` already exists as a regular directory, back it up and remove it.
3. Run the setup script from an elevated PowerShell:
   ```powershell
   git clone https://github.com/Mikkelsv/claude-config.git "$env:USERPROFILE\claude-config"
   powershell -File "$env:USERPROFILE\claude-config\Claude\setup.ps1"
   ```
4. The script clones the repo (if needed), creates all junctions, and generates `settings.json` from the template.
5. Open Claude Code — your rules, commands, and skills should be active immediately.

#### After setup

- **Edit config** through `~/claude-config/` paths (never `~/.claude/`).
- **Sync changes** with `/claude-push` (commit + push) and `/claude-pull` (pull).
- **Add project skills** with `/claude-setup` in any project directory.

### Notifications

When Claude finishes a task or hits a permission prompt, the Claude desktop app flashes its taskbar icon and plays a notification sound (`Claude/scripts/notify.ps1`).

---

## For Claude (Reusable Setup Guide)

### Directory Layout

```text
~/claude-config/           # Git repo root
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
    scripts/                              # PowerShell automation (19 scripts)
    templates/skills/                     # 9 skill templates
    skills/                               # Full global skill implementations
      rebase-on-main/
      claude-refactor/
```

**Junctions:**
- `~/.claude/` -> `~/claude-config/dotclaude/`
- `dotclaude/scripts/` -> `Claude/scripts/`
- `dotclaude/templates/` -> `Claude/templates/`

### Design Pattern

**Prompts orchestrate, scripts execute.** Commands/skills contain decision logic; PowerShell scripts do mechanical work and return JSON.

- **`dotclaude/`** holds discovery files (rules, commands, skill shells, settings)
- **`Claude/`** holds editable content (scripts, templates, skill implementations)
- Edit through `~/claude-config/` paths, not `~/.claude/`
- Git operations target `~/claude-config/` (the repo root)

### Version Tracking

`Claude/config-version.json` tracks the global config version. The `/claude-push` command auto-bumps the patch version when changes touch rules, commands, skills, scripts, or templates. Projects track staleness via their own `Claude/config-version.json` — at session start, Claude compares the two and suggests `/claude-setup` if they differ.

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
| Config | `sync-config`, `pull-config` |
| Notifications | `notify` |

Skill-local scripts in `Claude/skills/rebase-on-main/scripts/`: `git-rebase-onto`, `git-merge-cleanup`.
