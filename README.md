# Claude Code Setup

Personal Claude Code configuration with slash commands and PowerShell automation, stored in a git repo. Commands handle the decision-making while PowerShell scripts do the mechanical execution, communicating via JSON.

## For Humans

### Commands

#### `/worktree [name]`

Manage git worktrees for parallel feature development. Each worktree gets its own VS Code window and Claude Code terminal, color-coded so you can tell them apart at a glance.

- `/worktree fence-rendering` — creates a new worktree with branch `wt-fence-rendering`, opens VS Code and Claude in it
- `/worktree` (no args) — lists existing worktrees, lets you enter one, create a new one, or remove one
- `/worktree fence-rendering` (when it already exists) — re-enters the existing worktree

#### `/code`

Opens a fresh VS Code window and Claude Code terminal at the current directory, both with a random color theme from a palette of 8 dark colors. Useful for spinning up a new colored workspace quickly.

- `/code` — picks a random color, opens VS Code + Claude terminal, exits the current session

#### `/build [task]`

Build and serve the application. Optionally execute a coding task first (bug fix, feature, etc.), then automatically kill any existing dev server, rebuild, and launch a fresh server in a new terminal tab with the browser open.

- `/build` — just build and serve
- `/build fix the horizon clipping bug` — fix the bug first, then build and serve
- Also auto-triggers after any code changes Claude makes, even without typing `/build`

#### `/rebase-on-main`

Full rebase workflow: checks for uncommitted changes, fetches and rebases onto main, resolves conflicts autonomously, verifies the build, and force-pushes with lease. Optionally merges the feature branch back into main with branch renaming and worktree cleanup.

- `/rebase-on-main` — walks through the full flow with prompts at decision points

#### `/refactor`

Code quality and separability review for the current feature branch. Analyzes all changes since the branch diverged from main, evaluates naming, abstractions, duplication, error handling, and commit hygiene, then produces a verdict (Ship it / Minor tweaks / Refactor / Split).

- `/refactor` — review-only by default, offers to apply fixes if issues are found

#### `/push-claude`

Commit and push all pending changes in the `~/.claude/` config repo. Automatically generates a commit message based on the diff.

- `/push-claude` — stages everything, commits, and pushes

#### `/allow [prompt]`

Parse a blocked permission prompt and add a generalized allow rule to `settings.json`. Accepts input in many formats: paste the full prompt text, a tool call like `Bash(wt new-tab ...)`, a raw command, a path like `Write(.vscode/settings.json)`, or a plain English description. Asks for confirmation before adding.

- `/allow Write(~/.claude/scripts/*)` — generalizes and adds a rule
- `/allow` (no args) — prompts you to paste the blocked action

### Setup

Config is a git repo at <https://github.com/Mikkelsv/claude-config.git>, cloned directly as `~/.claude/`. For a fresh machine, run `setup.ps1` to clone and configure. To update, pull from the remote. After making changes, commit and push.

### Notifications

When Claude finishes a task or hits a permission prompt, Windows Terminal flashes its taskbar icon and plays a notification sound (`scripts/notify.ps1`). Behavior adapts: if the terminal is in the foreground, it flashes 3 times briefly; if in the background, it flashes continuously until focused.

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
    build.md
    code.md
    rebase-on-main.md
    refactor.md
    push-claude.md
    worktree.md
  scripts/                               # PowerShell automation (mechanical execution)
    escape-worktree.ps1                   # Detect linked worktree, return main repo path
    get-worktrees.ps1
    create-worktree.ps1
    remove-worktree.ps1
    launch-vscode.ps1
    launch-claude-tab.ps1
    launch-worktree.ps1                  # Inner launcher (clears env, starts claude)
    notify.ps1                           # Notification hook (taskbar flash + sound)
    kill-port.ps1
    launch-dev-server.ps1
    settings-add-rule.ps1
    sync-config.ps1                    # Stage, commit, push all config changes
    git-branch-scope.ps1
    git-preflight.ps1
    git-merge-rename.ps1
  rules/                                 # Global rules (always active)
    user-config.md                       # Config conventions, prefer scripts, keep README updated
    worktree-cleanup.md                  # Auto-remove worktrees after merge
