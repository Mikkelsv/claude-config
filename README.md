# Claude Code Setup

Personal Claude Code configuration with slash commands, skills, and PowerShell automation, stored in a git repo. Commands handle the decision-making while PowerShell scripts do the mechanical execution, communicating via JSON.

## For Humans

### Commands

#### `/claude-sync [skills]`

Scaffold project-level skills from global templates. Creates thin shells in `.claude/skills/` (for skill discovery) and full implementations in `Claude/skills/` (for frictionless editing). Also creates `Claude/docs/` for architecture documentation. Available skills: build, test, refactor, plan, implement.

- `/claude-sync` — asks which skills to scaffold
- `/claude-sync all` — scaffolds everything
- `/claude-sync build test` — scaffolds specific skills

#### `/rebase-on-main`

Full rebase workflow: checks for uncommitted changes, fetches and rebases onto main, resolves conflicts autonomously, verifies the build, and force-pushes with lease. Optionally merges the feature branch back into main with branch cleanup and worktree cleanup.

- `/rebase-on-main` — walks through the full flow with prompts at decision points

#### `/claude-refactor`

Audit all skills, commands, scripts, rules, and templates across the global config and the current project. Checks for bugs, stale references, misplaced items, missing permissions, script extraction opportunities, template drift, and underused parallelization. Runs 3 review agents in parallel, fixes low-risk issues directly, and asks about architectural decisions.

- `/claude-refactor` — full audit with parallel review agents, auto-fixes, and summary

#### `/claude-push`

Commit and push all pending changes in the `~/.claude/` config repo. Automatically generates a commit message based on the diff.

- `/claude-push` — stages everything, commits, and pushes

#### `/claude-pull`

Pull the latest changes from the remote `~/.claude/` config repo (fast-forward only). Use this to pick up changes made on another machine.

- `/claude-pull` — pulls and reports new commits, or "already up to date"

#### `/todo [text]`

Capture a question, prompt, or to-do item for Claude to remember and surface in future conversations. Items are stored per-project in the memory system.

- `/todo check if horizon normals are flipped` — saves the item and continues without derailing
- `/todo` (no args) — shows the current list, lets you check off or remove items

#### `/handoff`

Write a session handoff summary to project memory so the next session can pick up where this one left off. Useful when a session gets stuck (e.g., stale worktree CWD) or when you want to continue work in a fresh session without losing context.

- `/handoff` — summarizes current session's work, decisions, and open items into project memory

#### `/pickup`

Resume from a previous session's handoff. Reads the handoff context, summarizes it, cleans up the handoff file, and asks what to work on next. If multiple handoffs exist, lets you choose which to pick up.

- `/pickup` — loads handoff context and orients you on where things stand

#### `/allow [prompt]`

Parse a blocked permission prompt and add a generalized allow rule to `settings.json`. Accepts input in many formats: paste the full prompt text, a tool call like `Bash(wt new-tab ...)`, a raw command, a path like `Write(.vscode/settings.json)`, or a plain English description. Asks for confirmation before adding.

- `/allow Write(~/.claude/scripts/*)` — generalizes and adds a rule
- `/allow` (no args) — prompts you to paste the blocked action

### Project-Level Skills (via /claude-sync)

These skills are scaffolded per-project using `/claude-sync`. Each uses global templates but is customized with project-specific build commands, test scripts, and architecture rules. Skills are self-contained — scripts are co-located, no dependency on `~/.claude/scripts/`.

#### `/build [task]`

Build and serve the application. Optionally execute a coding task first, then auto-build. Also auto-triggers after any code changes.

#### `/test`

Build, start the dev server, and run browser-based smoke tests with performance tracking. Manages a perf baseline and reports verdicts (ALL GOOD / REGRESSION / etc.).

#### `/refactor [focus]`

Code quality and architecture review. Three modes: no args reviews uncommitted changes or branch diff, a path/area focuses on that part of the codebase, `all` does a general sweep. Spawns parallel sub-agents (refactor-code, refactor-docs, refactor-tests) and produces a unified verdict.

#### `/plan [feature idea]`

Collaborative feature discovery and planning. Takes a rough feature idea, explores it through questions, evaluates scope (splitting bloated features into multiple plans), and produces structured implementation plans compatible with `/implement`.

#### `/implement [plan-file]`

Autonomous development loop that works through a structured plan, implementing one task at a time with build, refactor, and test gates. Each completed task is committed as a single commit.

### Setup

