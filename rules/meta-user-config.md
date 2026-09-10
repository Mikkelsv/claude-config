# User-level Config Rules

Skill placement is covered by `meta-skill-tiers.md`. This file covers what's left.

## Always do

- **Check before duplicating.** Before creating project-level commands, rules, or docs, look for an existing equivalent in `~/.claude/commands/`, `~/.claude/rules/`, `~/.claude/docs/`. Extend rather than duplicate.
- **Prefer scripts over inline shell.** For mechanical work (git, file I/O, process management), add or update a script in `~/.claude/scripts/` instead of assembling inline commands. Reusable, testable, cheaper in tokens.
- **Keep the README current.** Adding or changing a command, script, rule, or skill means updating `~/.claude/README.md`. Improving a skill that a shared repo forks means the fork drifts — `/claude-sync` reports it; reconcile deliberately rather than inside a sync.

## Never do

- **Never hardcode absolute user paths.** Bash → `$HOME/.claude/...`; PowerShell → `$env:USERPROFILE\.claude\...` or `$PSScriptRoot`; permissions → `**` globs like `**/Code/**`; docs → `~/` shorthand. Only exception: `settings.json` hook commands need real paths, and that file is gitignored and per-machine.
- **Never run `setup.ps1` for routine changes.** It is fresh-machine bootstrap only.

## Config version check (session start)

Compare `~/.claude/config-version.json`'s `version` against the project's `.claude/local/config-version.json` `globalConfigVersion`. If they differ, mention it **once** — naming the two versions, how many skills drifted (compare each `templateHash` against the current template), and the **Project action** lines from the intervening `CHANGELOG.md` entries — then suggest `/claude-sync`. Informational only; never block work. No project version file means skip silently.

Writing the changelog and interpreting a version bump belong to `/claude-push`, not here.