```

### Design Pattern: Commands + Scripts

The core principle: **commands are Claude orchestration, scripts are mechanical execution**.

- **Commands** (`.md` files in `commands/`) contain decision logic, user interaction (`AskUserQuestion`), and flow control. They tell Claude *when* and *why* to do things.
- **Scripts** (`.ps1` files in `scripts/`) contain shell operations: git commands, file I/O, process management, launching applications. They do the *what*.
- **Communication** is via JSON on stdout. Every script outputs a JSON object so Claude can parse the result and make decisions based on it. Non-zero exit codes signal errors.

This separation means:

1. Claude spends tokens on decisions, not on constructing shell commands.
2. Scripts are testable independently of Claude.
3. Common operations (launching VS Code, managing worktrees) are reused across multiple commands.

### Script Catalog

#### Worktree Management

| Script | Params | Output | Used by |
|--------|--------|--------|---------|
| `get-worktrees.ps1` | (none) | `[{name, path, branch, commit, color}]` | `/worktree` |
| `create-worktree.ps1` | `-Name`, `-Branch` | `{path, branch, commit}` | `/worktree` |
| `remove-worktree.ps1` | `-Name`, `-DeleteBranch` (switch) | `{removed, branch, branchDeleted}` | `/worktree` |

#### Launching

| Script | Params | Output | Used by |
|--------|--------|--------|---------|
| `launch-vscode.ps1` | `-Path`, `-Color` | (none, run in background) | `/worktree`, `/code` |
| `launch-claude-tab.ps1` | `-Path`, `-Color` | (none) | `/worktree`, `/code` |
| `launch-worktree.ps1` | `-WorktreePath`, `-TabColor` | (inner launcher, no output) | `launch-claude-tab.ps1` |
| `launch-dev-server.ps1` | `-Project`, `-Port` | `{launched, url}` | `/build` |
| `kill-port.ps1` | `-Port` | `{killed, pids}` or `{killed: false, reason}` | `/build` |

#### Git Operations

| Script | Params | Output | Used by |
|--------|--------|--------|---------|
| `escape-worktree.ps1` | (none) | `{isWorktree, mainRepoRoot, branch}` | `/rebase-on-main` |
| `git-preflight.ps1` | (none) | `{branch, isMain, hasChanges, staged, unstaged, untracked}` | `/rebase-on-main` |
| `git-branch-scope.ps1` | `-BaseBranch` (default: main) | `{branch, base, hasMergeBase, isAhead, commitCount, commits[], files[]}` | `/refactor` |
| `git-merge-rename.ps1` | `-Branch` | `{merged, pushed, renamed, originalBranch, mergedBranch, worktreeRemoved, worktreeName}` | `/rebase-on-main` |

#### Notifications

| Script | Params | Output | Used by |
|--------|--------|--------|---------|
| `notify.ps1` | (none) | (none, side-effects only) | `Stop` and `Notification` hooks |

#### Config Sync

| Script | Params | Output | Used by |
|--------|--------|--------|---------|
| `sync-config.ps1` | `-Message` | `{committed, pushed, hash, message}` | Any command editing `~/.claude/` |

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
- **Utilities**: `Bash(echo *)`, `Bash(ls *)`, `Bash(mkdir *)`, `Bash(sleep *)`

**What still prompts**: `rm`/`del` (file deletion), `curl`/`wget` (downloads), `npm install`/`pip install` (packages), `powershell.exe -Command` (arbitrary PowerShell), and anything else unexpected.

**File operations** — use `**` globs for portability (no absolute paths needed):

- `Edit(**/Code/**)` — edits in any `Code/` directory
- `Edit(**/.claude/**)`, `Write(**/.claude/**)` — claude config
- `Edit(**/.gitignore_global)`, `Write(**/.gitignore_global)` — global gitignore
- `Read(**)`, `Glob(**)` — unrestricted reads and file search

**What still prompts**: any tool call not matching a pattern. With `Bash(*)` this is rare; without it, unfamiliar or destructive commands are gated.

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
- Everything else (commands, scripts, rules, docs, CLAUDE.md, notify.ps1) is tracked in git.

To sync: `git pull` to update, `git commit` and `git push` after changes.

### Notification Hook

`scripts/notify.ps1` uses P/Invoke (`FlashWindowEx`) to flash the Windows Terminal taskbar icon and `SystemSounds.Asterisk` to play a sound. Behavior adapts: foreground windows flash 3 times briefly; background windows flash continuously until focused. It fires on:

- `Stop` — when Claude finishes a task
- `Notification` with `permission_prompt` matcher — when Claude needs user approval

### Global Rules

Rules in `~/.claude/rules/` are always loaded into every Claude session:

- **user-config.md** — Check for existing user-level config before creating project-local duplicates. Prefer PowerShell scripts over inline shell commands. Keep this README up to date.
- **worktree-cleanup.md** — After any merge into main, auto-detect and remove associated worktrees.
- **auto-mode-for-config.md** — When a task involves multiple `.claude/` edits, offer to temporarily switch to auto mode to skip permission prompts, then switch back when done.

### How to Add a New Command

1. **Create the script** in `~/.claude/scripts/`:
   - Accept params via `param()` block
   - Output JSON to stdout via `ConvertTo-Json -Compress`
   - Use non-zero exit codes for errors
   - Use `git rev-parse --path-format=absolute --git-common-dir` instead of `--show-toplevel` if the script might run from inside a worktree

2. **Create the command** in `~/.claude/commands/`:
   - Add `Scripts directory: ~/.claude/scripts` near the top
   - Document the script call with the full `powershell.exe -NoProfile -File ...` invocation
   - Show the expected JSON output format so Claude knows what to parse
   - Keep decision logic (user questions, flow control) in the command
   - Keep mechanical execution (git, file I/O, process management) in the script

3. **Add permission rules** if the script touches paths not already covered by the allow list.

4. **Update this README** — add the command to the human section and the script to the catalog.

### Key Conventions

- **JSON output** — Every script outputs JSON. Use `ConvertTo-Json -Compress` for single-line output that's easy to parse.
- **Error handling** — Non-zero exit code = failure. Use `Write-Error` for error messages.
- **Worktree-safe repo root** — Use `git rev-parse --path-format=absolute --git-common-dir` and strip `/.git` to find the main repo root. `--show-toplevel` returns the worktree root when inside a worktree, which breaks path calculations.
- **VS Code new window** — Always use `code --new-window` to prevent hijacking existing VS Code instances.
- **Delayed VS Code settings** — VS Code extensions (e.g., Ionide) rewrite `.vscode/settings.json` on workspace init. Write color settings after a 5-second delay to avoid being overwritten.
- **Claude terminal isolation** — The inner launcher (`launch-worktree.ps1`) clears the `CLAUDECODE` environment variable before starting `claude` to prevent nested-session crashes from inherited parent sessions.
