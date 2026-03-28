---
name: claude-refactor
description: Audit and improve Claude skills, commands, scripts, and configuration
---

# Claude Config Audit & Refactor

Audit all skills, commands, scripts, rules, and templates across the global config
and the current project. Check for bugs, stale references, misplaced items,
missing permissions, script extraction opportunities, template drift, and
underused parallelization. Fix what can be fixed directly; propose the rest.

Scripts directory: `~/.claude/scripts`

---

## Phase 1 — Inventory

Read all configuration files to build a complete picture. Launch two parallel
agents to speed up the read phase:

**Agent 1 — Global config:**

- `~/.claude/skills/` — all SKILL.md files and co-located scripts
- `~/.claude/commands/` — all command files
- `~/.claude/scripts/` — all PowerShell scripts (read each, note params + output)
- `~/.claude/rules/` — all rule files
- `~/.claude/templates/skills/` — all template SKILL.md files and supporting files
- `~/.claude/README.md`
- `~/.claude/settings.json` (permissions and hooks)
- `~/.claude/settings.template.json`
- `~/.claude/CLAUDE.md`

For each item, record: file path, purpose, and any references to other files,
scripts, or skills.

**Agent 2 — Project config** (skip if not in a project directory):

- `.claude/skills/` — all SKILL.md files and co-located scripts
- `.claude/commands/` — all command files (if any)
- `.claude/rules/` — all rule files
- `.claude/docs/` — all doc files
- `CLAUDE.md`

For each item, record the same as above, plus note which global template it was
scaffolded from (match by skill name).

**When both agents return**, merge the inventories and proceed to Phase 2.

---

## Phase 2 — Review

The 7 audit categories are grouped into 3 independent tracks. Launch all 3 as
**background agents** in a single message. Each agent receives the Phase 1
inventory summary and reads the relevant files itself.

### Agent A — Content Quality

#### 2.1 Correctness & Bugs

For each SKILL.md (global and project):

- Does the logic flow make sense? Look for contradictions, unreachable branches,
  or impossible states.
- Do script invocations match actual script parameters? Check `param()` blocks
  against the calling syntax in SKILL.md.
- Are there references to files, skills, or scripts that no longer exist?
- Do JSON output descriptions in SKILL.md match what the script actually outputs?

For each command:

- Does it reference scripts that exist?
- Are the described input/output formats accurate?

For each script:

- Does it output valid JSON via `ConvertTo-Json -Compress`?
- Does it use non-zero exit codes for errors?
- Does it avoid absolute user paths? (Should use `$env:USERPROFILE`,
  `$PSScriptRoot`, or `$HOME`)

#### 2.2 Script Extraction Opportunities

Scan all SKILL.md files and commands for inline shell work that could become a
reusable script:

- **Candidate**: Multi-line bash blocks, command construction, output parsing,
  file management. Especially if the same pattern appears in more than one skill.
- **Not a candidate**: Single-line script invocations, `git` one-liners, simple
  `preview_*` calls.

For each candidate: where it appears, what it does, proposed script name, whether
shared (`~/.claude/scripts/`) or skill-local (`scripts/`).

### Agent B — Structure & Permissions

#### 2.3 Permission Optimization

Read `~/.claude/settings.json` and the `permissions.allow` list. Walk through
every skill and command, identifying operations that would trigger a permission
prompt:

- `Bash(...)` calls not covered by existing glob patterns
- `Write(...)` or `Edit(...)` to paths outside the covered globs

For each missing pattern: is it safe to auto-allow? Draft the glob pattern.
Check whether `settings.template.json` should also be updated (only if portable).

#### 2.4 Placement Audit

For each skill, evaluate global vs project-level placement:

**Should be global** — works in any project, no project-specific references.
**Should be project-level** — references project-specific build commands, test
frameworks, ports, architecture.

Check for: global skills with project-specific assumptions, project skills that
are entirely generic, commands that should be skills (complex flows needing
co-located scripts), skills that should be commands (simple flows using shared
scripts only).

#### 2.5 Agent & Parallelization Audit

For each skill, evaluate whether it could better leverage background agents:

- Are there phases that are **read-only and independent**? These can run as
  parallel agents (e.g., exploration, lint checks, multiple file reads).
