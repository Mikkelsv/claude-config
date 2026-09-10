# Claude Code Setup

Personal Claude Code configuration — slash commands, skills, rules, and PowerShell automation stored as a git repo at `~/.claude/`. Prompts orchestrate; scripts do the mechanical work and return JSON.

## For Humans

### Config Management

| Command | What it does |
|---|---|
| `/claude-sync [skills\|fresh]` | Pull global config, scaffold committed `.claude/skill-config/` files, and sync project-local forks of global skills for shared repos (per `meta-project-local-skill-copies`). Step 3.1b migrates a project off the retired template tier. |
| `/claude-refactor` | Audit all skills, commands, scripts, rules, and agents. Fixes bugs, stale refs, permission gaps. |
| `/claude-push` | Commit and push config changes. Auto-bumps version when `rules/`, `skills/` or `commands/` change. |
| `/allow-defer [prompt]` | Parse a blocked permission prompt and save a suggested allow rule to `~/.claude/suggestions/` for later review (non-interrupting). |
| `/allow-now [prompt]` | Parse a blocked permission prompt and append it to `~/.claude/settings.json` immediately. Use when you've decided and want the rule active now. |
| `/suggestions [type]` | Walk through pending suggestions in `~/.claude/suggestions/` one at a time and accept/skip/discard each. |
| `/capture-rule [idea]` | Capture a new code-quality, architecture, or workflow rule. Asks category + scope, drafts the rule, saves after your approval. |
| `/rule-candidate [idea]` | Write a rule candidate as a standalone file in the project's gitignored `.claude/local/rule-candidates/`. Lightweight — no commitment. Promotion happens via `/capture-rule` or `/rule-review`. |
| `/rule-review` | Critical single-pass triage of pending candidates AND existing rules. Surfaces dupes, retires stale rules, proposes prefix migrations, promotes candidates. |

### Global Workflow Skills

Available in every project via the global config.

