# Tight Claude Config

Rules, skills, commands, and Claude docs load into every (or every-invocation) context. Write them terse: imperative first, brief why, minimal examples. Every line earns its tokens.

## Why

Global rules auto-load every session; skills load on invocation. Bloat multiplies across thousands of invocations. Verbose prose, redundant tables, repeated explanations, and cross-file duplication are the usual culprits.

## How

- Lead with the imperative. Drop throat-clearing.
- "Why" = 1–2 sentences on the AI-failure mode or specific reason.
- Examples only where they change AI output. Cut examples that restate the directive.
- Exceptions only if non-obvious.
- Cross-reference other rules/skills instead of restating them.
- Target: rules ≤ ~25 lines, skills ≤ ~80 lines unless the skill genuinely needs more.

Applies when writing or editing anything under `~/.claude/rules/`, `~/.claude/skills/`, `~/.claude/commands/`, `.claude/docs/`, `CLAUDE.md`, or project equivalents.
