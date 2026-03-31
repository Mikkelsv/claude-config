---
name: commit
description: Commit all changes with a typed message (FEAT/FIX/REFAC/DOCS), optionally amend small changes, and push
---

# Commit

Stage all dirty files, craft a typed commit message, and push. This skill **overrides the `no-commit` rule** when explicitly invoked.

## Commit Message Format

```
TYPE: Short message explaining the commit.

Optional body for larger changes.
```

**Types:**

| Type | When to use |
|------|-------------|
| FEAT | Big new features and functionality |
| FIX | Fixes or minor improvements to existing features |
| REFAC | Refactoring — renaming, moving files, cleaning up |
| DOCS | Documentation or Claude setup improvements |

## Flow

### 1. Preflight

Run `~/claude-config/Claude/scripts/git-preflight.ps1` to check branch and dirty state.

- If no changes exist, inform the user and stop.
- Note the current branch name for context.

### 2. Analyze changes

Run `git diff --stat` and `git diff` (staged + unstaged) to understand what changed. Also run `git diff --cached --stat` and `git ls-files --others --exclude-standard` to see staged and untracked files.

Read enough of the diff to determine:
- The appropriate TYPE
- A concise commit message (imperative mood, lowercase after the type prefix)
- Whether a body is needed (include one if changes touch 3+ files or do multiple things)

### 3. Check for amend opportunity

If the changes are very small (roughly ≤5 lines changed across ≤2 files), show the last commit message (`git log -1 --format=%B`) and ask the user via `AskUserQuestion`:

- **Amend last commit** — fold these changes into the previous commit
- **New commit** — create a separate commit

Skip this prompt and default to new commit if changes are larger.

### 4. Execute

Run the commit script:

```
~/claude-config/Claude/scripts/commit.ps1 -Message "TYPE: msg" [-Body "details"] [-Amend] -Push
```

Always pass `-Push`. If amending, the script uses `--force-with-lease`.

If the user provided `$ARGUMENTS`, use that as a hint for the message but still determine TYPE automatically. If the hint already includes a valid TYPE prefix, respect it.

### 5. Report

Show the commit hash and confirm it was pushed. If push failed, report it and suggest the user push manually.

## Rules

- **No Co-Authored-By line.** Use the user's git authentication only.
- **Do not confirm** the commit message — just commit and push immediately.
- **Always push** after committing.
- **Amend uses `--force-with-lease`** — never `--force`.
- **Message style:** imperative mood, concise. "Add user auth" not "Added user auth" or "Adding user auth".
