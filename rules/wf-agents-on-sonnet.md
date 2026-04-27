# Spawn Agents on Sonnet by Default

When a skill spawns sub-agents via the Agent tool, default to `model: 'sonnet'`. The orchestrating main session keeps Opus; delegated work runs on Sonnet.

## Why

Sonnet is ~5× cheaper than Opus per token and entirely capable of file inventory, parallel review, code exploration, and most synthesis. Spawning N parallel agents at Opus rates multiplies cost across a single skill invocation. Most agent work is delegated reading + reporting — Sonnet handles it without measurable quality loss.

## How

- **Sonnet (default)**: scan, inventory, review, audit, parallel exploration, summarize-and-report, code-writing in delegated tasks.
- **Opus**: only when the agent needs orchestrator-level judgment the main session can't pre-compute (rare — usually means the work belonged in the main session).
- **Haiku**: trivial mechanical agents with no reasoning required (e.g. `/vs` background launcher — pick color, run script, report) and project-specific mechanical detection where the spec is concrete (e.g. "find all uses of our `LegacyClient`"). Don't use Haiku for generic rule-violation scans — Roslyn/SonarLint and the auto-loaded rules handle those at the orchestrator level. Never give Haiku subjective judgment, cross-file reasoning, or open-ended synthesis.

When in doubt, Sonnet.
