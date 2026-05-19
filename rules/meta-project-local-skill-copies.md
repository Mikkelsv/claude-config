# Project-Local Skill Copies for Shared Repos

Some projects ship local copies of global skills in `.claude/skills/` so colleagues who don't have personal `~/.claude/` config get the workflow on clone. Treat these as **deliberate forks** — not duplicates to delete, not fire-and-forget either.

## When local copies are warranted

- Repo is shared with developers who may not have `~/.claude/` set up.
- Skill is integral to project workflow (build, plan, implement, commit, rebase).

## Device-agnostic requirement (project-local copies only)

Local copies must work on every colleague's OS — Mac, Linux, Windows.

- **PowerShell**: use `pwsh` (PowerShell 7, cross-platform), not `powershell.exe` (Windows-only). Scripts should be PS 7-compatible — avoid PS 5.1-only features.
- **Paths**: relative only (`.claude/scripts/...`), no `~/.claude/...` or `C:\` references.
- Personal global config (`~/.claude/`) is not bound by this — own-machine choices are the user's business.

## Maintenance

Local copies drift from global when global is updated. Treat the local copy as a fork on a sync cadence: when a global skill changes, propagate to local copies in the shared repo. Otherwise colleagues run stale behavior without knowing it.
