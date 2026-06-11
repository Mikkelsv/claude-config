# Claude Code Setup

Personal Claude Code configuration — slash commands, skills, rules, and PowerShell automation stored as a git repo at `~/.claude/`. Prompts orchestrate; scripts do the mechanical work and return JSON.

## For Humans

### Config Management

| Command | What it does |
|---|---|
| `/claude-sync [skills\|fresh]` | Pull global config, then scaffold or sync project skills — both templated skills and forked-global copies (per `meta-project-local-skill-copies`). First run = full scaffolding, later runs = targeted updates with drift detection. |
| `/claude-refactor` | Audit all skills, commands, scripts, rules, and templates. Fixes bugs, stale refs, permission gaps. |
| `/claude-push` | Commit and push config changes. Auto-bumps version on template changes. |
| `/allow-defer [prompt]` | Parse a blocked permission prompt and save a suggested allow rule to `~/.claude/suggestions/` for later review (non-interrupting). |
| `/allow-now [prompt]` | Parse a blocked permission prompt and append it to `~/.claude/settings.json` immediately. Use when you've decided and want the rule active now. |
| `/suggestions [type]` | Walk through pending suggestions in `~/.claude/suggestions/` one at a time and accept/skip/discard each. |
| `/capture-rule [idea]` | Capture a new code-quality, architecture, or workflow rule. Asks category + scope, drafts the rule, saves after your approval. |
| `/rule-candidate [idea]` | Append a rule candidate to the pending file. Lightweight — no commitment. Logged regardless of disposition. Promotion happens via `/capture-rule` or `/rule-review`. |
| `/rule-review` | Critical single-pass triage of pending candidates AND existing rules. Surfaces dupes, retires stale rules, proposes prefix migrations, promotes candidates. |

### Global Workflow Skills

Available in every project via the global config.

| Skill | What it does |
|---|---|
| `/build` | Build & serve. Reads project config from `.claude/local/skills/build/config.md`. |
| `/rebase-on-main` | Rebase on main, resolve conflicts, optionally merge/push. |
| `/study [topic]` | Codebase-first research — parallel sonnet agents map an area, synthesize into session context. No file output. Use before `/plan` when context is thin. |
| `/voice-mode [opening]` | Install a voice-input contract for the conversation — parse rambly dictated input for intent, not literal text. Stays on until "voice mode off" or `/implement`. Pair with `/plan` for big dictated planning sessions. |
| `/plan [feature]` | Collaborative feature discovery + plan creation. Skeptical senior-engineer persona — challenges premise, flags .NET/web anti-patterns. Phase 1 invokes `/study` when session context is thin. Offers `/plan-optimizer` for big features only. |
| `/plan-optimizer [plan]` | Second-pass refinement of a plan across 5 lenses (shape, data, performance reality-check, risk/feasibility, verifiability). Adds depth on data flow, caching contracts, GPU/CPU fit, testability, and risk sequencing. Overwrites the plan in place — `git diff` to see changes. |
| `/implement [plan] [--inline\|--agentic]` | Autonomous dev loop with build/test/refactor/audit gates. Mode resolves via CLI flag → plan front matter (`mode: agentic\|inline`) → auto-detect (agentic for >5 tasks). Agentic spawns one Sonnet sub-agent per task; plan file carries cross-task state via `**Implementation notes:**`. Final Audit uses `/audit-branch`. |
| `/audit-branch [focus]` | Branch-level audit across architecture, code, docs, tests, file-sizes, and comments. Phase 3a runs all 6 sub-skills in parallel against `main..HEAD`; Phase 3b only fires if `audit-file-sizes` flagged cap violations (file splits need a stable file structure to operate on). Self-paces 1-3 passes (decided after each pass). Hands disposition to `/resolve-audit-findings`. |
| `/resolve-audit-findings` | Per-finding triage. Spawns one Sonnet agent per finding (parallel) for full research; applies inline when confidence is high, defers substantial findings to `plans/post-audit-{slug}.md`. Typically invoked by `/audit-branch` Phase 5. |
| `/refactor-docs [focus]` | Documentation sync — checks docs match code changes. Usually invoked via `/audit-branch`. |
| `/audit-architecture [focus]` | Strict, skeptical architecture review (single-pass): boundaries, overengineering, alternatives. Usually invoked via `/audit-branch`. |
| `/audit-file-sizes [mode]` | Mechanical scan vs. 400-line soft / 800-line hard caps. Respects top-of-file `SIZE-EXEMPT:` markers. |
| `/cartographer [plan]` | Wrap `/implement` with research-driven discipline: atomize tasks, decision-log every task, citation validators at phase boundaries, halt only when an external SME is the only source. |
| `/teach [mode]` | Interactive programming lesson — contextual deep-dive, codebase exploration, or random topic. |
| `/commit [hint]` | Stage all changes, craft a bracket-tagged commit message (`[FEAT]`/`[FIX]`/`[REFAC]`/`[DOCS]` or a custom feature tag like `[GridCreation]`), and push. |
| `/squash [tag]` | Squash all commits since the branch diverged from main into one, using `/commit`'s tag format and a synthesized message. Force-pushes with lease. |

