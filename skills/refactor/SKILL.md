---
name: refactor
description: Review code changes for architecture, quality, and simplicity
---

# Refactor Review (Orchestrator)

Runs three review passes in parallel: code review, documentation sync, and test coverage.

## Execution

1. Determine the review mode from arguments and conversation context:

   **Mode A — Changes** (no arguments provided):

   Run the scope script:

   ```bash
   powershell.exe -NoProfile -File "$HOME/.claude/scripts/git-diff-scope.ps1"
   ```

   If `MODE: none`, abort — nothing to review.

   **Mode B — Focused** (arguments are a path, module name, or description of an area):

   The arguments describe where to focus. Use Glob to find the relevant files. Build a scope summary listing the target files and why they were selected.

   **Mode C — General** (argument is `all`):

   Scan the solution structure from CLAUDE.md. Use Glob to count files per folder and identify the largest/most complex areas. Pick the 2-3 areas that would benefit most from review. Build a scope summary listing the target files and areas.

   **Conversation context**: In all modes, also consider what the user was working on in this conversation. If recent edits or discussion provide relevant context, factor that into the scope.

2. Read all three sub-skill files. For each, check the project first, then fall back to the global location:
   - `.claude/skills/refactor-code/SKILL.md` (project) or `~/.claude/skills/refactor-code/SKILL.md` (global)
   - `.claude/skills/refactor-docs/SKILL.md` (project) or `~/.claude/skills/refactor-docs/SKILL.md` (global)
   - `.claude/skills/refactor-tests/SKILL.md` (project) or `~/.claude/skills/refactor-tests/SKILL.md` (global)

3. Spawn all three as **parallel background agents** using the Agent tool. Pass each skill's full contents as the agent prompt, **prepending the scope output** (for changes mode) or a **scope summary** (for focused/general mode) so they skip their scope identification step and start directly from the analysis step.

4. Wait for all three to complete.

5. Present a unified report combining the results:

### Code Review

Relay the refactor-code agent's findings: summary, architecture concerns, quality issues, simplifications, and verdict.

### Documentation Sync

Relay the refactor-docs agent's findings: what docs were updated, any gaps flagged.

### Test Coverage

Relay the refactor-tests agent's findings: coverage verdict, gaps, stale tests.

### Overall Verdict

Synthesize across all three: is this ready to ship, or does it need work? If any sub-review flagged issues, use `AskUserQuestion` to ask if the user wants fixes applied.

### Rule Candidates

Scan the findings for patterns that would generalize beyond this review — recurring simplifications, consistently-applied preferences, corrections the user has made before. Per `wf-surface-rule-candidates.md`, append up to 2 candidates using the standard format. Skip this section if nothing qualifies — don't fabricate.