Config is a git repo at <https://github.com/Mikkelsv/claude-config.git>, cloned directly as `~/.claude/`. For a fresh machine, run `setup.ps1` to clone and configure. To update, pull from the remote. After making changes, commit and push.

### Notifications

When Claude finishes a task or hits a permission prompt, the Claude desktop app flashes its taskbar icon and plays a notification sound (`scripts/notify.ps1`). Behavior adapts: if the app is in the foreground, it flashes 3 times briefly; if in the background, it flashes continuously until focused.

---

## For Claude (Reusable Setup Guide)

This section documents the architecture in detail so that another user (or Claude instance) can replicate or adapt this setup.

### Directory Layout

```text
~/.claude/                               # Git repo (cloned from GitHub)
  .gitignore                             # Excludes Claude-managed dirs and machine-specific files
  setup.ps1                              # Fresh machine setup script
  settings.template.json                 # Portable settings template (committed)
  README.md                              # This file
  CLAUDE.md                              # Global instructions (loaded into every session)
  settings.json                          # Permissions, hooks, defaultMode (gitignored, machine-specific)
  commands/                              # Slash commands (Claude orchestration)
    allow.md
    handoff.md
    pickup.md
    claude-pull.md
    claude-push.md
    claude-sync.md                      # Scaffold project-level skills from templates
    todo.md
  skills/                                # Global skills (work in any project)
    rebase-on-main/
      SKILL.md                           # Orchestration prompt
      scripts/
        git-rebase-onto.ps1              # Preflight + fetch + rebase in one shot
        git-merge-cleanup.ps1            # FF merge into main, push, delete branch, cleanup worktree
    claude-refactor/
      SKILL.md                           # Config audit with parallel review agents
  templates/                             # Templates for project-level skills
    skills/
      build/
        SKILL.md                         # Build & serve template
      test/
        SKILL.md                         # Test with perf tracking template
        browser-throttling.md            # Chrome background tab throttling notes
      refactor/
        SKILL.md                         # Code quality review orchestrator template
      refactor-code/
        SKILL.md                         # Code review sub-skill template
      refactor-docs/
        SKILL.md                         # Documentation sync sub-skill template
      refactor-tests/
        SKILL.md                         # Test coverage review sub-skill template
      audit/
        SKILL.md                         # Architecture audit template
      plan/
        SKILL.md                         # Feature discovery & planning template
      implement/
        SKILL.md                         # Autonomous dev loop template
        plan-template.md                 # Template for implementation plan files
  scripts/                               # PowerShell automation (shared, mechanical execution)
    escape-worktree.ps1                  # Detect linked worktree, return main repo path
    get-worktrees.ps1
    create-worktree.ps1
    remove-worktree.ps1
    launch-vscode.ps1
    notify.ps1                           # Notification hook (taskbar flash + sound)
    kill-port.ps1
    launch-dev-server.ps1
    pull-config.ps1                      # Pull latest config from remote
    sync-config.ps1                      # Stage, commit, push all config changes
    git-branch-scope.ps1
    git-diff-scope.ps1                   # Full diff scope for refactor skills (stat + diff)
    git-preflight.ps1
    remove-path.ps1                    # Safe file/directory removal with JSON output
    move-path.ps1                      # Safe file/directory move with JSON output
    npm-command.ps1                    # Run npm commands with JSON output
    node-run.ps1                       # Run node scripts with JSON output
  rules/                                 # Global rules (always active)
    user-config.md                       # Config conventions, prefer scripts, keep README updated
    todo-surfacing.md                    # Surface /todo items at natural moments
    worktree-cleanup.md                  # Auto-remove worktrees after merge
    claude-folder.md                       # Use Claude/ instead of .claude/ for editable content
    no-commit.md                         # Never commit (user manages commits)
    no-pipes.md                          # Avoid chained shell commands
    plans-location.md                    # Plan files go in project root plans/
    prefer-clickable-prompts.md          # Use clickable options over free-text questions
    no-read-generated-css.md             # Never read Tailwind CSS output files
```

### Design Pattern: Global vs Project-Level