- Are there phases that are **write-independent**? (Touch different files with no
  shared state — safe to parallelize in worktrees.)
- Does the skill already use agents? If so, is the grouping optimal?
- Could sequential steps be restructured into a parallel dispatch + sequential
  merge pattern?

Flag skills where parallelization would meaningfully reduce wall-clock time
(not micro-optimizations). Note the specific phases and proposed agent structure.

### Agent C — Sync & Documentation

#### 2.6 Template Sync

For each project skill with a corresponding global template (matched by directory
name):

1. Compare structure and content between the two.
2. **Project → template**: Generic improvements in the project skill that would
   benefit all future projects. These should propagate back.
3. **Template → project**: Template updates not yet in the project skill. These
   could be pulled in.
4. **Project-specific customizations**: Expected divergence. Do not flag.

#### 2.7 README Accuracy

Compare `~/.claude/README.md` against the actual inventory:

- All commands, skills, scripts, and rules listed?
- Descriptions accurate and up to date?
- Directory layout section accurate?
- Script catalog tables complete with correct params and output?
- Entries for items that no longer exist?

---

**When all 3 agents return**, merge their findings into a single list. Proceed to
Phase 3.

---

## Phase 3 — Fix

This phase will touch many files in `~/.claude/`. Use `AskUserQuestion` to ask
the user if they want to temporarily switch to auto mode to skip permission
prompts. If they agree, update `~/.claude/settings.json` to set
`"defaultMode": "auto"`.

### 3.1 Auto-fixes (apply directly)

Low-risk, clearly correct changes:

- **Stale references**: Remove or update references to files/scripts/skills that
  no longer exist.
- **Script parameter mismatches**: Update SKILL.md invocations to match actual
  script `param()` blocks.
- **JSON output format mismatches**: Update SKILL.md descriptions to match actual
  script output.
- **Missing permission patterns** (assessed as safe in 2.3):

  ```bash
  powershell.exe -NoProfile -File "$HOME/.claude/scripts/settings-add-rule.ps1" -Rule "<pattern>"
  ```

  If the pattern is portable, also update `settings.template.json`.

- **README corrections**: Fix inaccurate descriptions, add missing entries,
  remove stale entries.

### 3.2 User decisions (ask via `AskUserQuestion`)

For each of these, present concrete options:

- **Placement changes**: "Skill X is global but references project-specific
  paths. Move to template / Make generic / Skip?"
- **Script extraction**: "This inline bash in skill X could be a script. Extract
  to shared / Extract to skill-local / Keep inline?"
- **Template sync**: "Project skill X has this generic improvement. Propagate
  back to template / Keep local / Skip?"
- **Agent parallelization**: "Skill X has independent phases A and B that could
  run as parallel agents. Restructure / Keep sequential / Skip?"

Apply confirmed changes immediately after each decision.

---

## Phase 4 — Documentation

After all fixes:

1. Update `~/.claude/README.md` to reflect every change made in Phase 3:
   new/removed skills, updated descriptions, directory layout, script catalog.
2. If rules were added or modified, update the Global Rules section.
3. If `settings.template.json` was modified, note changes for the user (they may
   need to re-sync on other machines).

---

## Phase 5 — Summary & Push

If auto mode was enabled in Phase 3, switch `~/.claude/settings.json` back to
`"defaultMode": "acceptEdits"` now.

Print a structured summary:

### Findings

| Category | High | Medium | Low |
| --- | --- | --- | --- |
| Correctness & bugs | N | N | N |
| Script opportunities | N | N | N |
| Permission gaps | N | N | N |
| Placement issues | N | N | N |
| Agent usage | N | N | N |
| Template drift | N | N | N |
| README accuracy | N | N | N |

### Changes Made

List each change: **What** — brief description, **Where** — file path(s),
**Category** — audit category.

### Deferred Items

Findings the user chose to skip, with reason and suggested follow-up.

### Settings Template

If `settings.template.json` was updated, list the changes for cross-machine sync.

---

Use `AskUserQuestion` to prompt:

- **Push now** — run `/claude-push` to commit and sync changes
- **Review first** — stop here so you can review before pushing
- **Done** — no push needed
