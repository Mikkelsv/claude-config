Write a session handoff summary to project memory so the next session can pick up where this one left off.

**Execute mechanically.** Follow the steps; no need to weigh alternatives or deliberate.

## Steps

1. **Gather context** — Review the conversation to identify:
   - What was accomplished (completed tasks, merged branches, fixes applied)
   - What was in progress or left unfinished
   - Key decisions made and their rationale
   - Open questions or design decisions the user mentioned
   - Any blockers or issues encountered (like this session's stale CWD)

2. **Detect a worktree** — Run `git rev-parse --git-dir` and `git rev-parse --git-common-dir`. If they differ, the session is in a linked worktree; capture `git rev-parse --show-toplevel` (worktree path) and `git rev-parse --abbrev-ref HEAD` (branch).

3. **Write handoff memory** — Create or update a `project_session-handoff.md` file in the project's memory directory using the standard memory frontmatter format with `type: project`. Structure it as:
   - **What was done** — bullet list of completed work
   - **What was NOT done** — anything in progress or deferred
   - **Key decisions / open questions** — design choices, user preferences mentioned
   - **Blockers** — if the session is ending due to an issue, describe it
   - **Worktree** — only when step 2 found one: the branch, its worktree path, and that `git worktree remove <path>` is required before the branch can be checked out in the main directory.

4. **Update MEMORY.md** — Add or update a "Session Handoff" pointer in the memory index.

5. **Inform the user** — Tell them the handoff is saved and they can start a new session. If the reason for handoff is a stale working directory, remind them to `cd` to the correct directory first. If step 2 found a worktree, say the branch is locked to it and `/pickup` will offer to release it.

## Rules

- Overwrite any existing `project_session-handoff.md` — there should only ever be one active handoff.
- Be concise. The next session needs orientation, not a transcript.
- Include branch names, commit hashes, or stash refs if relevant.
- If there's an active plan file, reference its path so the next session can resume it.