### Project Skills (via /claude-sync)

Scaffolded per-project from templates. Embed project-specific knowledge (architecture rules, test patterns).

| Skill | What it does |
|---|---|
| `/test` | Browser-based smoke tests with optional perf tracking. |
| `/refactor-code [focus]` | Code quality & architecture review with project-specific criteria. |
| `/refactor-tests [focus]` | Test coverage review with project-specific framework knowledge. |
| `/refactor-comments [scope]` | Sweep code comments against `arch-docs-over-inline` rubric; parallel Sonnet agents in non-overlapping partitions, build-verifies after. `--dry-run` for review-only mode. |
| `/refactor-file-sizes [scope]` | Audit + execute file-size refactors. Companion to `/audit-file-sizes` — splits violators by batch with language-playbook rules in each sub-agent's prompt. |

### Utility Commands

| Command | What it does |
|---|---|
| `/todo [text]` | Capture a to-do item for future sessions. |
| `/handoff` | Write a session handoff summary to project memory. |
| `/pickup` | Resume from a previous session's handoff. |

### Fresh machine setup

1. Install [git](https://git-scm.com/) and ensure it's on PATH.
2. If `~/.claude/` already exists, back it up and remove it.
3. Run from PowerShell:
   ```powershell
   git clone https://github.com/Mikkelsv/claude-config.git "$env:USERPROFILE\.claude"
   powershell -File "$env:USERPROFILE\.claude\setup.ps1"
   ```
4. `setup.ps1` generates `settings.json` from the template and registers the toast-notification AppID (Start Menu shortcut + banner permissions, required by Windows 11).
5. Open Claude Code — rules, commands, and skills are active immediately.

### Day-to-day

- **Edit directly at `~/.claude/`.** Writes to `.claude/**` are allow-listed in `settings.json` so no permission prompts.
- **Sync changes** with `/claude-push` (commit + push) or `/claude-sync` (pull + sync project skills).
- **Add project skills** with `/claude-sync` in any project directory.

### Notifications

`scripts/notify.ps1` fires on Stop and permission-prompt hooks. Shows a Windows toast banner, flashes the Claude desktop icon, plays a sound. Registration handled by `scripts/register-toast-appid.ps1` (run by `setup.ps1` on first install).

---

## For Claude (Reusable Setup Guide)

### Directory Layout

```text
~/.claude/                        # Git repo root
  .git/                           # git state
  .gitignore
  CLAUDE.md                       # Global instructions
  README.md                       # This file
  CHANGELOG.md                    # Project-action changelog
  config-version.json             # Global config version
  setup.ps1                       # Fresh-machine bootstrap
  settings.json                   # Live, machine-specific (gitignored)
  settings.template.json          # Portable template (committed)
  commands/                       # Slash commands
  rules/                          # Global rules (always loaded)
  skills/                         # Global skill implementations (one SKILL.md per skill)
  scripts/                        # PowerShell automation
  templates/skills/               # Project-skill templates (used by /claude-sync)
```

**No junctions, no wrapper directories.** The repo lives at `~/.claude/` directly.

### Design Pattern

**Prompts orchestrate, scripts execute.** Commands and skills contain decision logic; PowerShell scripts do mechanical work and return JSON on stdout.

- Discovery files (rules, commands, skills, settings) live where Claude Code expects them — at the root.
- Scripts and templates are referenced by skills/commands via absolute paths (`~/.claude/scripts/...`).
- Runtime state (`cache/`, `sessions/`, `projects/`, etc.) is managed by Claude Code itself and gitignored.

### Version Tracking

`config-version.json` tracks the global config version. `/claude-push` auto-bumps the patch version when staged changes touch `templates/` (projects need re-sync). Projects track staleness via `.claude/local/config-version.json` (gitignored) — at session start, Claude compares the two and suggests `/claude-sync` if they differ.

### Global Rules

Rules in `rules/` are always loaded:

- **meta-user-config.md** — Config conventions, sync rules, version staleness detection
- **meta-skill-tiers.md** — 3-tier skill placement (global, project, local config)
- **wf-use-commit-skill.md** — Always commit via `/commit`, never raw git
- **wf-no-shell-chains.md** — Avoid chained shell commands
- **meta-plans-location.md** — Plan files in project root `plans/`
- **wf-prefer-clickable-prompts.md** — Clickable options over free-text
- **wf-worktree-cleanup.md** — Auto-remove worktrees after merge
- **wf-surface-todos.md** — Surface todo items at natural moments
- **wf-no-read-generated-css.md** — Never read Tailwind output files
- **wf-teach-on-completion.md** — Offer a teaching nugget + quiz after dev tasks
- **wf-always-plan.md** — Auto-invoke `/plan` when work warrants a structured plan
- **wf-surface-rule-candidates.md** — Watch for generalizable decisions and surface them as rule candidates
- **cq-no-future-state-stubs.md** — Don't stub future DU cases / params with `NotImplementedException`; use a module comment instead
- **cq-async-all-the-way.md** — Once async, always async. No `.Result` / `.Wait()` / `Task.Run` as sync→async bridges
- **cq-flow-cancellation-tokens.md** — Thread `CancellationToken` through every cancellable async chain
- **cq-no-async-void.md** — Never `async void` outside UI event handlers
- **cq-no-silent-catch.md** — No catch blocks that swallow or log-and-continue without a documented reason
- **cq-no-fallbacks-without-ask.md** — No "just in case" defaults or optional params; fail loudly or ask first
- **cq-nullable-strict.md** — NRT warnings as errors; no `!` without an invariant comment
- **cq-result-over-exceptions-for-expected-failures.md** — Exceptions for unexpected only; `Result<T>` for validation / not-found / domain errors
- **cq-prefer-records-and-sealed.md** — `record` for data carriers, `sealed` for non-abstract classes by default
- **cq-no-hardcoded-secrets-or-env-invention.md** — No hardcoded secrets; never invent env var names
- **arch-no-repository-over-efcore.md** — Don't wrap `DbContext` in a generic `IRepository<T>`; it already is one
- **arch-no-speculative-interfaces.md** — No `IFoo + Foo` for single-impl classes; default to `sealed class`
- **wf-verify-api-before-using.md** — Grep / check `.csproj` / fetch docs before calling unfamiliar APIs
- **wf-match-existing-pattern.md** — Find an existing pattern of the same shape and follow it before introducing a new one
- **wf-fix-root-cause.md** — Diagnose before patching; don't edit tests to match broken behavior
- **wf-three-tier-boundaries.md** — Structure rules as *always / ask first / never*
- **wf-tight-claude-config.md** — Keep rules, skills, commands, and Claude docs terse; every line earns its tokens
- **wf-agents-on-sonnet.md** — Spawn delegated agents on Sonnet by default; reserve Opus for the orchestrating session
- **wf-project-specific-blocks.md** — Author skills/templates with stable headings so projects can layer `<ProjectSpecific>` blocks across syncs
- **wf-auto-build-and-serve.md** — Run build/serve commands yourself when verifying code changes; don't prompt the user to run them
- **wf-delegate-large-reads.md** — Delegate exploratory reads to Sonnet subagents; orchestrator stays in synthesis mode
- **wf-think-clearly-on-architecture.md** — Pause and surface trade-offs for architecture-shape decisions
- **wf-question-the-scope.md** — Default toward less; question whether new infrastructure is needed at the proposed scope
- **wf-blanket-rename-safety.md** — Multi-file rename checklist (exclude vendor paths, stdlib clobber, build-green-isn't-enough)
- **git-workflow.md** — Default to feature branches over direct-to-main; use `/commit` and `/rebase-on-main`
- **arch-docs-over-inline.md** — Heavy context lives in `docs/`; code carries thin pointers, not narration
- **arch-transient-ui-state-not-in-domain.md** — Per-session UI toggles don't belong on persisted domain records
- **cq-comments-track-code.md** — Update or delete every stale comment in the same commit as the code change
- **cq-fallthrough-guard-all-branches.md** — Every routing branch asserts its expected sub-range; no open-ended `else`
- **cq-option-returning-fn-naming.md** — F# functions returning `option` carry the `try` prefix (`tryGetX`, never `getX`)
- **meta-markdown.md** — All `.md` files must pass markdownlint (MD022/MD031/MD032/MD040/MD060)
- **meta-rule-format.md** — Rule file structure: title, imperative directive, optional Why/How/Exceptions
- **meta-operation-safety-in-skill-not-rule.md** — Operation-specific safety/checklists live in the performing skill, not an always-loaded rule

New rules use category prefixes: `cq-` (code-quality), `arch-` (architecture), `wf-` (workflow), `meta-` (config / tooling / file placement). `/rule-review` proposes migrations for older un-prefixed rules.

### Script Catalog

All scripts in `scripts/`.

| Category | Scripts |
|----------|---------|
| Worktree | `get-worktrees`, `create-worktree`, `remove-worktree`, `escape-worktree` |
| Launching | `launch-vscode`, `launch-dev-server`, `kill-port` |
| Git | `git-preflight`, `git-branch-scope`, `git-diff-scope`, `commit` |
| File/Process | `remove-path`, `move-path`, `npm-command`, `node-run` |
| Config | `sync-config`, `pull-config`, `mirror-skill` |
| Audit | `check-file-sizes` (backs `/audit-file-sizes`) |
| Notifications | `notify`, `register-toast-appid` |
| Migration | `migrate-to-claude-root` (one-time, for machines still on the old `~/claude-config/` + junction layout) |

Skill-local scripts:
- `skills/rebase-on-main/scripts/`: `git-rebase-onto`, `git-merge-cleanup`, `git-branch-from-main`
- `skills/squash/scripts/`: `git-squash-inventory`, `git-squash-execute`
