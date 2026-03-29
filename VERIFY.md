# Post-Migration Verification

Run through these checks to verify the junction-based config restructure works correctly. Report results as a checklist.

## 1. Rules Load

Read `~/.claude/rules/` and confirm all 10 rules are accessible:
- user-config.md
- config-version.md (NEW)
- claude-folder.md
- no-commit.md
- no-pipes.md
- no-read-generated-css.md
- plans-location.md
- prefer-clickable-prompts.md
- todo-surfacing.md
- worktree-cleanup.md

## 2. Commands Accessible

Confirm all 7 commands exist in `~/.claude/commands/`:
- allow.md
- claude-pull.md
- claude-push.md
- claude-setup.md
- handoff.md
- pickup.md
- todo.md

## 3. Junction Chain Works

Verify the junction chain resolves correctly:
- `~/.claude/CLAUDE.md` exists and mentions `~/Documents/Code/claude-config/`
- `~/.claude/scripts/notify.ps1` exists (resolves through inner junction to `Claude/scripts/`)
- `~/.claude/templates/skills/build/SKILL.md` exists (resolves through inner junction to `Claude/templates/`)

## 4. Skill Shells Redirect

Read the thin shells and confirm they redirect to `Claude/skills/`:
- `~/.claude/skills/rebase-on-main/SKILL.md` — should contain only frontmatter + redirect to `~/Documents/Code/claude-config/Claude/skills/rebase-on-main/SKILL.md`
- `~/.claude/skills/claude-refactor/SKILL.md` — same pattern

Read the full implementations and confirm `${CLAUDE_SKILL_DIR}` has been replaced:
- `~/Documents/Code/claude-config/Claude/skills/rebase-on-main/SKILL.md` — should reference `~/Documents/Code/claude-config/Claude/skills/rebase-on-main/scripts`, NOT `${CLAUDE_SKILL_DIR}`

## 5. Git Repo Root

Run `git -C ~/Documents/Code/claude-config status` and confirm it shows a clean working tree (or expected changes). Confirm `~/.claude/` is NOT a git root — running `git -C ~/.claude rev-parse --git-dir` should fail or point elsewhere.

## 6. Path Updates

Verify key path references were updated:
- Read `~/Documents/Code/claude-config/Claude/scripts/sync-config.ps1` — `$repoRoot` should be `$env:USERPROFILE\Documents\Code\claude-config`
- Read `~/Documents/Code/claude-config/Claude/scripts/pull-config.ps1` — same
- Read `~/Documents/Code/claude-config/Claude/skills/rebase-on-main/scripts/git-merge-cleanup.ps1` — `$scriptsDir` should reference `Documents\Code\claude-config\Claude\scripts`
- Read `~/Documents/Code/claude-config/dotclaude/commands/claude-push.md` — git commands should use `~/Documents/Code/claude-config`

## 7. Prompt-Free Editing

Edit a rule file through the REAL path (not `~/.claude/`):
- Open `~/Documents/Code/claude-config/dotclaude/rules/no-pipes.md`
- Add a blank comment line `<!-- verified -->` at the end
- Confirm this did NOT trigger a permission prompt
- Remove the comment line

Then edit a script through the Claude/ path:
- Open `~/Documents/Code/claude-config/Claude/scripts/notify.ps1`
- Add a blank comment line `# verified` at the end
- Confirm this did NOT trigger a permission prompt
- Remove the comment line

## 8. Versioning System

- Read `~/Documents/Code/claude-config/Claude/config-version.json` — should show version `1.0.0`
- Confirm the pre-commit hook exists at `~/Documents/Code/claude-config/.git/hooks/pre-commit`
- Read it and confirm it detects changes to `dotclaude/rules`, `dotclaude/commands`, `dotclaude/skills`, `Claude/scripts`, `Claude/skills`, `Claude/templates`

## 9. Auto-Managed Directories

Confirm Claude Code's auto-managed directories survived the migration:
- `~/.claude/projects/` exists and is non-empty
- `~/.claude/sessions/` exists
- `~/.claude/settings.json` exists

## 10. Hooks

Check that `~/.claude/settings.json` hook paths resolve:
- The hook command references `scripts/notify.ps1` — verify the file exists at the resolved path through the junction chain

## Results

Report a summary table:

| Check | Status |
|-------|--------|
| Rules load | ? |
| Commands accessible | ? |
| Junction chain | ? |
| Skill shells | ? |
| Git repo root | ? |
| Path updates | ? |
| Prompt-free editing | ? |
| Versioning system | ? |
| Auto-managed dirs | ? |
| Hooks | ? |

Flag any failures with details on what went wrong.
