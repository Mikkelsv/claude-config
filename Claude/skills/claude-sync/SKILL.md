---
name: claude-sync
description: Pull global config and scaffold or sync project-level skills from templates
---

# Claude Sync — Pull + Setup/Sync Project Skills

Pull the latest global config, then scaffold new project skills or sync existing ones when templates have changed. Stores all customization values in `Claude/local/` so syncs never re-ask questions.

Input: `$ARGUMENTS` (optional — "fresh" to force re-scaffold, or skill names like "build test")

Templates directory: `~/claude-config/Claude/templates/skills/`

## Project Skills (scaffolded from templates)

These encode project-specific knowledge and are committed to the repo for all team members:

| Skill | What it does |
|---|---|
| **build** | Global skill — scaffolds `Claude/local/skills/build/config.md` only |
| **test** | Browser-based smoke tests with optional perf tracking |
| **refactor-code** | Code quality & architecture review |
| **refactor-tests** | Review test coverage against code changes |

## Global Skills (optional project copies for teammates)

These are available globally to users with the config. They can optionally be scaffolded as project-level copies so teammates without the global config can use them too:

| Skill | What it does |
|---|---|
| **plan** | Collaborative feature discovery and structured plan creation |
| **implement** | Autonomous dev loop (plan → implement → test → refactor → audit) |
| **refactor** | Orchestrator: spawns refactor-code, refactor-docs, refactor-tests |
| **refactor-docs** | Review and update documentation to match code changes |
| **audit-architecture** | Deep architecture review (overengineering, boundaries, alternatives) |

---

## Step 0 — Pull Global Config

Run the pull script to fetch the latest global config:

```bash
powershell.exe -NoProfile -File "$HOME/claude-config/Claude/scripts/pull-config.ps1"
```

- If `pulled = true`: note the changes briefly ("Pulled N commits from global config").
- If `pulled = false` and `reason = "already up-to-date"`: continue silently.
- If `pulled = false` for any other reason (network, conflicts): report the error. Ask user: "Continue with local templates, or abort?"

---

## Step 1 — Detect Mode

Check if `Claude/local/config-version.json` exists in the project.

- **Missing** → **Initial Setup** (Step 2)
- **Present** → **Sync** (Step 3)

**$ARGUMENTS overrides:**
- `"fresh"` → force Initial Setup regardless of version file
- Skill names (e.g., `"build test"`) → work in detected mode, scoped to those skills

---

## Step 2 — Initial Setup

Run this when no `Claude/local/config-version.json` exists (first time scaffolding).

### 2.1 — Check Existing Skills

List any existing skills in `.claude/skills/`. If the user is scaffolding a skill that already exists, ask: overwrite or skip?

### 2.2 — Select Project Skills

If `$ARGUMENTS` specifies skills, use those. If "all", scaffold everything. If empty, ask:

Use `AskUserQuestion` with multiSelect for project-specific skills:
- build (Recommended) — scaffolds local config only
- test
- refactor-code
- refactor-tests

Then ask about **teammate copies** of global skills — these are already available to you globally, but teammates without the global config won't have them. Use `AskUserQuestion` with multiSelect:
- plan — feature discovery and plan creation
- implement — autonomous dev loop with build/test/refactor gates
- refactor — orchestrator (spawns refactor-code, refactor-docs, refactor-tests)
- refactor-docs — documentation sync
- audit-architecture — deep architecture review

Store the teammate copy choice in `Claude/local/skills/sync-config.md`:

```markdown
# Sync Config

## Teammate Copies

Global skills also scaffolded as project-level for teammates:

- plan
- implement
- refactor
- refactor-docs
```

Scaffold the selected teammate copies from their templates (same process as project skills).

### 2.3 — Gather Project Info

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

**For refactor-code:**
- Architecture principles — can often be derived from CLAUDE.md. Ask only if CLAUDE.md is missing or sparse.
- Specific quality goals or review criteria beyond CLAUDE.md

**For refactor-tests:**
- Test framework files to read (patterns, conventions, existing test implementations)
- Existing test mapping (which tests cover which features)

