# Claude Setup — Project Skills

Scaffold project-level skills from global templates. Creates `.claude/skills/` directories with customized skill files for this project.

Input: `$ARGUMENTS` (optional — skill names to scaffold, e.g., "build test", or "all")

Templates directory: `~/.claude/templates/skills/`

## Available Skills

| Skill | What it does | Dependencies |
|---|---|---|
| **build** | Build & serve with auto-build after code changes | None |
| **test** | Browser-based smoke tests with optional perf tracking | build, preview tools |
| **refactor** | Orchestrator: spawns refactor-code, refactor-docs, refactor-tests in parallel | refactor-code, refactor-docs, refactor-tests |
| **refactor-code** | Code quality & architecture review | None (uses CLAUDE.md) |
| **refactor-docs** | Review and update documentation to match code changes | None |
| **refactor-tests** | Review test coverage against code changes | test framework files |
| **audit** | Deep architecture review (overengineering, boundaries, alternatives) | None (uses CLAUDE.md) |
| **plan** | Collaborative feature discovery and structured plan creation | implement (for plan format) |
| **implement** | Autonomous dev loop (plan → implement → test → refactor → audit) | build, test, refactor, audit |

## Process

### Step 1 — Check Existing Skills

List any existing skills in `.claude/skills/`. If the user is scaffolding a skill that already exists, ask: overwrite or skip?

### Step 2 — Select Skills

If `$ARGUMENTS` specifies skills, use those. If "all", scaffold everything. If empty, ask:

Use `AskUserQuestion` with multiSelect:
- build (Recommended)
- test
- refactor (includes refactor-code, refactor-docs, refactor-tests)
- audit
- plan (requires implement for plan format)
- implement (requires build + test + refactor + audit)

If implement is selected, ensure build, test, refactor, and audit are also selected (they're prerequisites). If refactor is selected, ensure refactor-code, refactor-docs, and refactor-tests are also created. If plan is selected, ensure implement is also selected.

### Step 3 — Gather Project Info

Read CLAUDE.md if it exists — it contains build commands, architecture principles, and conventions that inform the skill generation.

Then ask the user for skill-specific info using `AskUserQuestion`:

**For build:**
- Build command (e.g., `dotnet build MySolution.slnx`, `npm run build`, `cargo build`)
- Dev server? If yes:
  - Launch command and port
  - URL (e.g., `http://localhost:5163`)
- How to kill an existing server on that port

**For test:**
- Preview server name (must match a name in `.claude/launch.json`)
- Test execution script — the JavaScript expression that runs in `preview_eval`. Must return `{ ready, tests }` at minimum, plus `{ perf, metrics }` if performance tracking is enabled.
- Performance tracking needed? (yes for perf-sensitive apps like 3D renderers, data pipelines; no for simpler apps like CRUD, quizzes, forms)
- If yes: perf baseline path (where to store the JSON baseline, should be gitignored)
- Any testing conventions or patterns (file for new tests, registration, cleanup)

**For refactor / refactor-code:**
- Architecture principles — can often be derived from CLAUDE.md. Ask only if CLAUDE.md is missing or sparse.
- Specific quality goals or review criteria beyond CLAUDE.md
- The refactor template is the orchestrator; refactor-code, refactor-docs, and refactor-tests are the sub-skills it spawns

**For refactor-tests:**
- Test framework files to read (patterns, conventions, existing test implementations)
- Existing test mapping (which tests cover which features)

**For audit:**
- Architecture boundary rules — derive from CLAUDE.md's core principles
- Specific layering or dependency direction rules

**For plan:**
- Feature board file — does the project use a feature tracker? If yes, path (e.g., `plans/FEATURES.md`)
- Plan directory location (default: `plans/`)

**For implement:**
- Commit message prefix convention (default: `FEAT:`/`FIX:`/`REFACTOR:`)
- How to create tests for new features (test framework, patterns, file locations)
- Any doc files that should stay updated (list them)
- Plan directory location (default: `plans/`)

### Step 4 — Read Templates & Generate Skills

For each selected skill:

1. Read the template from `~/.claude/templates/skills/{name}/`
2. Generate a customized version with the user's project info filled in — replace all `{PLACEHOLDER}` markers with actual values
3. Write to `.claude/skills/{name}/` in the current project
4. Copy any supporting files (e.g., `browser-throttling.md`, `plan-template.md`)

**For build specifically:** Also generate self-contained scripts in `.claude/skills/build/scripts/`:
- `kill-port.ps1` (or `.sh`) — kill process on the configured port
- `launch-dev-server.ps1` (or `.sh`) — start dev server in a new terminal tab

Detect the user's platform from the environment and generate appropriate scripts:
- Windows: PowerShell scripts using Windows Terminal
- macOS/Linux: Bash scripts

**For test specifically:** Also generate `.claude/skills/test/scripts/smoke-test.js` with the user's test execution script.

### Step 5 — Create launch.json (if needed)

If the user selected test and configured a preview server, check if `.claude/launch.json` exists. If not, create it:

```json
{
  "version": "0.0.1",
  "configurations": [
    {
      "name": "{PREVIEW_SERVER_NAME}",
      "runtimeExecutable": "{SERVER_EXECUTABLE}",
      "runtimeArgs": {SERVER_ARGS},
      "port": {SERVER_PORT}
    }
  ]
}
```

### Step 6 — Report

List all created files and remind the user:
- Review the generated skills and adjust if needed
- Add the baseline path to `.gitignore` if using test with performance tracking
- CLAUDE.md should document the project's architecture for `/refactor` to reference
