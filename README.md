# Claude Code Setup

Personal Claude Code configuration — slash commands, skills, rules, and PowerShell automation stored as a git repo at `~/.claude/`. Prompts orchestrate; scripts do the mechanical work and return JSON.

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

Available in every project via the global config.

| Skill | What it does |
|---|---|
| `/build` | Build & serve. Reads project config from `.claude/local/skills/build/config.md`. |
| `/rebase-on-main` | Rebase on main, resolve conflicts, optionally merge/push. |
| `/plan [feature]` | Collaborative feature discovery + plan creation. Skeptical senior-engineer persona — challenges premise, flags .NET/web anti-patterns. |
| `/implement [plan]` | Autonomous dev loop — plan tasks with build/test/refactor/audit gates. Per-task `/refactor-code` if ≥ 20 lines changed. |
| `/refactor [focus]` | Code quality review orchestrator (spawns refactor-code, refactor-docs, refactor-tests). |
| `/refactor-docs [focus]` | Documentation sync — checks docs match code changes. |
| `/audit-architecture [focus]` | Strict, skeptical architecture review (single-pass): boundaries, overengineering, alternatives. |
| `/teach [mode]` | Interactive programming lesson — contextual deep-dive, codebase exploration, or random topic. |
| `/commit [hint]` | Stage all changes, craft a typed commit message (FEAT/FIX/REFAC/DOCS), and push. |

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

### Fresh machine setup

1. Install [git](https://git-scm.com/) and ensure it's on PATH.
2. If `~/.claude/` already exists, back it up and remove it.
3. Run from PowerShell:
   ```powershell
   git clone https://github.com/Mikkelsv/claude-config.git "$env:USERPROFILE\.claude"
   powershell -File "$env:USERPROFILE\.claude\setup.ps1"
   ```
4. `setup.ps1` generates `settings.json` from the template and registers the toast-notification AppID (Start Menu shortcut + banner permissions, required by Windows 11).
5. Open Claude Code — rules, commands, and skills are active immediately.

### Day-to-day

- **Edit directly at `~/.claude/`.** Writes to `.claude/**` are allow-listed in `settings.json` so no permission prompts.
- **Sync changes** with `/claude-push` (commit + push) or `/claude-sync` (pull + sync project skills).
- **Add project skills** with `/claude-sync` in any project directory.

### Notifications

`scripts/notify.ps1` fires on Stop and permission-prompt hooks. Shows a Windows toast banner, flashes the Claude desktop icon, plays a sound. Registration handled by `scripts/register-toast-appid.ps1` (run by `setup.ps1` on first install).

---

## For Claude (Reusable Setup Guide)

### Directory Layout

```text
~/.claude/                        # Git repo root
  .git/                           # git state
  .gitignore
  CLAUDE.md                       # Global instructions
  README.md                       # This file
  CHANGELOG.md                    # Project-action changelog
  config-version.json             # Global config version
  setup.ps1                       # Fresh-machine bootstrap
  settings.json                   # Live, machine-specific (gitignored)
  settings.template.json          # Portable template (committed)
  commands/                       # Slash commands
  rules/                          # Global rules (always loaded)
  skills/                         # Global skill implementations (one SKILL.md per skill)
  scripts/                        # PowerShell automation
  templates/skills/               # Project-skill templates (used by /claude-sync)
```

**No junctions, no wrapper directories.** The repo lives at `~/.claude/` directly.

### Design Pattern

**Prompts orchestrate, scripts execute.** Commands and skills contain decision logic; PowerShell scripts do mechanical work and return JSON on stdout.

- Discovery files (rules, commands, skills, settings) live where Claude Code expects them — at the root.
- Scripts and templates are referenced by skills/commands via absolute paths (`~/.claude/scripts/...`).
- Runtime state (`cache/`, `sessions/`, `projects/`, etc.) is managed by Claude Code itself and gitignored.

### Version Tracking

`config-version.json` tracks the global config version. `/claude-push` auto-bumps the patch version when staged changes touch `templates/` (projects need re-sync). Projects track staleness via `.claude/local/config-version.json` (gitignored) — at session start, Claude compares the two and suggests `/claude-sync` if they differ.

### Global Rules

Rules in `rules/` are always loaded:

- **user-config.md** — Config conventions and sync rules
- **config-version.md** — Version staleness detection
- **skill-tiers.md** — 3-tier skill placement (global, project, local config)
- **no-commit.md** — Never commit (exception: config repo)
- **no-pipes.md** — Avoid chained shell commands
- **plans-location.md** — Plan files in project root `plans/`
- **prefer-clickable-prompts.md** — Clickable options over free-text
- **worktree-cleanup.md** — Auto-remove worktrees after merge
- **todo-surfacing.md** — Surface todo items at natural moments
- **no-read-generated-css.md** — Never read Tailwind output files
- **teach-on-completion.md** — Offer a teaching nugget + quiz after dev tasks
- **always-plan.md** — Auto-invoke `/plan` when work warrants a structured plan
- **wf-surface-rule-candidates.md** — Watch for generalizable decisions and surface them as rule candidates

New rules use category prefixes: `cq-` (code-quality), `arch-` (architecture), `wf-` (workflow). Older un-prefixed rules stay as-is.

### Script Catalog

All scripts in `scripts/`.

| Category | Scripts |
|----------|---------|
| Worktree | `get-worktrees`, `create-worktree`, `remove-worktree`, `escape-worktree` |
| Launching | `launch-vscode`, `launch-dev-server`, `kill-port` |
| Git | `git-preflight`, `git-branch-scope`, `git-diff-scope`, `commit` |
| File/Process | `remove-path`, `move-path`, `npm-command`, `node-run` |
| Config | `sync-config`, `pull-config` |
| Notifications | `notify`, `register-toast-appid` |
| Migration | `migrate-to-claude-root` (one-time, for machines still on the old `~/claude-config/` + junction layout) |

Skill-local scripts in `skills/rebase-on-main/scripts/`: `git-rebase-onto`, `git-merge-cleanup`.
