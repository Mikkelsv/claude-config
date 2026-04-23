# Claude Code Setup

Personal Claude Code configuration with slash commands, skills, and PowerShell automation, stored in a git repo. Commands handle the decision-making while PowerShell scripts do the mechanical execution, communicating via JSON.

## For Humans

### Config Management

| Command | What it does |
|---|---|
| `/claude-sync [skills\|fresh]` | Pull global config, then scaffold or sync project skills. First run = full scaffolding, later runs = targeted template updates. |
| `/claude-refactor` | Audit all skills, commands, scripts, rules, and templates. Fixes bugs, stale refs, permission gaps. |
| `/claude-push` | Commit and push config changes. Auto-bumps version on template changes. |
| `/allow [prompt]` | Parse a blocked permission prompt and add a generalized allow rule. |
| `/capture-rule [idea]` | Capture a new code-quality, architecture, or workflow rule. Asks category + scope, drafts the rule, saves after your approval. |

### Global Workflow Skills

Available to you in every project via the global config.

| Skill | What it does |
|---|---|
| `/build` | Build & serve. Reads project config from `Claude/local/skills/build/config.md`. |
| `/rebase-on-main` | Rebase on main, resolve conflicts, optionally merge/push. |
| `/plan [feature]` | Collaborative feature discovery + plan creation. Skeptical senior-engineer persona — challenges premise, flags .NET/web anti-patterns. |
| `/implement [plan]` | Autonomous dev loop — plan tasks with build/test/refactor/audit gates. Per-task `/refactor-code` if ≥ 20 lines changed. |
| `/refactor [focus]` | Code quality review orchestrator (spawns refactor-code, refactor-docs, refactor-tests). |
| `/refactor-docs [focus]` | Documentation sync — checks docs match code changes. |
| `/audit-architecture [focus]` | Strict, skeptical architecture review (single-pass): boundaries, overengineering, alternatives. Assumes overengineered until proven otherwise. |
| `/teach [mode]` | Interactive programming lesson — contextual deep-dive, codebase exploration, or random topic. |
| `/commit [hint]` | Stage all changes, craft a typed commit message (FEAT/FIX/REFAC/DOCS), and push. Prompts to amend for small changes. |

### Project Skills (via /claude-sync)

Scaffolded per-project from templates. Embed project-specific knowledge (architecture rules, test patterns).

| Skill | What it does |
|---|---|
| `/test` | Browser-based smoke tests with optional perf tracking. |
| `/refactor-code [focus]` | Code quality & architecture review with project-specific criteria. |
| `/refactor-tests [focus]` | Test coverage review with project-specific framework knowledge. |

### Utility Commands

| Command | What it does |
|---|---|
| `/todo [text]` | Capture a to-do item for future sessions. |
| `/handoff` | Write a session handoff summary to project memory. |
| `/pickup` | Resume from a previous session's handoff. |

### Setup

Config is a git repo at <https://github.com/Mikkelsv/claude-config.git>, stored at `~/claude-config/`.

#### How it works

Claude Code expects its config at `~/.claude/`. Instead of editing there directly (which triggers permission prompts on every write), this repo uses **Windows junctions** to make `~/.claude/` point to the repo's `dotclaude/` directory. Edits go through the real repo paths.

```
~/.claude/  ──junction──>  ~/claude-config/dotclaude/   (discovery: rules, commands, skill shells)
                           ~/.claude/       (editable: scripts, templates, skill implementations)
```

Scripts and templates live directly in `Claude/scripts/` and `Claude/templates/` — no junctions needed.

#### Why two directories?

Claude Code protects `.claude/` — writes through the `dotclaude/` junction still trigger prompts because the OS resolves the junction. The `Claude/` directory is outside this protection, so edits there are prompt-free. Discovery files (rules, commands, skill shells, settings) must live in `dotclaude/` for Claude Code to find them, but everything else belongs in `Claude/`.

#### Fresh machine setup

1. Install [git](https://git-scm.com/) and ensure it's on PATH.
2. If `~/.claude/` already exists as a regular directory, back it up and remove it.
3. Run the setup script from an elevated PowerShell:
   ```powershell
   git clone https://github.com/Mikkelsv/claude-config.git "$env:USERPROFILE\claude-config"
   powershell -File "$env:USERPROFILE\.claude\setup.ps1"
   ```
4. The script clones the repo (if needed), creates all junctions, generates `settings.json` from the template, and registers the toast notification AppID (Start Menu shortcut + banner permissions, required by Windows 11).
5. Open Claude Code — your rules, commands, and skills should be active immediately.

#### After setup

- **Edit config** through `~/claude-config/` paths (never `~/.claude/`).
- **Sync changes** with `/claude-push` (commit + push) or `/claude-sync` (pull + sync project skills).
- **Add project skills** with `/claude-sync` in any project directory.

### Notifications

When Claude finishes a task or hits a permission prompt, `Claude/scripts/notify.ps1` shows a Windows toast banner with a short summary, flashes the Claude desktop app's taskbar icon, and plays a notification sound.

The toast registration is set up by `Claude/scripts/register-toast-appid.ps1` (run automatically by `setup.ps1` on first install). It registers a dedicated AppID, enables banner popups, and creates a Start Menu shortcut with the AppUserModelID embedded — Windows 11 requires all three or toasts land silently in Action Center.

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
  Claude/                                 # Freely editable (no permission prompts)
    config-version.json                   # Global config version tracking
    setup.ps1                             # Fresh machine bootstrap
    CHANGELOG.md                          # Project action changelog
    scripts/                              # PowerShell automation (19 scripts)
    templates/skills/                     # 4 skill templates (build, test, refactor-code, refactor-tests)
    skills/                               # Full global skill implementations
      allow/
      build/
      claude-refactor/
      claude-sync/
      implement/
      plan/
      rebase-on-main/
      refactor/
      refactor-docs/
      commit/
      teach/
```

**Junction:** `~/.claude/` -> `~/claude-config/dotclaude/`

### Design Pattern

**Prompts orchestrate, scripts execute.** Commands/skills contain decision logic; PowerShell scripts do mechanical work and return JSON.

- **`dotclaude/`** holds discovery files (rules, commands, skill shells, settings)
- **`Claude/`** holds editable content (scripts, templates, skill implementations)
- Edit through `~/claude-config/` paths, not `~/.claude/`
- Git operations target `~/claude-config/` (the repo root)

### Version Tracking

`Claude/config-version.json` tracks the global config version. The `/claude-push` command auto-bumps the patch version when changes touch rules, commands, skills, scripts, or templates. Projects track staleness via their own `Claude/local/config-version.json` (gitignored) — at session start, Claude compares the two and suggests `/claude-sync` if they differ.

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
- **wf-surface-rule-candidates.md** — Watch for generalizable decisions during work and surface them as rule candidates

New rules use category prefixes: `cq-` (code-quality), `arch-` (architecture), `wf-` (workflow). Existing un-prefixed rules stay as-is.

### Script Catalog

All scripts in `Claude/scripts/`.

| Category | Scripts |
|----------|---------|
| Worktree | `get-worktrees`, `create-worktree`, `remove-worktree`, `escape-worktree` |
| Launching | `launch-vscode`, `launch-dev-server`, `kill-port` |
| Git | `git-preflight`, `git-branch-scope`, `git-diff-scope`, `commit` |
| File/Process | `remove-path`, `move-path`, `npm-command`, `node-run` |
| Config | `sync-config`, `pull-config` |
| Notifications | `notify`, `register-toast-appid` |

Skill-local scripts in `Claude/skills/rebase-on-main/scripts/`: `git-rebase-onto`, `git-merge-cleanup`.
