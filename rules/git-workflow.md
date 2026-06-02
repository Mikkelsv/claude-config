# Git Workflow: Default to Feature Branches

In project repos, default to feature branches rather than committing direct to main. Always check the current branch before committing; if on `main`, branch off (or ask) first.

## How to apply

- **Before any commit, check the current branch.** If on `main`, either:
  - Ask the user: "I'm on main — should I create a feature branch first?" (default: yes).
  - Or branch off: `git checkout -b <feature-branch-name>`.
- `/implement` creates `implement/{plan-name}` automatically before starting work.
- **`/commit`** is the preferred path for staging + committing — pushes to the current branch and bracket-tags the message.
- **When work is ready to merge, invoke `/rebase-on-main`.** Handles rebase + conflict resolution + build verify + merge prompt. Don't run raw `git merge` / `git push origin main`.
- The skill's "Cancel" path leaves the rebased branch in place if you prefer GitHub-side review via PR.

## Exceptions

- User explicitly asks for a direct-to-main change ("just commit this on main").
- Repos where main-only is the convention (e.g. solo config repos, single-author documentation repos) — confirm the convention is explicit, not assumed.
- Repo-state recovery operations (force-revert after a rule was already broken) — confirm with the user first.
