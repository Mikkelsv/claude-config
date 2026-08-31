Check for session handoff context from a previous session and resume where it left off.

**Execute mechanically.** Follow the steps; no need to weigh alternatives or deliberate.

## Steps

1. **Find handoff files** — Look in the project's memory directory for any files matching `project_session-handoff*.md`. Also check MEMORY.md for "Session Handoff" pointers.

2. **If no handoff files found** — Tell the user: "No session handoff found. Nothing to pick up."

3. **If one handoff file found** — Read it, summarize the context to the user, then delete the file and remove its pointer from MEMORY.md.

4. **If multiple handoff files found** — List them all with a one-line summary of each (read the `description` from frontmatter). Ask the user which one(s) to pick up using `AskUserQuestion`. Then read the selected file(s), summarize the context, delete the picked-up file(s), and remove their pointers from MEMORY.md.

## After pickup

Once context is loaded, briefly summarize:
- What was done in the previous session
- What's pending or unfinished
- Any open decisions or blockers
- Current branch and state of the repo (`git status`, `git branch`)

## Release a locked worktree

Only when the handoff named a worktree, or `git worktree list` shows the branch you're resuming checked out elsewhere. Git allows one working tree per branch, so `git checkout <branch>` in the main directory fails until that worktree is gone.

1. Confirm this session is in the main checkout — `git rev-parse --git-dir` and `--git-common-dir` match. If they differ you're inside a worktree yourself; say so and stop.
2. Check the worktree is clean: `git -C <worktree-path> status --porcelain`. Report any output.
3. Offer the choice with `AskUserQuestion`: remove the worktree and check the branch out here (recommended when clean), or leave it and work in the worktree instead.
4. On approval: `git worktree remove <worktree-path>`, then `git checkout <branch>`.

Never pass `--force` to `git worktree remove`, and never use `checkout --ignore-other-worktrees`. If removal refuses, surface the reason and let the user decide.

Then ask: "What would you like to work on?"

## Rules

- Always delete handoff files after reading them — they're single-use transfer documents, not permanent memory.
- Always clean up the MEMORY.md pointers for deleted handoff files.
- If the handoff references a plan file, check if it still exists and mention its path.
- Keep the summary concise — the user was there for the previous session, they just need orientation.