| Skill | What it does |
|---|---|
| `/build` | Build & serve. Reads project config from the committed `.claude/skill-config/build.md`. |
| `/rebase-on-main` | Rebase on main, resolve conflicts, optionally merge/push. |
| `/study [topic]` | Codebase-first research — parallel sonnet agents map an area, synthesize into session context. No file output. Use before `/plan` when context is thin. |
| `/voice-mode [opening]` | Install a voice-input contract for the conversation — parse rambly dictated input for intent, not literal text. Stays on until "voice mode off" or `/implement`. Pair with `/plan` for big dictated planning sessions. |
| `/plan [feature]` | Collaborative feature discovery + plan creation. Skeptical senior-engineer persona — challenges premise before accepting the framing. Phase 1 invokes `/study` when session context is thin. UI features spawn `design-scout` and settle one ASCII mockup as the plan's `## UI Contract`. Tasks carry `**Verify:**` instruments, a `**Test:**` tier, optional ` — **milestone**` markers, and must be cold-executable by a fresh agent. Auto-runs `/plan-optimizer` at 3+ tasks. Default is one plan per shippable feature — split only when the user names distinct increments. |
| `/plan-optimizer [plan]` | Second-pass critique across 6 lenses (shape, data, performance reality-check, risk/feasibility, verifiability, design coverage). Requires each task to name a real instrument rather than restate its acceptance prose, and checks the plan against its agreed `## UI Contract` for structural drift via `design-scout`. Overwrites the plan in place — `git diff` to see changes. |
| `/implement [plan] [--inline\|--agentic]` | Autonomous dev loop with build/test/refactor/audit gates. Mode resolves via CLI flag → plan front matter (`mode: agentic\|inline`) → auto-detect (agentic for >5 tasks). Agentic spawns one Sonnet sub-agent per task; plan file carries cross-task state via `**Implementation notes:**`. Final Audit uses `/audit-branch`. |
| `/audit-branch [focus]` | Branch-level audit across architecture, code, docs, tests, file-sizes, and comments. Phase 3a runs all 6 sub-skills in parallel against `main..HEAD`; Phase 3b only fires if `audit-file-sizes` flagged cap violations (file splits need a stable file structure to operate on). Self-paces 1-3 passes (decided after each pass). Hands disposition to `/resolve-audit-findings`, then closes with one `/verify` run (Phase 8) — the skill's only suite run. |
| `/resolve-audit-findings` | Per-finding triage. Spawns one Sonnet agent per finding (parallel) for full research; applies inline when confidence is high, defers substantial findings to `plans/post-audit-{slug}.md`. Typically invoked by `/audit-branch` Phase 5. |
| `/test [inline\|background]` | Build, run every configured test tier, classify each result against a committed pass-set baseline, report one verdict (ALL GOOD / TEST DRIFT / TEST FAILURE / TEST REGRESSION / NEEDS REVIEW). Reads the committed `.claude/skill-config/test.md` for build command, tier table, baseline path and per-tier drift mapping; degrades honestly with no config. **Never writes its own baseline** — refreshing it is a deliberate manual runbook, because a self-refreshing baseline would let a fix loop launder a regression into "expected". Delegates to a sub-agent by default to keep per-test arrays out of the caller. |
| `/verify [plan\|none]` | Decides whether implemented work actually holds: executes each task's `**Verify:**` entries against the running app, reports pass / fail / can't-tell / human / no-instrument per criterion, triages every test result by class, and records provenance for any assertion edited in response to observed red. Delegates execution to the `verifier` agent above ~5 criteria but never delegates adjudication. `/test` measures; `/verify` decides. |
| `/refactor-code [focus]` | Breadth code-quality sweep — naming, dead code, duplication, simplicity. Applies mechanical fixes inline, defers judgment calls. Reads the project's own `CLAUDE.md` + `.claude/rules/` for criteria. For deep design analysis use `/audit-architecture`. |
| `/refactor-tests [focus]` | Test-coverage review after a change. Applies trivial additions inline, defers heavier gaps to a plan. Flags "verified live" notes standing in for coverage, and "can't unit test this" notes inherited by proximity. |
| `/refactor-comments [scope]` | Sweep comments against the `arch-docs-over-inline` rubric via parallel Sonnet agents in non-overlapping partitions, build-verified after. `--dry-run` for review-only. Includes the merge-deletion vs completion-deletion diagnosis for a stale doc citation. |
| `/refactor-file-sizes [scope]` | Audit + execute file-size refactors. Companion to `/audit-file-sizes` — splits violators by batch, one Sonnet agent each. Phase 3.5 checks that extracted files also clear the cap rather than the split just relocating it. |
| `/refactor-docs [focus]` | Documentation sync — checks docs match code changes. Usually invoked via `/audit-branch`. |
| `/audit-architecture [focus]` | Strict, skeptical architecture review (single-pass): boundaries, overengineering, alternatives. Usually invoked via `/audit-branch`. |
| `/audit-file-sizes [mode]` | Mechanical scan vs. 400-line soft / 800-line hard caps. Respects top-of-file `SIZE-EXEMPT:` markers. |
| `/teach [mode]` | Interactive programming lesson — contextual deep-dive, codebase exploration, or random topic. |
| `/explain [focus]` | Read-only, parallel-session walkthrough of the current branch/plan — always-shown core (simple explanation, what's decided, example, architecture + file fit) then numbered drill-downs. Wraps `/teach`; never writes files. |
| `/commit [hint]` | Stage all changes, craft a bracket-tagged commit message — a custom PascalCase feature tag by default (`[GridCreation]`), with Title-case fallbacks (`[Fix]`/`[Refac]`/`[Docs]`/`[Feat]`) when no coherent area exists — and push. |
| `/squash [tag]` | Squash all commits since the branch diverged from main into one, using `/commit`'s tag format and a synthesized message. Force-pushes with lease. |

### Project-local forks (Tier 2)

There is **no template tier**. Every skill is global and discovers project specifics at runtime — the project's own `CLAUDE.md` and `.claude/rules/`, plus an optional committed `.claude/skill-config/<name>.md` for values that can't be derived (a build command, a test-tier table, a curated partition list). One skill per capability instead of one fork per project: no placeholder substitution, no re-scaffolding, no drift.

**Why committed rather than gitignored:** a build command is repo-wide truth, identical for every developer, so a colleague cloning the repo needs it. And why a config rather than a rule or `CLAUDE.md`: those load into *every* session, whereas a skill config is read only when its skill runs. Measured 2026-09-10, `CLAUDE.md` alone was 23% of a 119 KB eager load — so parameters belong in a config, standing behaviour in a rule.

The one legitimate reason to keep a project copy is a **shared repo whose colleagues don't have their own `~/.claude/`** — they need the workflow on clone. `/claude-sync` scaffolds those forks and drift-checks them against global; project additions belong in `<ProjectSpecific>` blocks so they survive a resync. See `rules/meta-project-local-skill-copies.md` and `rules/meta-skill-tiers.md`.

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
4. `setup.ps1` generates `settings.json` from the template. Machine-specific wiring (model provider, credentials) is not templated — add it to `settings.json` by hand.
5. Open Claude Code — rules, commands, and skills are active immediately.

### Day-to-day

- **Edit directly at `~/.claude/`.** Writes to `.claude/**` are allow-listed in `settings.json` so no permission prompts.
- **Sync changes** with `/claude-push` (commit + push) or `/claude-sync` (pull + sync project skills).
- **Add project skills** with `/claude-sync` in any project directory.

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
  agents/                         # Global subagent definitions (scope-skeptic, verifier, design-scout)
  commands/                       # Slash commands
  rules/                          # Global rules (always loaded)
  skills/                         # Global skill implementations (one SKILL.md per skill)
  scripts/                        # PowerShell automation
  local/                          # Gitignored, machine-local — holds rule-candidates/ drafts
```

**No junctions, no wrapper directories.** The repo lives at `~/.claude/` directly.

### Design Pattern

**Prompts orchestrate, scripts execute.** Commands and skills contain decision logic; PowerShell scripts do mechanical work and return JSON on stdout.

- Discovery files (rules, commands, skills, settings) live where Claude Code expects them — at the root.
- Scripts are referenced by skills/commands via absolute paths (`~/.claude/scripts/...`).
- Runtime state (`cache/`, `sessions/`, `projects/`, etc.) is managed by Claude Code itself and gitignored.

### Version Tracking

`config-version.json` tracks the global config version. `/claude-push` auto-bumps the patch version when staged changes touch `rules/`, `skills/`, or `commands/` — a signal to any shared repo forking those. Projects track staleness via `.claude/local/config-version.json` (gitignored) — at session start, Claude compares the two and suggests `/claude-sync` if they differ.

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
- **wf-overengineering-not-volume.md** — Critique abstractions without a consumer, not line count; large-and-justified is fine
- **wf-check-the-artifact-not-the-self-report.md** — Judge a sub-agent by its `git diff`, never by its summary
- **wf-repro-test-first.md** — Write the failing test before the change; watch it go red for the right reason
- **wf-verify-premises-before-acting.md** — Verify a claimed premise (a plan's bug, an audit finding, a "missing" feature) against current code before acting on it
- **wf-blanket-rename-safety.md** — Multi-file rename checklist (exclude vendor paths, stdlib clobber, build-green-isn't-enough)
- **git-workflow.md** — Default to feature branches over direct-to-main; use `/commit` and `/rebase-on-main`
- **arch-docs-over-inline.md** — Heavy context lives in `docs/`; code carries thin pointers, not narration
- **arch-transient-ui-state-not-in-domain.md** — Per-session UI toggles don't belong on persisted domain records
- **cq-comments-track-code.md** — Update or delete every stale comment in the same commit as the code change
- **cq-fallthrough-guard-all-branches.md** — Every routing branch asserts its expected sub-range; no open-ended `else`
- **cq-no-alias-functions-as-documentation.md** — Don't add a same-semantics alias function for "caller clarity"; use a comment instead
- **wf-plain-phrasing-for-colleagues.md** — Suggested messages to colleagues stay short, plain, unformatted, and specific
- **meta-markdown.md** — All `.md` files must pass markdownlint (MD022/MD031/MD032/MD040/MD060)
- **meta-rule-format.md** — Rule file structure: title, imperative directive, optional Why/How/Exceptions
- **meta-operation-safety-in-skill-not-rule.md** — Operation-specific safety/checklists live in the performing skill, not an always-loaded rule
- **meta-project-local-skill-copies.md** — Project-local copies of global skills/scripts are deliberate forks, not duplicates — never propose collapsing them

Stack rules — `paths:`-scoped, so they load only when you open a matching file:

- **arch-no-wasm-threads-in-worker.md** — `WasmEnableThreads` in a Web Worker hangs the runtime on startup
- **cq-blazor-highfreq-eventcallback-render-cost.md** — an `EventCallback` re-renders its owner every tick; never read an unmemoized O(scene) projection from that render path
- **cq-client-json-converter-options.md** — a server-registered `JsonConverter` never reaches `ReadFromJsonAsync()` without explicit options
- **cq-js-setup-listener-idempotent.md** — `addEventListener` doesn't dedupe; setup functions must be idempotent or caller-guarded
- **cq-no-large-managed-alloc-on-wasm.md** — no large managed allocations on a WASM client; stream instead. Client-only
- **cq-css-isolation-duplicate-to-utility.md** — a rule duplicated across 2+ `.razor.css` files becomes a global utility class

Deliberately always-on despite being stack-flavoured:

- **cq-field-removal-graceful.md** — check the deserializer's unknown-property handling before calling a field removal a migration. Fires at planning time, when persistence files may not be open
- **wf-build-error-list-is-a-frontier.md** — a shrinking build-error list measures progress through the frontier, not remaining scope

New rules use category prefixes: `cq-` (code-quality), `arch-` (architecture), `wf-` (workflow), `meta-` (config / tooling / file placement). `/rule-review` proposes migrations for older un-prefixed rules.

### Script Catalog

All scripts in `scripts/`.

| Category | Scripts |
| --- | --- |
| Worktree | `get-worktrees`, `remove-worktree` |
| Launching | `launch-vscode`, `kill-port` |
| Git | `git-preflight`, `git-diff-scope` |
| Config | `sync-config`, `pull-config`, `mirror-skill` |
| Audit | `check-file-sizes` (backs `/audit-file-sizes`), `audit-instructions` |

Worktree creation and exit are handled by Claude Code's native `EnterWorktree` / `ExitWorktree` tools.

`audit-instructions` is a **temporary instrument**, wired as an `InstructionsLoaded` hook in `settings.json` to measure which rule files load into each session and why. It writes JSONL to `debug/instruction-loads/` (gitignored); read it with `-Report`. It spawns one `pwsh` per loaded instruction file per session, including subagent sessions, so unregister the hook once rule-scope measurement is finished.

Skill-local scripts:
- `skills/rebase-on-main/scripts/`: `git-rebase-onto`, `git-merge-cleanup`, `git-branch-from-main`
- `skills/squash/scripts/`: `git-squash-inventory`, `git-squash-execute`