**For audit-architecture** (only if scaffolding as teammate copy or creating local config):
- Architecture boundary rules — derive from CLAUDE.md's core principles
- Specific layering or dependency direction rules

**For plan** (only if scaffolding as teammate copy or creating local config):
- Plan directory location (default: `plans/`)
- Feature board file (optional)

**For implement** (only if scaffolding as teammate copy or creating local config):
- Commit message prefix convention (default: `FEAT:`/`FIX:`/`REFACTOR:`)
- Plan directory location (default: `plans/`)

### 2.4 — Store Customization Values

For each skill, write the gathered info to `Claude/local/skills/{name}/config.md`. This persists the user's answers so future syncs never re-ask them.

| Config file | Values stored |
|---|---|
| `Claude/local/skills/build/config.md` | build command, preview server name, port |
| `Claude/local/skills/test/config.md` | smoke test script, perf tracking (yes/no), baseline path, testing conventions |
| `Claude/local/skills/refactor-code/config.md` | architecture check criteria |
| `Claude/local/skills/refactor-tests/config.md` | test framework files, test mapping |
| `Claude/local/skills/audit/config.md` | architecture boundary rules |
| `Claude/local/skills/plan/config.md` | plan directory, feature board path |
| `Claude/local/skills/implement/config.md` | commit prefix, plan directory, test creation conventions |

Skills with no customization (`refactor`, `refactor-docs`) get no config file.

Format each config as markdown with clear headings so values are easy to extract later:

```markdown
# Test Config

## Preview Server Name
gridpreview

## Smoke Test Script
```js
(async () => { ... })()
```

## Performance Tracking
yes

## Baseline Path
Claude/local/perf-baseline.json

## Testing Conventions
Tests live in Tests/ and follow xUnit patterns...
```

### 2.5 — Read Templates & Generate Skills

For each selected skill:

1. Read the template from `~/claude-config/Claude/templates/skills/{name}/`
2. Compute the template hash: `sha256sum` of the raw template file, store first 8 hex chars
3. Generate a customized version with the user's project info filled in — replace all `{PLACEHOLDER}` markers with actual values
4. Write the **full implementation** to `Claude/skills/{name}/SKILL.md` (outside the protected `.claude/` folder)
5. Write a **thin shell** to `.claude/skills/{name}/SKILL.md` containing only the frontmatter (name, description) and a redirect: `Read and follow Claude/skills/{name}/SKILL.md.` Include `$ARGUMENTS` in the shell for skills that accept user arguments (build, test, plan, implement).
6. Copy any supporting files to `Claude/skills/{name}/` (e.g., `browser-throttling.md`, `plan-template.md`)

**For build specifically:** Build is a **global skill** — do NOT create project-level skill files (no `.claude/skills/build/` or `Claude/skills/build/`). Instead, scaffold only `Claude/local/skills/build/config.md`. Read the build template at `~/claude-config/Claude/templates/skills/build/SKILL.md` for the reference file format and placeholders. The global skill at `~/claude-config/Claude/skills/build/SKILL.md` reads this reference at runtime.

**For test specifically:** Also generate `Claude/skills/test/scripts/smoke-test.js` with the user's test execution script.

**Important:** In the full implementations written to `Claude/skills/`, replace any `${CLAUDE_SKILL_DIR}` references with `Claude/skills/{name}/` since `${CLAUDE_SKILL_DIR}` only expands in `.claude/skills/` shell files.

### 2.6 — Create launch.json (if needed)

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

### 2.7 — Stamp Config Version

Read `~/claude-config/Claude/config-version.json` to get the current global config version. Write `Claude/local/config-version.json`:

```json
{
  "globalConfigVersion": "<version from global>",
  "syncedAt": "<today's date>",
  "skills": {
    "<skill-name>": {
      "templateHash": "<first 8 hex chars of SHA256 of raw template>"
    }
  }
}
```

Include every skill that was scaffolded in the `skills` map.

### 2.8 — Report