**Global** (in `~/.claude/`) — truly generic utilities that work in any project:
- Commands: `/allow`, `/claude-pull`, `/claude-push`, `/claude-sync`, `/handoff`, `/pickup`, `/todo`
- Skills: `/rebase-on-main` (generic git workflow, delegates to project's `/build`), `/claude-refactor` (config audit with parallel review agents)

**Project-level** (in `<project>/.claude/skills/`) — context-dependent, scaffolded by `/claude-sync`:
- `/build` — build command, server config, port
- `/test` — test execution, baselines, patterns (supports background mode)
- `/refactor` — orchestrator spawning refactor-code, refactor-docs, refactor-tests (3 modes: changes/focused/general)
- `/refactor-code` — code quality & architecture review (3 modes: changes/focused/general)
- `/refactor-docs` — documentation sync (3 modes: changes/focused/general)
- `/refactor-tests` — test coverage review (3 modes: changes/focused/general)
- `/audit` — deep architecture review with 4 parallel agents (boundaries, overengineering, file organization, alternatives)
- `/plan` — feature discovery, scope splitting, plan creation
- `/implement` — autonomous loop using project's build/test/refactor/audit

Project skills are **self-contained**: scripts live in `.claude/skills/<name>/scripts/` alongside the SKILL.md. No dependency on `~/.claude/scripts/` — this keeps project skills portable and platform-aware.

### Design Pattern: Commands / Skills + Scripts

The core principle: **prompts are Claude orchestration, scripts are mechanical execution**.

- **Commands** (`.md` files in `commands/`) — simple orchestration prompts for flows using only shared scripts.
- **Skills** (directories in `skills/<name>/` with `SKILL.md`) — complex orchestration with co-located scripts. Use `${CLAUDE_SKILL_DIR}` to reference files within the skill directory.
- **Templates** (directories in `templates/skills/<name>/`) — generic skill skeletons with `{PLACEHOLDER}` markers. Read by `/claude-sync` to generate project-level skills.
- **Scripts** (`.ps1` files) — shell operations: git commands, file I/O, process management. Live either in `scripts/` (shared) or `skills/<name>/scripts/` (skill-local).
- **Communication** is via JSON on stdout. Every script outputs a JSON object so Claude can parse the result and make decisions based on it. Non-zero exit codes signal errors.

This separation means:

1. Claude spends tokens on decisions, not on constructing shell commands.
2. Scripts are testable independently of Claude.
3. Common operations (launching VS Code, managing worktrees) are reused across multiple commands/skills.
4. Complex workflows keep their scripts co-located for cohesion.
5. Project skills are portable — no hidden dependencies on the user's global scripts.

### Script Catalog

#### Worktree Management

| Script | Params | Output | Used by |
|--------|--------|--------|---------|
| `get-worktrees.ps1` | (none) | `[{name, path, branch, commit, color}]` | `git-merge-cleanup.ps1` |
| `create-worktree.ps1` | `-Name`, `-Branch` | `{path, branch, commit}` | (available for manual use) |
| `remove-worktree.ps1` | `-Name`, `-DeleteBranch` (switch) | `{removed, branch, branchDeleted}` | `git-merge-cleanup.ps1` |

#### Launching

| Script | Params | Output | Used by |
|--------|--------|--------|---------|
| `launch-vscode.ps1` | `-Path`, `-Color` | (none, run in background) | (manual use) |
| `launch-dev-server.ps1` | `-Project`, `-Port` | `{launched, url}` | (template reference for project skills) |
| `kill-port.ps1` | `-Port` | `{killed, pids}` or `{killed: false, reason}` | (template reference for project skills) |

#### Git Operations

| Script | Params | Output | Used by |
|--------|--------|--------|---------|
| `escape-worktree.ps1` | (none) | `{isWorktree, mainRepoRoot, branch}` | (available for manual use) |
| `git-preflight.ps1` | (none) | `{branch, isMain, hasChanges, staged, unstaged, untracked}` | (shared utility) |
| `git-branch-scope.ps1` | `-BaseBranch` (default: main) | `{branch, base, hasMergeBase, isAhead, commitCount, commits[], files[]}` | (legacy, replaced by `git-diff-scope.ps1` in templates) |
| `git-diff-scope.ps1` | `-RepoPath`, `-BaseBranch` (default: main), `-StatOnly` | Text: `MODE: uncommitted/branch/none` + stat + diff sections | `/refactor`, `/audit` (templates + project) |


#### Rebase (skill-local: `skills/rebase-on-main/scripts/`)

| Script | Params | Output | Used by |
|--------|--------|--------|---------|
| `git-rebase-onto.ps1` | `-BaseBranch` (default: main) | `{status, branch, ...}` — status: `worktree`/`error`/`dirty`/`up-to-date`/`success`/`conflicts` | `/rebase-on-main` |
| `git-merge-cleanup.ps1` | `-Branch` | `{merged, pushed, branch, localDeleted, remoteDeleted, worktreeRemoved, worktreeName}` | `/rebase-on-main` |

#### File & Process Operations

| Script | Params | Output | Used by |
| --- | --- | --- | --- |
| `remove-path.ps1` | `-Path`, `-Force` (switch) | `{removed, path, type}` | (replaces `rm -rf`) |
| `move-path.ps1` | `-Source`, `-Destination`, `-Force` (switch) | `{moved, source, destination}` | (replaces `mv`) |
| `npm-command.ps1` | `-Command`, `-WorkingDirectory` (optional) | `{success, exitCode, output}` | (replaces `npm ...`) |
| `node-run.ps1` | `-Script`, `-WorkingDirectory` (optional) | `{success, exitCode, output}` | (replaces `node ...`) |

#### Notifications

| Script | Params | Output | Used by |
|--------|--------|--------|---------|
| `notify.ps1` | (none) | (none, side-effects only) | `Stop` and `Notification` hooks |

#### Config Sync

| Script | Params | Output | Used by |
|--------|--------|--------|---------|
| `sync-config.ps1` | `-Message` | `{committed, pushed, hash, message}` | `/claude-push` |
| `pull-config.ps1` | (none) | `{pulled, before, after, commits}` | `/claude-pull` |

#### Settings

| Script | Params | Output | Used by |
|--------|--------|--------|---------|
| `settings-add-rule.ps1` | `-Rule` | `{added, exists, rule}` | `/allow` |

### Calling Scripts from Commands

Commands invoke scripts via bash (Claude Code runs in a bash shell on Windows):

```bash
powershell.exe -NoProfile -File "$HOME/.claude/scripts/<name>.ps1" -Param "value"
```

For long-running scripts (e.g., `launch-vscode.ps1` which waits 5 seconds), use `run_in_background` so Claude can continue with other steps.

### Settings and Permissions

`settings.json` controls three things:

#### 1. Permission Allow List

Glob patterns for auto-accepted tool calls. The `allow` array uses `ToolName(glob)` format:

**Bash commands** — approved by category to auto-accept workflow commands while gating destructive/network/package operations:

- **Git**: `Bash(git *)`, `Bash(cd * && git *)`
- **Build tools**: `Bash(dotnet *)`
- **Scripts**: `Bash(powershell.exe -NoProfile -File *)`, `Bash(powershell.exe -NoProfile -ExecutionPolicy *)`
- **Windows Terminal**: `Bash(wt *)`
- **Launchers**: `Bash(start *)`, `Bash(code *)`
- **GitHub CLI**: `Bash(gh *)`
- **Utilities**: `Bash(echo *)`, `Bash(ls *)`, `Bash(mkdir *)`, `Bash(sleep *)`, `Bash(npm *)`

**What still prompts**: `rm`/`del` (file deletion), `pip install` (packages), `powershell.exe -Command` (arbitrary PowerShell), and anything else unexpected.

**File operations** — use `**` globs for portability (no absolute paths needed):

- `Edit(**/Code/**)`, `Edit(**/Documents/**)` — edits in `Code/` or `Documents/` directories
- `Edit(**/plans/**)`, `Write(**/plans/**)` — plan files (created by `/plan`)
- `Edit(**/.claude/**)`, `Write(**/.claude/**)` — claude config
- `Read(**)`, `Glob(**)` — unrestricted reads and file search

#### 2. Default Mode

`"acceptEdits"` auto-accepts Edit tool calls. Write and Bash check the allow list. Other options: `"ask"` (prompt for everything) or `"auto"` (auto-accept everything).

#### 3. Hooks

Shell commands triggered on events:

```json
{
  "hooks": {
    "Stop": [{"hooks": [{"type": "command", "command": "powershell.exe ... scripts/notify.ps1"}]}],
    "Notification": [{"matcher": "permission_prompt", "hooks": [{"type": "command", "command": "powershell.exe ... scripts/notify.ps1"}]}]
  }
}
```

### Git Repository Architecture

`~/.claude/` IS the git repo, cloned from <https://github.com/Mikkelsv/claude-config.git>.

- `.gitignore` excludes Claude-managed directories (e.g., `projects/`, `todos/`, `worktrees/`) and machine-specific files.
- `settings.json` is gitignored because hooks contain machine-specific paths. Use `settings.template.json` as the portable template — copy it to `settings.json` on a new machine and replace `<USERPROFILE>` in the hook commands. Permission globs use `**` patterns and need no adjustment.
- Everything else (commands, scripts, rules, templates, CLAUDE.md, notify.ps1) is tracked in git.

To sync: `git pull` to update, `git commit` and `git push` after changes.

### Notification Hook

`scripts/notify.ps1` uses P/Invoke (`FlashWindowEx`) to flash the Claude desktop app taskbar icon and `SystemSounds.Asterisk` to play a sound. Behavior adapts: foreground windows flash 3 times briefly; background windows flash continuously until focused. It fires on:

- `Stop` — when Claude finishes a task
- `Notification` with `permission_prompt` matcher — when Claude needs user approval

### Global Rules

Rules in `~/.claude/rules/` are always loaded into every Claude session:

- **user-config.md** — Check for existing user-level config before creating project-local duplicates. Prefer PowerShell scripts over inline shell commands. Keep this README up to date.
- **worktree-cleanup.md** — After any merge into main, auto-detect and remove associated worktrees.
- **claude-folder.md** — Use `Claude/` over `.claude/` for editable project content. Skills, docs, and scripts that get edited frequently live in `Claude/` at the project root to avoid permission prompts.
- **todo-surfacing.md** — Surface unchecked `/todo` items at natural conversation moments without nagging.
- **no-commit.md** — Never commit (user manages commits). Exception: commits inside `~/.claude/`.
- **no-pipes.md** — Avoid chaining shell commands; use dedicated tools or separate Bash calls.
- **plans-location.md** — Plan files go in project root `plans/`, never `.claude/plans/`.
- **prefer-clickable-prompts.md** — Prefer `AskUserQuestion` with 2–3 clickable options over open-ended questions. Include an escape hatch for custom input.
- **no-read-generated-css.md** — Never read Tailwind CSS output files (`wwwroot/app.tailwind.css`). They are build artifacts — regenerate via `dotnet build` instead. During conflicts, accept either side and rebuild.

### How to Add a New Command or Skill

**Choose the right format:**

- **Command** (`commands/<name>.md`) — for simple flows that only reference shared global scripts.
- **Skill** (`skills/<name>/SKILL.md`) — for complex flows that benefit from co-located scripts. Use `${CLAUDE_SKILL_DIR}/scripts/...` to reference skill-local scripts.
- **Template** (`templates/skills/<name>/SKILL.md`) — for skills that will be scaffolded per-project by `/claude-sync`. Include `{PLACEHOLDER}` markers for project-specific values and a Customization Guide section.

**Steps:**

1. **Create scripts**:
   - **Shared scripts** → `~/.claude/scripts/` (reusable across commands/skills)
   - **Skill-local scripts** → `~/.claude/skills/<name>/scripts/` (specific to one skill)
   - Accept params via `param()` block, output JSON via `ConvertTo-Json -Compress`, non-zero exit for errors
   - Use `git rev-parse --path-format=absolute --git-common-dir` instead of `--show-toplevel` if the script might run from inside a worktree

2. **Create the command or skill**:
   - Document each script call with the full `powershell.exe -NoProfile -File ...` invocation
   - Show the expected JSON output format so Claude knows what to parse
   - Keep decision logic (user questions, flow control) in the prompt
   - Keep mechanical execution (git, file I/O, process management) in scripts

3. **Add permission rules** if the script touches paths not already covered by the allow list.

4. **Update this README** — add to the human section and the script catalog.

### Key Conventions

- **JSON output** — Every script outputs JSON. Use `ConvertTo-Json -Compress` for single-line output that's easy to parse.
- **Error handling** — Non-zero exit code = failure. Use `Write-Error` for error messages.
- **Worktree-safe repo root** — Use `git rev-parse --path-format=absolute --git-common-dir` and strip `/.git` to find the main repo root. `--show-toplevel` returns the worktree root when inside a worktree, which breaks path calculations.
- **VS Code new window** — Always use `code --new-window` to prevent hijacking existing VS Code instances.
- **Delayed VS Code settings** — VS Code extensions (e.g., Ionide) rewrite `.vscode/settings.json` on workspace init. Write color settings after a 5-second delay to avoid being overwritten.
- **Self-contained project skills** — Project-level skills (scaffolded by `/claude-sync`) include their own scripts. No dependency on `~/.claude/scripts/` — this keeps them portable across machines and contributors.
