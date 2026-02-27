# Worktree Manager

**Execute every step below in order. No step may be skipped.**

Input: `$ARGUMENTS` (optional — feature name, description, or existing worktree name).

Scripts directory: `~/.claude/scripts`

## Quick Entry Check

**First**, check if the session is already inside a worktree (the current working directory is under `.claude/worktrees/`). If so, `cd` back to the main repo root (the worktree's parent path above `.claude/worktrees/`) so the session is no longer inside the worktree. Then continue to **Step 1** as normal — do NOT skip to Launch.

## Step 1: List & Choose

Run `get-worktrees.ps1` to get all non-main worktrees as JSON:

```bash
powershell.exe -NoProfile -File "$HOME/.claude/scripts/get-worktrees.ps1"
```

Returns: `[{"name": "...", "path": "...", "branch": "...", "commit": "...", "color": "#hex"}]`

If `$ARGUMENTS` matches the `name` or `branch` of an existing worktree, skip to **Enter Existing Worktree** with that worktree selected.

If `$ARGUMENTS` is non-empty but doesn't match an existing worktree, skip straight to **Create New Worktree** — no question, no listing.

If `$ARGUMENTS` is empty, use `AskUserQuestion` to present options:

1. **One option per existing worktree**. Label: `name (branch)`. Description: the path.
2. **Second-to-last: "Create new worktree"** — description: "Create a new worktree with a new branch"
3. **Last: "Remove a worktree"** — description: "Remove an existing worktree and optionally delete its branch"

If `$ARGUMENTS` is empty and no worktrees exist, prompt for a feature name/description, then go to **Create New Worktree**.

---

## Enter Existing Worktree

The user picked an existing worktree. Use its `color` from the `get-worktrees.ps1` output. If null, pick one from the palette.

Jump to the **Launch** section with the worktree path and color.

---

## Create New Worktree

If the user chose "Create new worktree" (or there were no existing worktrees), prompt for a feature name/description if `$ARGUMENTS` was empty.

### Branch Name

Resolve the branch name silently — never prompt for confirmation.

- Prefix: always `wt-`
- If input is already valid (`lowercase-hyphen-separated`, max 5 words, `a-z0-9-` only): use `wt-{input}`.
- Otherwise: extract 2–5 keywords from the description, join with hyphens, prefix with `wt-`.
- Example: `wt-fence-rendering`, `wt-grid-memory-fix`

### Color Palette

Pick one color at random from the palette below — each worktree should feel distinct. Avoid colors already used by existing worktrees (from `get-worktrees.ps1` output):

| Name       | Hex       |
|------------|-----------|
| Forest     | `#2d4a22` |
| Ocean      | `#1e3a5f` |
| Plum       | `#4a2545` |
| Rust       | `#5c3a1e` |
| Slate      | `#2e4045` |
| Wine       | `#4a1c2e` |
| Olive      | `#3d3d1e` |
| Indigo     | `#2b2d5e` |

### Process

1. Resolve the branch name from input as described above.
2. Create the worktree:

   ```bash
   powershell.exe -NoProfile -File "$HOME/.claude/scripts/create-worktree.ps1" -Name "<name>" -Branch "wt-<name>"
   ```

   Returns JSON: `{"path": "...", "branch": "wt-...", "commit": "..."}`

3. Confirm to the user: worktree path, branch name, parent commit.
4. Jump to the **Launch** section with the worktree path and chosen color.

---

## Remove a Worktree

If no worktrees exist (from `get-worktrees.ps1`), tell the user and stop.

Otherwise, use `AskUserQuestion` to let them pick which worktree to remove. Then **ask for confirmation** before proceeding.

```bash
powershell.exe -NoProfile -File "$HOME/.claude/scripts/remove-worktree.ps1" -Name "<name>" -DeleteBranch
```

Omit `-DeleteBranch` if the user wants to keep the branch. Returns JSON: `{"removed": "...", "branch": "...", "branchDeleted": true/false}`

---

## Launch

This is the final step for both **Enter** and **Create** flows.

1. **Open VS Code + apply color** (run in background — takes ~5s for delayed color write):

   ```bash
   powershell.exe -NoProfile -File "$HOME/.claude/scripts/launch-vscode.ps1" -Path "<worktree-path>" -Color "#<hex>"
   ```

2. **Open new Claude terminal**:

   ```bash
   powershell.exe -NoProfile -File "$HOME/.claude/scripts/launch-claude-tab.ps1" -Path "<worktree-path>" -Color "#<hex>"
   ```

3. **Return to main repo**: If the current working directory is inside a worktree, `cd` back to the main repo root. This ensures the session can immediately run `/worktree` again.
4. **Done**: Tell the user the new Claude instance is launching in the worktree. Do NOT exit — the user may want to create more worktrees or continue working.