List all created files and remind the user:
- Thin shells in `.claude/skills/` (rarely need editing)
- Full implementations in `Claude/skills/` (edit these freely — no permission prompts)
- Local skill config in `Claude/local/skills/<name>/` (gitignored — machine-specific)
- Architecture docs go in `Claude/docs/` (not `.claude/docs/`)
- Review the generated skills and adjust if needed
- Add `Claude/local/` and the perf baseline path to `.gitignore` if not already present
- CLAUDE.md should document the project's architecture for `/refactor` to reference

---

## Step 3 — Sync

Run this when `Claude/local/config-version.json` exists (skills were previously scaffolded).

### 3.1 — Assess Drift

1. Read `~/claude-config/Claude/config-version.json` for the global `version`.
2. Read `Claude/local/config-version.json` for the project's `globalConfigVersion` and `skills` map.
3. If versions match and no specific skills requested in `$ARGUMENTS`, report "All skills current — nothing to sync." Done.
4. If versions differ, read `~/claude-config/Claude/CHANGELOG.md`. Extract entries between the project version and the current global version. Focus on lines that describe project actions. Present a brief summary to the user.

### 3.2 — Per-Skill Change Detection

For each skill in the project's `skills` map:

1. Check if the global template still exists at `~/claude-config/Claude/templates/skills/{name}/SKILL.md`
2. Compute the current template's SHA256 hash (first 8 hex chars)
3. Compare against the stored `templateHash`
4. Categorize: **Changed** (hashes differ) or **Current** (hashes match)

Also scan `~/claude-config/Claude/templates/skills/` for templates that are NOT in the project's `skills` map — these are **New** (added to global config since last sync).

Present a table:

```
Skill           Status
refactor-code   Changed (template updated)
plan            New (not yet scaffolded)
test            Current
build           Current
```

If `$ARGUMENTS` specifies skill names, filter the table to only those skills.

### 3.3 — Choose What to Update

Use `AskUserQuestion` with multiSelect. Pre-select all Changed and New skills. Current skills are available but not pre-selected.

### 3.4 — Apply Updates

**For Changed skills:**

1. Read `Claude/local/skills/{name}/config.md` to recover all customization values
2. Read the new template from `~/claude-config/Claude/templates/skills/{name}/SKILL.md`
3. Re-generate `Claude/skills/{name}/SKILL.md` by applying stored values to the new template (same process as Step 2.5, but using stored values instead of asking)
4. Copy any new or updated supporting files from the template directory
5. Update the thin shell in `.claude/skills/{name}/SKILL.md` if the description changed
6. If the new template has new `{PLACEHOLDER}` markers not present in the config file, ask the user for the missing values and update the config file

**For New skills:**

1. Check existing config files — some values may be reusable (e.g., build command from `Claude/local/skills/build/config.md`)
2. Ask the user only for info that can't be inferred from existing configs
3. Scaffold normally: write config file, generate from template, create thin shell (same as Steps 2.4 and 2.5)

### 3.5 — Update Version Stamp

Update `Claude/local/config-version.json`:
- Set `globalConfigVersion` to the current global version
- Set `syncedAt` to today's date
- Update `templateHash` for each synced skill
- Add new skills to the `skills` map

### 3.6 — Report

List:
- **Updated**: skills where the template changed and was re-generated
- **Added**: newly scaffolded skills
- **Skipped**: skills the user chose not to update
- **Current**: skills with no template changes
- New version: "Project now synced to vX.Y.Z."

---

## Edge Cases

**Legacy version file (no `skills` map):** If `Claude/local/config-version.json` exists but has no `skills` field, scan `.claude/skills/` and `Claude/skills/` to detect installed skills. Treat all as having unknown template hashes. Offer to re-sync all of them.

**New placeholder in updated template:** When a new template version introduces a `{PLACEHOLDER}` that doesn't exist in the skill's config file, detect this during Step 3.4 and ask the user for the value. Update the config file with the new value.

**Manual edits to generated skill files:** Re-generation from templates will overwrite manual edits. The user can choose "skip" for individual skills to preserve their changes. All customization values are safely stored in config files.

**Pull fails:** If Step 0 fails, ask user: continue with local templates or abort. Local templates may be stale but still usable.
